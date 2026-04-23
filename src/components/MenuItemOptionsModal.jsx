import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaTimes } from 'react-icons/fa';
import { useApp } from '../App';
import { useCart } from '../context/CartContext';
import formatCurrency from '../utils/formatCurrency';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=250&fit=crop';

/**
 * MenuItemOptionsModal
 *
 * Opens when a user clicks "Add to Cart". Fetches the full item detail to get
 * option_groups (if the backend provides them). Renders:
 *   – Required / optional option groups (radio for single-select, checkboxes for multi-select)
 *   – Quantity stepper
 *   – Special instructions textarea
 *   – Running price total
 *
 * On confirm it calls addToCart with an enriched item that includes:
 *   cartEntryId, selectedOptions, extraPrice, specialInstructions, quantity
 *
 * After adding it calls onAfterAdd(enrichedItem) so the parent can show suggestions.
 *
 * option_groups schema (backend):
 * [
 *   {
 *     id: number,
 *     name: string,
 *     required: boolean,
 *     min_selections: number,   // defaults to 1 when required
 *     max_selections: number,   // 1 = radio, >1 = checkboxes
 *     choices: [{ id, name, price_modifier }]
 *   }
 * ]
 */
export default function MenuItemOptionsModal({ show, onHide, item, onAfterAdd, mode = 'add', onSave }) {
  const { API_BASE_URL } = useApp();
  const { addToCart, setShowCartPreview } = useCart();

  const [fullItem, setFullItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  // selections: { [groupId]: [{ id, name, price_modifier, quantity }] }
  const [selections, setSelections] = useState({});
  const [instructions, setInstructions] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  const normalizeSelectionsForGroups = (rawSelections, groups) => {
    if (!rawSelections || typeof rawSelections !== 'object') {
      return {};
    }

    const normalized = {};
    const safeGroups = Array.isArray(groups) ? groups : [];

    // Already keyed by group ids: keep any array values as-is.
    Object.entries(rawSelections).forEach(([groupKey, value]) => {
      if (groupKey === 'extras') return;
      if (Array.isArray(value)) {
        normalized[groupKey] = value;
      }
    });

    // Backend cart shape: selectedOptions.extras -> remap choices to group ids.
    const extras = Array.isArray(rawSelections.extras) ? rawSelections.extras : [];
    if (extras.length === 0 || safeGroups.length === 0) {
      return normalized;
    }

    extras.forEach((extra) => {
      const extraChoiceId = Number(extra?.id);
      if (!Number.isFinite(extraChoiceId)) return;

      const matchingGroup = safeGroups.find((group) =>
        Array.isArray(group?.choices) && group.choices.some((choice) => Number(choice.id) === extraChoiceId)
      );
      if (!matchingGroup) return;

      const matchingChoice = matchingGroup.choices.find((choice) => Number(choice.id) === extraChoiceId);
      const groupKey = String(matchingGroup.id);
      if (!normalized[groupKey]) normalized[groupKey] = [];
      normalized[groupKey].push({
        id: matchingChoice.id,
        name: extra?.name || matchingChoice.name,
        price_modifier: extra?.price_modifier ?? matchingChoice.price_modifier ?? 0,
        quantity: Math.max(1, parseInt(extra?.quantity, 10) || 1),
      });
    });

    return normalized;
  };

  // Fetch full item each time the modal opens
  useEffect(() => {
    if (!show || !item) return;

    let mounted = true;
    setQuantity(Math.max(1, parseInt(item.quantity, 10) || 1));
    setInstructions(item.specialInstructions || '');
    setImageFailed(false);
    setSelections({});

    const identifier = item.slug || item.id;
    if (!identifier) {
      const fallbackGroups = Array.isArray(item?.option_groups) ? item.option_groups : [];
      if (mounted) {
        setFullItem(item);
        setSelections(normalizeSelectionsForGroups(item.selectedOptions, fallbackGroups));
      }
      return;
    }

    setFullItem(null);
    setDetailLoading(true);
    axios
      .get(`${API_BASE_URL}/menu-items/${identifier}/`)
      .then((res) => {
        if (!mounted) return;
        const fetched = res.data || item;
        const fetchedGroups = Array.isArray(fetched?.option_groups) ? fetched.option_groups : [];
        setFullItem(fetched);
        setSelections(normalizeSelectionsForGroups(item.selectedOptions, fetchedGroups));
      })
      .catch(() => {
        if (!mounted) return;
        const fallbackGroups = Array.isArray(item?.option_groups) ? item.option_groups : [];
        setFullItem(item);
        setSelections(normalizeSelectionsForGroups(item.selectedOptions, fallbackGroups));
      })
      .finally(() => {
        if (mounted) setDetailLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [show, item, API_BASE_URL]);

  const displayItem = fullItem || item;

  const optionGroups = useMemo(() => {
    const groups = fullItem?.option_groups ?? [];
    return Array.isArray(groups) ? groups : [];
  }, [fullItem]);

  const extraPrice = useMemo(
    () =>
      Object.values(selections)
        .flat()
        .reduce(
          (sum, choice) =>
            sum + parseFloat(choice.price_modifier || 0) * (parseInt(choice.quantity, 10) || 1),
          0
        ),
    [selections]
  );

  const basePrice = parseFloat(displayItem?.price || 0);
  const unitPrice = basePrice + extraPrice;
  const totalPrice = unitPrice * quantity;

  const getGroupSelectionCount = (groupId) =>
    (selections[groupId] || []).reduce(
      (sum, choice) => sum + (parseInt(choice.quantity, 10) || 1),
      0
    );

  const isValid = useMemo(
    () =>
      optionGroups.every((group) => {
        if (!group.required) return true;
        const minRequired = group.min_selections ?? 1;
        return getGroupSelectionCount(group.id) >= minRequired;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionGroups, selections]
  );

  /* ── selection handlers ── */
  const handleRadioChange = (group, choice) => {
    setSelections((prev) => ({
      ...prev,
      [group.id]: [
        {
          id: choice.id,
          name: choice.name,
          price_modifier: choice.price_modifier ?? 0,
          quantity: 1,
        },
      ],
    }));
  };

  const handleCheckboxChange = (group, choice, checked) => {
    setSelections((prev) => {
      const current = prev[group.id] || [];
      const max = group.max_selections ?? 99;
      if (checked) {
        if (getGroupSelectionCount(group.id) >= max) return prev;
        return {
          ...prev,
          [group.id]: [
            ...current,
            {
              id: choice.id,
              name: choice.name,
              price_modifier: choice.price_modifier ?? 0,
              quantity: 1,
            },
          ],
        };
      }
      return {
        ...prev,
        [group.id]: current.filter((c) => c.id !== choice.id),
      };
    });
  };

  const handleChoiceQuantityChange = (group, choiceId, nextQuantity) => {
    setSelections((prev) => {
      const current = prev[group.id] || [];
      const max = group.max_selections ?? 99;
      const totalExcludingCurrent = current.reduce((sum, choice) => {
        if (choice.id === choiceId) return sum;
        return sum + (parseInt(choice.quantity, 10) || 1);
      }, 0);

      const maxForCurrentChoice = Math.max(1, max - totalExcludingCurrent);
      const safeQuantity = Math.max(1, Math.min(maxForCurrentChoice, parseInt(nextQuantity, 10) || 1));

      return {
        ...prev,
        [group.id]: current.map((choice) =>
          choice.id === choiceId
            ? { ...choice, quantity: safeQuantity }
            : choice
        ),
      };
    });
  };

  const isChoiceSelected = (groupId, choiceId) =>
    (selections[groupId] || []).some((c) => c.id === choiceId);

  const handleConfirm = () => {
    const optionsKey = JSON.stringify(selections);
    const cartEntryId =
      Object.keys(selections).length > 0
        ? `${displayItem.id}_${btoa(unescape(encodeURIComponent(optionsKey))).slice(0, 24)}`
        : String(displayItem.id);

    const enrichedItem = {
      ...item,
      ...displayItem,
      cartEntryId,
      quantity,
      selectedOptions: Object.keys(selections).length > 0 ? selections : undefined,
      extraPrice: extraPrice > 0 ? extraPrice : undefined,
      specialInstructions: instructions.trim() || undefined,
    };

    if (mode === 'edit' && onSave) {
      onSave(enrichedItem);
    } else {
      addToCart(enrichedItem);
    }
    setShowCartPreview(false);
    onHide();
    if (mode !== 'edit' && onAfterAdd) onAfterAdd(enrichedItem);
  };

  if (!show) return null;

  const itemImage = displayItem?.image;

  return (
    <div
      className="menu-item-options-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onHide(); }}
    >
      <div
        className="menu-item-options-modal bg-white br0-25 shadow-4"
      >
        {/* Header */}
        <header className="menu-item-options-modal__header flex justify-between items-center pa1-00 bg-brown0 gold0">
          <h5 className="mb0-00 gold0 f1-25">{displayItem?.name || 'Customise Item'}</h5>
          <button
            type="button"
            className="menu-item-options-modal__close ba pa0-25 br0-25 bg-transparent gold0 b--gold0 pointer"
            onClick={onHide}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </header>

        {detailLoading ? (
          <div className="pa2-00 tc brown0">
            <p className="f0-85">Loading item details…</p>
          </div>
        ) : (
          <>
            <div className="menu-item-options-modal__body pa1-00 brown0">

              {/* Item preview strip */}
              <div className="menu-item-options-modal__hero flex ggap1-00 mb1-50 items-start">
                <img
                  src={imageFailed || !itemImage ? FALLBACK_IMAGE : itemImage}
                  alt={displayItem?.name}
                  className="menu-item-options-modal__image br0-25 cover"
                  onError={() => setImageFailed(true)}
                />
                <div className="menu-item-options-modal__hero-copy">
                  {displayItem?.description && (
                    <p className="menu-item-options-modal__description f0-85 mb0-25 brown0">
                      {displayItem.description}
                    </p>
                  )}
                  <div className="menu-item-options-modal__meta flex items-center flex-wrap ggap0-50">
                    <span className="menu-item-options-modal__price b gold1">{formatCurrency(basePrice)}</span>
                  {displayItem?.restaurant_name && (
                    <span className="menu-item-options-modal__restaurant f0-85 brown0">{displayItem.restaurant_name}</span>
                  )}
                  </div>
                </div>
              </div>

              {/* Option groups */}
              {optionGroups.length > 0 ? (
                optionGroups.map((group) => {
                  const isRadio = group.max_selections === 1;
                  const max = group.max_selections ?? 99;
                  const chosen = selections[group.id] || [];
                  const selectedCount = getGroupSelectionCount(group.id);
                  const minRequired = group.min_selections ?? 1;
                  const isGroupValid = !group.required || selectedCount >= minRequired;

                  return (
                    <section key={group.id} className="menu-item-options-modal__section mb1-50">
                      <div className="menu-item-options-modal__section-header flex justify-between items-center mb0-50">
                        <h6 className={`mb0-00 b f1-00${!isGroupValid ? ' red' : ''}`}>
                          {group.name}{!isGroupValid && <span style={{ fontSize: '0.8em' }}> *</span>}
                        </h6>
                        <div className="menu-item-options-modal__badges flex ggap0-25 items-center">
                          {group.required ? (
                            <span className="ba pa0-25 br0-25 bg-brown0 gold0 b--brown0 f0-75">Required</span>
                          ) : (
                            <span className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 f0-75">Optional</span>
                          )}
                          {!isRadio && max < 99 && (
                            <span className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 f0-75">Up to {max}</span>
                          )}
                          {!isRadio && max < 99 && (
                            <span className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 f0-75">{selectedCount}/{max}</span>
                          )}
                        </div>
                      </div>

                      <div className="menu-item-options-modal__choices flex flex-column ggap0-25">
                        {(group.choices || []).map((choice) => {
                          const addon = parseFloat(choice.price_modifier || 0);
                          const checked = isChoiceSelected(group.id, choice.id);
                          const selectedChoice = checked ? chosen.find((c) => c.id === choice.id) : null;
                          const selectedChoiceQty = parseInt(selectedChoice?.quantity, 10) || 1;
                          const remainingWithoutCurrent = max - (selectedCount - (checked ? selectedChoiceQty : 0));
                          const maxForChoice = Math.max(1, remainingWithoutCurrent);
                          const atLimit = !isRadio && !checked && selectedCount >= max;

                          return (
                            <label
                              key={choice.id}
                              className={`menu-item-options-modal__choice flex justify-between items-center pa0-50 br0-25 ba pointer${checked ? ' bg-brown0 gold0 b--brown0 is-selected' : ' bg-white brown0 b--brown0'}${atLimit ? ' is-disabled' : ''}`}
                              style={{ cursor: atLimit ? 'not-allowed' : 'pointer', opacity: atLimit ? 0.5 : 1 }}
                            >
                              <div className="flex items-center ggap0-50">
                                <input
                                  type={isRadio ? 'radio' : 'checkbox'}
                                  name={`group-${group.id}`}
                                  checked={checked}
                                  disabled={atLimit}
                                  onChange={(e) => {
                                    if (isRadio) handleRadioChange(group, choice);
                                    else handleCheckboxChange(group, choice, e.target.checked);
                                  }}
                                />
                                <span>{choice.name}</span>
                              </div>
                              <div className="flex items-center ggap0-50">
                                {!isRadio && checked && (
                                  <div
                                    className="menu-item-options-modal__inline-stepper flex items-center ggap0-25"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      className="menu-item-options-modal__stepper-btn ba pa0-25 br0-25 bg-transparent gold0 b--gold0 pointer"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleChoiceQuantityChange(group, choice.id, selectedChoiceQty - 1); }}
                                      disabled={selectedChoiceQty <= 1}
                                    >−</button>
                                    <input
                                      type="number"
                                      className="menu-item-options-modal__stepper-input tc ba br0-25 b--gold0 gold0 bg-transparent"
                                      value={selectedChoiceQty}
                                      min={1}
                                      max={maxForChoice}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => { e.stopPropagation(); handleChoiceQuantityChange(group, choice.id, e.target.value); }}
                                    />
                                    <button
                                      type="button"
                                      className="menu-item-options-modal__stepper-btn ba pa0-25 br0-25 bg-transparent gold0 b--gold0 pointer"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleChoiceQuantityChange(group, choice.id, selectedChoiceQty + 1); }}
                                      disabled={selectedChoiceQty >= maxForChoice}
                                    >+</button>
                                  </div>
                                )}
                                <span className={`f0-85${checked ? ' gold0' : ' brown0'}`}>
                                  {addon > 0
                                    ? `+${formatCurrency(addon)}${!isRadio && checked ? ` × ${selectedChoiceQty}` : ''}`
                                    : 'Included'}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                })
              ) : (
                <div className="menu-item-options-modal__empty-state ba br0-25 pa0-75 mb1-50 bg-gold5 brown0 f0-85">
                  This item has no customisable options. Adjust quantity or add a special request below.
                </div>
              )}

              {/* Quantity */}
              <section className="menu-item-options-modal__section mb1-00">
                <label className="b mb0-50 db brown0">Quantity</label>
                <div className="menu-item-options-modal__quantity-panel">
                  <div className="menu-item-options-modal__quantity-stepper flex items-center ggap0-25">
                  <button
                    type="button"
                    className="menu-item-options-modal__stepper-btn ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    style={quantity <= 1 ? { opacity: 0.4 } : undefined}
                  >−</button>
                  <input
                    type="number"
                    className="menu-item-options-modal__stepper-input tc ba br0-25 b--brown0 brown0"
                    value={quantity}
                    min={1}
                    max={99}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setQuantity(isNaN(v) ? 1 : Math.max(1, Math.min(99, v)));
                    }}
                  />
                  <button
                    type="button"
                    className="menu-item-options-modal__stepper-btn ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  >+</button>
                  </div>
                  <p className="menu-item-options-modal__quantity-hint f0-75 brown0 mv0-00">
                    Adjust how many portions to add before checkout.
                  </p>
                </div>
              </section>

              {/* Special instructions */}
              <section className="menu-item-options-modal__section mb0-50">
                <label className="b mb0-25 db brown0">
                  Special Instructions <span className="normal f0-85">(optional)</span>
                </label>
                <textarea
                  className="menu-item-options-modal__notes w-100 ba br0-25 b--brown0 brown0 pa0-50"
                  rows={2}
                  placeholder="Allergies or special requests? e.g. no onions, extra spicy…"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  maxLength={200}
                />
                <div className="menu-item-options-modal__notes-meta f0-75 brown0 tr mt0-25">{instructions.length}/200</div>
              </section>

            </div>

            {/* Footer */}
            <footer className="menu-item-options-modal__footer flex justify-between items-center pa1-00 bt">
              <div className="menu-item-options-modal__total brown0">
                <div className="f0-75 mb0-25">Total for this item</div>
                <div className="b gold1 f1-25">{formatCurrency(totalPrice)}</div>
                {extraPrice > 0 && (
                  <div className="f0-75 brown0">
                    {formatCurrency(basePrice)} + {formatCurrency(extraPrice)} extras
                  </div>
                )}
              </div>
              <div className="menu-item-options-modal__actions flex ggap0-50">
                <button
                  type="button"
                  className="ba pa0-50 br0-25 bg-transparent brown0 b--brown0 pointer"
                  onClick={onHide}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ba pa0-50 br0-25 bg-brown0 gold0 b--brown0 pointer b"
                  onClick={handleConfirm}
                  disabled={!isValid}
                  title={!isValid ? 'Please complete all required selections before adding to cart' : ''}
                  style={!isValid ? { opacity: 0.5 } : undefined}
                >
                  {mode === 'edit' ? 'Save Changes' : `Add ${quantity} to Cart`}
                </button>
              </div>
            </footer>
          </>
        )}

      </div>
    </div>
  );
}
