import { useEffect, useState } from 'react';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import formatCurrency from '../../utils/formatCurrency';
import MenuItemOptionsModal from '../../components/MenuItemOptionsModal';
import { useApp } from '../../App';
import { FaEdit, FaTrash, FaShoppingCart, FaTimes } from 'react-icons/fa';
const CartPage = () => {
    const { cart, removeFromCart, updateCartQuantity, updateCartItemDetails, getCartTotal } = useCart();
    const { user, showToast } = useApp();
  const navigate = useNavigate();
    const [editingItem, setEditingItem] = useState(null);
        const [showOrderSummary, setShowOrderSummary] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({
        open: false,
        mode: null,
        cartEntryId: null,
        itemName: '',
    });
    const [restaurantMetaLookup, setRestaurantMetaLookup] = useState({});
    const [restaurantLookupLoading, setRestaurantLookupLoading] = useState(false);
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api';
    const backendOrigin = (process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '');

    const getRestaurantLookupKeys = (item) => {
        const keys = [];
        const rawRestaurant = item?.restaurant;
        const restaurantIdFromPath =
            typeof rawRestaurant === 'string'
                ? (() => {
                    const match = rawRestaurant.match(/\/restaurants\/(\d+)\/?$/i);
                    return match?.[1] ? match[1] : null;
                })()
                : null;
        const restaurantId = item?.restaurant_id ?? item?.restaurant?.id ?? restaurantIdFromPath ?? null;
        const restaurantName =
            item?.restaurant_name
            ?? item?.restaurant?.name
            ?? (typeof rawRestaurant === 'string' && !/^\/?api\//i.test(rawRestaurant) && !/^https?:\/\//i.test(rawRestaurant)
                ? rawRestaurant
                : null);
        const restaurantSlug = item?.restaurant_slug ?? item?.restaurant?.slug ?? null;

        if (restaurantId !== null && restaurantId !== undefined) {
            keys.push(`id:${String(restaurantId)}`);
        }

        if (restaurantName) {
            keys.push(`name:${String(restaurantName).trim().toLowerCase()}`);
        }

        if (restaurantSlug) {
            keys.push(`slug:${String(restaurantSlug).trim().toLowerCase()}`);
        }

        return keys;
    };

    const resolveCartImage = (src) => {
        if (!src || typeof src !== 'string') {
            return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop';
        }

        const isAbsolute = /^(https?:)?\/\//i.test(src) || src.startsWith('data:') || src.startsWith('blob:');
        return isAbsolute ? src : `${backendOrigin}${src.startsWith('/') ? src : `/${src}`}`;
    };

    const buildEnumeratedOptions = (selectedOptions) => {
        if (!selectedOptions || typeof selectedOptions !== 'object') {
            return [];
        }

        return Object.values(selectedOptions)
            .flat()
            .map((choice) => {
                const qty = parseInt(choice.quantity, 10) || 1;
                const unitAddon = parseFloat(choice.price_modifier || 0);
                const lineAddon = unitAddon * qty;
                return {
                    label: qty > 1 ? `${choice.name} x${qty}` : choice.name,
                    priceText: unitAddon > 0 ? formatCurrency(lineAddon) : null,
                };
            });
    };

    const toNumber = (value) => {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : null;
        }

        if (typeof value === 'string') {
            const cleaned = value.replace(/,/g, '').trim();
            const match = cleaned.match(/-?\d+(\.\d+)?/);
            if (!match) {
                return null;
            }
            const parsed = parseFloat(match[0]);
            return Number.isFinite(parsed) ? parsed : null;
        }

        return null;
    };

    const getRestaurantLookupMeta = (item) => {
        const matchKey = getRestaurantLookupKeys(item)
            .find((key) => restaurantMetaLookup[key] !== undefined);

        return matchKey ? restaurantMetaLookup[matchKey] : null;
    };

    useEffect(() => {
        const unresolvedItems = cart.filter((item) => {
            const localFee = toNumber(item?.restaurant_delivery_fee);
            const localMinOrder = toNumber(item?.restaurant_min_order ?? item?.min_order);
            if (localFee !== null && localMinOrder !== null) return false;

            const lookupKeys = getRestaurantLookupKeys(item);
            if (lookupKeys.length === 0) return false;

            return !lookupKeys.some((key) => restaurantMetaLookup[key] !== undefined);
        });

        if (unresolvedItems.length === 0) {
            return;
        }

        let mounted = true;

        const loadRestaurantMetadata = async () => {
            setRestaurantLookupLoading(true);
            try {
                let nextUrl = `${API_BASE_URL}/restaurants/`;
                const nextLookup = {};

                while (nextUrl) {
                    const response = await axios.get(nextUrl);
                    const payload = response?.data;
                    const restaurants = Array.isArray(payload) ? payload : (payload?.results || []);

                    restaurants.forEach((restaurant) => {
                        const fee = toNumber(restaurant?.delivery_fee ?? restaurant?.restaurant_delivery_fee);
                        const minOrder = toNumber(restaurant?.min_order ?? restaurant?.restaurant_min_order);
                        const metadata = {
                            deliveryFee: fee === null ? null : Math.max(0, fee),
                            minOrder: minOrder === null ? null : Math.max(0, minOrder),
                            label: restaurant?.name || 'Restaurant',
                        };

                        if (restaurant?.id !== null && restaurant?.id !== undefined) {
                            nextLookup[`id:${String(restaurant.id)}`] = metadata;
                        }

                        if (restaurant?.name) {
                            nextLookup[`name:${String(restaurant.name).trim().toLowerCase()}`] = metadata;
                        }

                        if (restaurant?.slug) {
                            nextLookup[`slug:${String(restaurant.slug).trim().toLowerCase()}`] = metadata;
                        }
                    });

                    nextUrl = Array.isArray(payload) ? null : (payload?.next || null);
                }

                if (!mounted || Object.keys(nextLookup).length === 0) return;
                setRestaurantMetaLookup((prev) => ({ ...prev, ...nextLookup }));
            } catch {
                // Keep existing behavior when restaurant lookup fails.
            } finally {
                if (mounted) {
                    setRestaurantLookupLoading(false);
                }
            }
        };

        loadRestaurantMetadata();

        return () => {
            mounted = false;
        };
    }, [cart, restaurantMetaLookup, API_BASE_URL]);

    const restaurantOrderBreakdown = Object.values(
        cart.reduce((acc, item) => {
            const restaurantKey = String(
                item.restaurant_id
                || item.restaurant?.id
                || item.restaurant_name
                || item.restaurant?.name
                || item.restaurant
                || item.id
            );

            if (!acc[restaurantKey]) {
                const lookupMeta = getRestaurantLookupMeta(item);
                acc[restaurantKey] = {
                    key: restaurantKey,
                    label: item.restaurant_name || item.restaurant?.name || lookupMeta?.label || 'Restaurant',
                    subtotal: 0,
                    minOrder: null,
                };
            }

            const lookupMeta = getRestaurantLookupMeta(item);
            const directMinOrder = toNumber(item.restaurant_min_order ?? item.min_order);
            const minOrder = directMinOrder !== null ? directMinOrder : toNumber(lookupMeta?.minOrder);
            if (minOrder !== null) {
                acc[restaurantKey].minOrder = Math.max(0, minOrder);
            }

            const unitPrice = parseFloat(item.price) + parseFloat(item.extraPrice || 0);
            acc[restaurantKey].subtotal += unitPrice * item.quantity;

            return acc;
        }, {})
    );

    const deliveryBreakdown = Object.values(
        cart.reduce((acc, item) => {
            const restaurantKey = String(
                item.restaurant_id
                || item.restaurant?.id
                || item.restaurant_name
                || item.restaurant?.name
                || item.restaurant
                || item.id
            );

            if (!acc[restaurantKey]) {
                acc[restaurantKey] = {
                    key: restaurantKey,
                    label: item.restaurant_name || item.restaurant?.name || 'Restaurant',
                    fee: null,
                };
            }

            const directFee = toNumber(item.restaurant_delivery_fee);
            const lookupMeta = getRestaurantLookupMeta(item);
            const fee = directFee !== null ? directFee : toNumber(lookupMeta?.deliveryFee);

            if (fee !== null) {
                acc[restaurantKey].fee = Math.max(0, fee);
            }

            return acc;
        }, {})
    );

    const knownDeliveryBreakdown = deliveryBreakdown.filter((entry) => entry.fee !== null);
    const unknownDeliveryCount = deliveryBreakdown.length - knownDeliveryBreakdown.length;
    const derivedDeliveryFee = knownDeliveryBreakdown.reduce((sum, entry) => sum + entry.fee, 0);
    const configuredDeliveryEstimate = toNumber(process.env.REACT_APP_DEFAULT_DELIVERY_FEE);
    const hasConfiguredDeliveryEstimate = configuredDeliveryEstimate !== null;
    const fallbackDeliveryFee = hasConfiguredDeliveryEstimate ? Math.max(0, configuredDeliveryEstimate) : 0;
    const isDeliveryEstimated = knownDeliveryBreakdown.length === 0 && hasConfiguredDeliveryEstimate;
    const isDeliveryPending = knownDeliveryBreakdown.length === 0 && !hasConfiguredDeliveryEstimate;
    const deliveryFee = knownDeliveryBreakdown.length > 0 ? derivedDeliveryFee : fallbackDeliveryFee;
    const deliveryLabel = isDeliveryEstimated ? 'Estimated Delivery' : 'Delivery';
    const knownMinOrderBreakdown = restaurantOrderBreakdown.filter((entry) => entry.minOrder !== null);
    const unknownMinOrderCount = restaurantOrderBreakdown.length - knownMinOrderBreakdown.length;
    const unmetMinOrders = restaurantOrderBreakdown
        .filter((entry) => entry.minOrder !== null && entry.subtotal < entry.minOrder)
        .map((entry) => ({
            ...entry,
            remaining: entry.minOrder - entry.subtotal,
        }));
    const highestMinimumOrder = knownMinOrderBreakdown.reduce(
        (currentMax, entry) => Math.max(currentMax, entry.minOrder),
        0
    );
    const minimumOrderLabel = restaurantOrderBreakdown.length > 1 ? 'Minimum Orders' : 'Minimum Order';
    const minimumOrderValueText = knownMinOrderBreakdown.length > 0
        ? (restaurantOrderBreakdown.length > 1
            ? formatCurrency(highestMinimumOrder)
            : formatCurrency(knownMinOrderBreakdown[0].minOrder))
        : (restaurantLookupLoading ? 'Fetching minimum order...' : 'Not configured');

  const subtotal = getCartTotal();
        const VAT_RATE = 0.15;
        const NHIL_RATE = 0.025;
        const GETFUND_RATE = 0.025;
        const totalTaxRate = VAT_RATE + NHIL_RATE + GETFUND_RATE;

        const vatAmount = subtotal * VAT_RATE;
        const nhilAmount = subtotal * NHIL_RATE;
        const getfundAmount = subtotal * GETFUND_RATE;
    const tax = vatAmount + nhilAmount + getfundAmount;
  const total = subtotal + deliveryFee + tax;

  const openClearCartDialog = () => {
        setDeleteDialog({ open: true, mode: 'clear', cartEntryId: null, itemName: '' });
  };

    const openRemoveItemDialog = (cartEntryId, itemName) => {
        setDeleteDialog({
            open: true,
            mode: 'item',
            cartEntryId,
            itemName: itemName || 'this item',
        });
    };

    const closeDeleteDialog = () => {
        setDeleteDialog({ open: false, mode: null, cartEntryId: null, itemName: '' });
    };

    const confirmDeleteDialog = () => {
        if (deleteDialog.mode === 'clear') {
            cart.forEach((i) => removeFromCart(i.cartEntryId || String(i.id)));
        }
        if (deleteDialog.mode === 'item' && deleteDialog.cartEntryId) {
            removeFromCart(deleteDialog.cartEntryId);
        }
        closeDeleteDialog();
    };

    const handleProceedToCheckout = () => {
        if (!user) {
            setShowOrderSummary(false);
            showToast('Please log in to continue to checkout.', 'info');
            navigate('/login');
            return;
        }

        navigate('/checkout');
    };

  if (cart.length === 0) {
    return (
      <div className="container container90 pv4-00 tc">
        <div style={{ fontSize: '3rem' }}><FaShoppingCart /></div>
        <h1 className="f1-75 brown0 mb1-00">Your Cart</h1>
        <p className="brown0 mb2-00">No items yet. Discover something tasty.</p>
        <div className="flex justify-center ggap1-00">
          <Link to="/restaurants" className="ba pa0-50 br0-25 bg-brown0 gold0 b--brown0 no-underline b">Browse Restaurants</Link>
          <Link to="/menu" className="ba pa0-50 br0-25 bg-transparent brown0 b--brown0 no-underline b">View Menu</Link>
        </div>
      </div>
    );
  }

    return (
        <>
        <div className="container container90 grid gtc12 ggap1-00 pb2-00">
            {/* ── Page header ── */}
            <header className="gc1s12 gr1s1 flex justify-between items-center mv2-00">
                <h1 className="f1-75 brown0 mv0-00 flex items-center ggap0-50">
                    <FaShoppingCart /> Your Cart
                </h1>
                
            </header>

            <main className="gc1s12 gc1s8-m" 
                aria-label="Cart items and order summary"
            >
                {/* ── Min-order warnings ── */}
                {unmetMinOrders.length > 0 && (
                    <div className="gc1s12 gc1s8-m ba br0-25 pa1-00 mb2-00 bg-gold5 brown0 shadow-4" role="alert">
                        <div className="b mb0-50">Minimum order must be met.</div>
                        {unmetMinOrders.map((entry) => (
                            <div key={`${entry.key}-cart-warning`} className="f0-85 mb0-25">
                                {entry.label}: add {formatCurrency(entry.remaining)} more to reach {formatCurrency(entry.minOrder)}.
                            </div>
                        ))}
                    </div>
                )}
                {unmetMinOrders.length === 0 && knownMinOrderBreakdown.length > 0 && (
                    <div className="gc1s12 gc1s8-m ba br0-25 pa0-75 mb2-00 bg-gold5 brown0 shadow-4" role="status">
                        <div className="f0-85">Restaurant minimum orders have been met.</div>
                    </div>
                )}
                {unknownMinOrderCount > 0 && (
                    <div className="gc1s12 gc1s8-m f0-85 brown0 mb2-00">
                        {unknownMinOrderCount} restaurant{unknownMinOrderCount !== 1 ? 's have' : ' has'} no minimum order configured yet.
                    </div>
                )}

                {/* ── Cart items ── */}
                <div className="gc1s12 gc1s8-m flex  flex-column ggap1-00">
                    {cart.map((item) => {
                        const unitPrice = parseFloat(item.price) + parseFloat(item.extraPrice || 0);
                        const lineTotal = unitPrice * item.quantity;
                        const cartKey = item.cartEntryId || String(item.id);
                        const optionSummary = buildEnumeratedOptions(item.selectedOptions);
                        return (
                            <div
                                key={cartKey}
                                className="flex flex-column min-w-0 br0-50 shadow-4 bg-white"
                                aria-label={`Cart item ${item.name}, quantity ${item.quantity}, total ${formatCurrency(lineTotal)}`}
                            >
                                <div className="flex flex-column flex-row-s ggap0-50">
                                    {/* Image + restaurant badge */}
                                <figure className="w-40-s grid gtc mb0-00">
                                    <img
                                        src={resolveCartImage(item.image)}
                                        alt={item.name}
                                        className="gc1s6 gr1s6 h12-00 cover"
                                    />
                                    <figcaption className="ba pa0-25 bg-brown0 br0-25 gc6s1 gr1s1 ma1-00 b gold0 tr">
                                        {item.restaurant_name || ''}
                                    </figcaption>
                                </figure>

                                <div className="flex flex-column justify-between w-60-s ph0-50 bg-white brown0">
                                    {/* Name */}
                                    <div className="flex flex-column justify-between mb0-50">
                                        <h5 className="f1-25 b mb0-50">{item.name}</h5>
                                        <p className="mb0-00">{item.description}</p>
                                    </div>

                                    {/* Price info panel */}
                                    <div className="flex justify-between items-center shadow-4 pa0-75 bg-gold5 br0-25">
                                        <div>
                                            <div className="f0-75 mb0-25">Unit Price</div>
                                            <span className="gold1 b">{formatCurrency(item.price)}</span>
                                        </div>
                                        {optionSummary.length > 0 && (
                                            <div className="tr">
                                                <div className="f0-75 mb0-25">Add-ons</div>
                                                <span className="gold1 b">{formatCurrency(item.extraPrice || 0)}</span>
                                            </div>
                                        )}
                                        <div className="tr">
                                            <div className="f0-75 mb0-25">Line Total</div>
                                            <span className="gold1 b">{formatCurrency(lineTotal)}</span>
                                        </div>
                                    </div>

                                    {/* Options */}
                                    {optionSummary.length > 0 && (
                                        <div className="f0-85 mb1-00">
                                            <div className="b mb0-25">Selected options</div>
                                            <ol className="pl0-00 bb bt pv0-25">
                                                {optionSummary.map((option, idx) => (
                                                    <li key={`${cartKey}-option-${idx}`} className="flex justify-between black-60">
                                                        <div>{option.label}</div>
                                                        {option.priceText && <span className="b">{option.priceText}</span>}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}

                                    
                                    
                                </div>
                                </div>
                                
                                <footer className="pa0-50 bg-white brown0">
                                        {item.specialInstructions && (
                                            <div className="f0-85 i tl mv0-50">📝 {item.specialInstructions}</div>
                                        )}

                                        {/* Quantity + actions */}
                                        <div className="flex items-center justify-between mt1-00 ggap0-50">
                                            <div className="flex items-center ggap0-25">
                                                <button
                                                    className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer"
                                                    onClick={() => updateCartQuantity(cartKey, item.quantity - 1)}
                                                    disabled={item.quantity <= 1}
                                                    aria-label={`Decrease quantity of ${item.name}`}
                                                    data-testid={`cart-decrease-${item.id}`}
                                                    style={item.quantity <= 1 ? { opacity: 0.4 } : undefined}
                                                >−</button>
                                                <input
                                                    type="number"
                                                    className="tc ba br0-25 b--brown0 brown0"
                                                    style={{ width: '48px', padding: '0.25rem' }}
                                                    value={item.quantity}
                                                    min={1}
                                                    max={99}
                                                    onChange={(e) => {
                                                        const parsed = parseInt(e.target.value, 10);
                                                        const next = Math.max(1, Math.min(99, isNaN(parsed) ? 1 : parsed));
                                                        updateCartQuantity(cartKey, next);
                                                    }}
                                                    onBlur={(e) => {
                                                        const parsed = parseInt(e.target.value, 10);
                                                        const next = Math.max(1, Math.min(99, isNaN(parsed) ? 1 : parsed));
                                                        if (next !== item.quantity) updateCartQuantity(cartKey, next);
                                                    }}
                                                    aria-label={`Quantity of ${item.name}`}
                                                />
                                                <button
                                                    className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer"
                                                    onClick={() => updateCartQuantity(cartKey, item.quantity + 1)}
                                                    aria-label={`Increase quantity of ${item.name}`}
                                                    data-testid={`cart-increase-${item.id}`}
                                                >+</button>
                                            </div>
                                            <div className="flex ggap0-50">
                                                <button
                                                    className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer"
                                                    onClick={() => setEditingItem(item)}
                                                    aria-label={`Edit details for ${item.name}`}
                                                >
                                                    <FaEdit className="mr0-25" /> Edit
                                                </button>
                                                <button
                                                    className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer"
                                                    onClick={() => openRemoveItemDialog(cartKey, item.name)}
                                                    aria-label={`Remove ${item.name} from cart`}
                                                    data-testid={`cart-remove-${item.id}`}
                                                >
                                                    <FaTrash className="mr0-25" /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    </footer>{/* Special instructions */}
                            </div>
                        );
                    })}
                </div>

                {/* ── Proceed button (inline, beneath items) ── */}
                <div className="gc1s8 flex ggap1-00 mt2-00">
                    <button
                        className="flex-grow-1 tc pa0-50 br0-25 ba b b--brown0 bg-brown0 gold0 pointer"
                        onClick={handleProceedToCheckout}
                        disabled={cart.length === 0 || unmetMinOrders.length > 0}
                        aria-label="Proceed to checkout"
                        data-testid="cart-checkout-btn"
                    >
                        {user ? 'Proceed to Checkout' : 'Login to Checkout'}
                    </button>
                    <Link
                        to="/restaurants"
                        className="flex-grow-1 tc pa0-50 br0-25 ba b--brown0 bg-transparent brown0 no-underline b"
                        data-testid="cart-continue-btn"
                    >
                        Continue Shopping
                    </Link>
                </div>
            </main>
            <aside className="gc9s4-m gc1s12 gr2s1 ">
                <div className="flex flex-column items-center ggap0-50
                ">
                    <button
                        type="button"
                        className="w-100 ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer"
                        onClick={() => setShowOrderSummary(true)}
                    >
                        Order Summary
                    </button>
                    <span
                        className="w-100 ba pa0-25 tc br0-25 bg-brown0 gold0 b--brown0"
                        aria-label={`Cart has ${cart.length} item${cart.length !== 1 ? 's' : ''}`}
                    >
                        {cart.length} item{cart.length !== 1 ? 's' : ''}
                    </span>
                    <button
                        className="w-100 ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer"
                        onClick={openClearCartDialog}
                        aria-label="Clear all items from cart"
                        data-testid="cart-clear-btn"
                    >
                        <FaTrash className="mr0-25" /> Clear
                    </button>
                </div>
            </aside>            
        </div>

        {/* ── Edit item modal ── */}
        <MenuItemOptionsModal
            show={Boolean(editingItem)}
            onHide={() => setEditingItem(null)}
            item={editingItem}
            mode="edit"
            onSave={(updatedItem) => {
                const originalCartEntryId = editingItem?.cartEntryId || String(editingItem?.id);
                updateCartItemDetails(originalCartEntryId, updatedItem);
                setEditingItem(null);
            }}
        />

        {/* ── Order Summary modal ── */}
        {showOrderSummary && (
            <div
                className="fixed top-0 left-0 w-100 h-100 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.55)', zIndex: 1050 }}
                onClick={(e) => { if (e.target === e.currentTarget) setShowOrderSummary(false); }}
            >
                <div className="bg-white br0-25 shadow-4" style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <header className="flex justify-between items-center pa1-00 bg-brown0 gold0 br0-25" style={{ borderRadius: '0.25rem 0.25rem 0 0' }}>
                        <h5 className="mb0-00 gold0">Order Summary</h5>
                        <button
                            type="button"
                            className="ba pa0-25 br0-25 bg-transparent gold0 b--gold0 pointer"
                            onClick={() => setShowOrderSummary(false)}
                            aria-label="Close"
                        ><FaTimes /></button>
                    </header>
                    <main className="pa1-00 brown0">
                        {/* Items list */}
                        <ul className="list-unstyled mb2-00 f0-85">
                            {cart.map((item, index) => (
                                <li key={item.cartEntryId || item.id} className="flex justify-between mb0-50">
                                    <span>{index + 1}. {item.name} × {item.quantity}</span>
                                    <span className="b">{formatCurrency((parseFloat(item.price) + parseFloat(item.extraPrice || 0)) * item.quantity)}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="bb mb1-00" />

                        {/* Subtotal */}
                        <div className="flex justify-between mb0-50 b">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>

                        {/* Min order */}
                        <div className="flex justify-between mb0-50">
                            <span>{minimumOrderLabel}</span>
                            <span>{minimumOrderValueText}</span>
                        </div>
                        {knownMinOrderBreakdown.length > 0 && (
                            <div className="f0-75 black-60 mb1-00">
                                {knownMinOrderBreakdown.map((entry) => (
                                    <div key={`${entry.key}-minimum`} className="flex justify-between mb0-25">
                                        <span>{entry.label}</span>
                                        <span>{formatCurrency(entry.subtotal)} / {formatCurrency(entry.minOrder)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {unmetMinOrders.length > 0 && (
                            <div className="ba br0-25 pa0-50 bg-gold5 mb1-00 f0-85">
                                {unmetMinOrders.map((entry) => (
                                    <div key={`${entry.key}-remaining`}>{entry.label} needs {formatCurrency(entry.remaining)} more.</div>
                                ))}
                            </div>
                        )}
                        {unknownMinOrderCount > 0 && (
                            <div className="f0-75 black-60 mb1-00">
                                {unknownMinOrderCount} restaurant{unknownMinOrderCount !== 1 ? 's have' : ' has'} no minimum order configured yet.
                            </div>
                        )}
                        <div className="bb mb1-00" />

                        {/* Tax breakdown */}
                        <div className="flex justify-between mb0-25 f0-85"><span>VAT (15.0%)</span><span>{formatCurrency(vatAmount)}</span></div>
                        <div className="flex justify-between mb0-25 f0-85"><span>NHIL (2.5%)</span><span>{formatCurrency(nhilAmount)}</span></div>
                        <div className="flex justify-between mb0-50 f0-85"><span>GETFund (2.5%)</span><span>{formatCurrency(getfundAmount)}</span></div>
                        <div className="flex justify-between mb1-00 b">
                            <span>Total Tax ({(totalTaxRate * 100).toFixed(1)}%)</span>
                            <span>{formatCurrency(tax)}</span>
                        </div>
                        <div className="bb mb1-00" />

                        {/* Delivery */}
                        <div className="flex justify-between mb0-50 b">
                            <span>{deliveryLabel}</span>
                            <span>
                                {isDeliveryPending
                                    ? (restaurantLookupLoading ? 'Fetching...' : 'Calculated at checkout')
                                    : formatCurrency(deliveryFee)}
                            </span>
                        </div>
                        {unknownDeliveryCount > 0 && (
                            <div className="f0-75 black-60 mb1-00">
                                {unknownDeliveryCount} restaurant{unknownDeliveryCount !== 1 ? 's have' : ' has'} no delivery fee configured yet.
                            </div>
                        )}
                        <div className="bb mb1-00" />

                        {/* Grand total */}
                        <div className="flex justify-between mb2-00 b f1-25">
                            <span>Total</span>
                            <span className="gold1">{formatCurrency(total)}</span>
                        </div>

                        <div className="flex flex-column ggap0-50">
                            <button
                                className="w-100 tc pa0-50 br0-25 ba b b--brown0 bg-brown0 gold0 pointer"
                                onClick={handleProceedToCheckout}
                                disabled={cart.length === 0 || unmetMinOrders.length > 0}
                                aria-label="Proceed to checkout"
                                data-testid="cart-checkout-btn"
                            >
                                {user ? 'Proceed to Checkout' : 'Login to Checkout'}
                            </button>
                            <Link
                                to="/restaurants"
                                className="w-100 tc pa0-50 br0-25 ba b--brown0 bg-transparent brown0 no-underline b"
                                data-testid="cart-continue-btn"
                                onClick={() => setShowOrderSummary(false)}
                            >
                                Continue Shopping
                            </Link>
                        </div>
                    </main>
                </div>
            </div>
        )}

        {/* ── Delete confirmation modal ── */}
        {deleteDialog.open && (
            <div
                className="fixed top-0 left-0 w-100 h-100 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.55)', zIndex: 1050 }}
                onClick={(e) => { if (e.target === e.currentTarget) closeDeleteDialog(); }}
            >
                <div className="bg-white br0-25 shadow-4" style={{ width: '100%', maxWidth: '400px' }}>
                    <header className="flex justify-between items-center pa1-00 bg-brown0 gold0" style={{ borderRadius: '0.25rem 0.25rem 0 0' }}>
                        <h5 className="mb0-00 gold0">Confirm Delete</h5>
                        <button
                            type="button"
                            className="ba pa0-25 br0-25 bg-transparent gold0 b--gold0 pointer"
                            onClick={closeDeleteDialog}
                            aria-label="Close"
                        ><FaTimes /></button>
                    </header>
                    <main className="pa1-00 brown0">
                        {deleteDialog.mode === 'clear'
                            ? 'Are you sure you want to clear all items from your cart? This action cannot be undone.'
                            : `Are you sure you want to remove ${deleteDialog.itemName} from your cart?`}
                    </main>
                    <footer className="flex justify-end ggap0-50 pa1-00">
                        <button type="button" className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer" onClick={closeDeleteDialog}>
                            Cancel
                        </button>
                        <button type="button" className="ba pa0-25 br0-25 bg-brown0 gold0 b--brown0 pointer" onClick={confirmDeleteDialog}>
                            Delete
                        </button>
                    </footer>
                </div>
            </div>
        )}
        </>
    );
};
export default CartPage;