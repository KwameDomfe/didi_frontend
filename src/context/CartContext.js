import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CartContext = createContext();
const CART_STORAGE_KEY = 'didi_cart_v1';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api';

const buildScopedCartStorageKey = () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return `${CART_STORAGE_KEY}_guest`;
  }

  const tokenFingerprint = token.replace(/[^a-zA-Z0-9]/g, '').slice(-16) || 'auth';
  return `${CART_STORAGE_KEY}_${tokenFingerprint}`;
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

const normalizeRestaurantDeliveryFee = (item) => {
  const feeCandidate =
    item?.restaurant_delivery_fee
    ?? item?.delivery_fee
    ?? item?.restaurant?.delivery_fee
    ?? null;

  const fee = toNumber(feeCandidate);
  return fee === null ? null : Math.max(0, fee);
};

const normalizeRestaurantMinOrder = (item) => {
  const minOrderCandidate =
    item?.restaurant_min_order
    ?? item?.min_order
    ?? item?.restaurant?.min_order
    ?? null;

  const minOrder = toNumber(minOrderCandidate);
  return minOrder === null ? null : Math.max(0, minOrder);
};

const normalizeCartItemShape = (item) => {
  const normalized = { ...(item || {}) };
  const rawRestaurant = normalized.restaurant;
  const restaurantIdFromPath =
    typeof rawRestaurant === 'string'
      ? (() => {
          const match = rawRestaurant.match(/\/restaurants\/(\d+)\/?$/i);
          return match?.[1] ? Number(match[1]) : null;
        })()
      : null;
  const restaurantNameFromString =
    typeof rawRestaurant === 'string' && !/^\/?api\//i.test(rawRestaurant) && !/^https?:\/\//i.test(rawRestaurant)
      ? rawRestaurant.trim()
      : null;
  const restaurantIdCandidate =
    normalized.restaurant_id
    ?? normalized.restaurant?.id
    ?? restaurantIdFromPath
    ?? (typeof normalized.restaurant === 'number' ? normalized.restaurant : null);
  const restaurantNameCandidate =
    normalized.restaurant_name
    ?? normalized.restaurant?.name
    ?? restaurantNameFromString
    ?? null;

  if (restaurantIdCandidate !== null && restaurantIdCandidate !== undefined) {
    normalized.restaurant_id = restaurantIdCandidate;
  }

  if (restaurantNameCandidate) {
    normalized.restaurant_name = restaurantNameCandidate;
  }

  normalized.restaurant_delivery_fee = normalizeRestaurantDeliveryFee(normalized);
  normalized.restaurant_min_order = normalizeRestaurantMinOrder(normalized);
  return normalized;
};

const readPersistedCart = (storageKey = buildScopedCartStorageKey()) => {
  try {
    const rawCart = localStorage.getItem(storageKey);
    if (!rawCart) {
      return [];
    }

    const parsedCart = JSON.parse(rawCart);
    return Array.isArray(parsedCart) ? parsedCart.map(normalizeCartItemShape) : [];
  } catch {
    return [];
  }
};

const flattenSelectedOptionsToExtras = (selectedOptions) => {
  if (!selectedOptions || typeof selectedOptions !== 'object') {
    return [];
  }

  return Object.values(selectedOptions)
    .flat()
    .map((choice) => ({
      choice_id: choice.id,
      quantity: Math.max(1, parseInt(choice.quantity, 10) || 1),
    }))
    .filter((extra) => Number.isFinite(Number(extra.choice_id)));
};

const mapBackendCartItemToFrontend = (backendItem) => {
  const menuItem = backendItem?.menu_item || {};
  const extras = backendItem?.customizations?.extras || [];
  const selectedExtras = extras.map((extra) => ({
    id: extra.choice_id,
    name: extra.name || `Option ${extra.choice_id}`,
    quantity: Math.max(1, parseInt(extra.quantity, 10) || 1),
    price_modifier: parseFloat(extra.unit_price || extra.price_modifier || 0),
  }));

  const extraPrice = selectedExtras.reduce(
    (sum, extra) => sum + parseFloat(extra.price_modifier || 0) * (parseInt(extra.quantity, 10) || 1),
    0
  );

  return normalizeCartItemShape({
    ...menuItem,
    restaurant_delivery_fee:
      backendItem?.restaurant_delivery_fee
      ?? backendItem?.delivery_fee
      ?? menuItem?.restaurant_delivery_fee
      ?? menuItem?.delivery_fee
      ?? null,
    restaurant_id:
      backendItem?.restaurant_id
      ?? menuItem?.restaurant_id
      ?? menuItem?.restaurant?.id
      ?? null,
    restaurant_name:
      backendItem?.restaurant_name
      ?? menuItem?.restaurant_name
      ?? menuItem?.restaurant?.name
      ?? null,
    restaurant_min_order:
      backendItem?.restaurant_min_order
      ?? backendItem?.min_order
      ?? menuItem?.restaurant_min_order
      ?? menuItem?.min_order
      ?? menuItem?.restaurant?.min_order
      ?? null,
    quantity: backendItem.quantity,
    backendCartItemId: backendItem.id,
    cartEntryId: `server-${backendItem.id}`,
    selectedOptions: selectedExtras.length > 0 ? { extras: selectedExtras } : undefined,
    extraPrice: extraPrice > 0 ? extraPrice : undefined,
    specialInstructions:
      backendItem?.customizations?.special_instructions ||
      backendItem?.customizations?.specialInstructions ||
      undefined,
  });
};

const buildBackendCustomizations = (item) => {
  const extras = flattenSelectedOptionsToExtras(item.selectedOptions);
  const customizations = {};

  if (extras.length > 0) {
    customizations.extras = extras;
  }
  if (item.specialInstructions) {
    customizations.special_instructions = item.specialInstructions;
  }

  return customizations;
};

const buildCartEntryId = (itemId, selectedOptions) => {
  const hasSelections = selectedOptions && Object.keys(selectedOptions).length > 0;
  if (!hasSelections) {
    return String(itemId);
  }

  const optionsKey = JSON.stringify(selectedOptions);
  return `${itemId}_${btoa(unescape(encodeURIComponent(optionsKey))).slice(0, 24)}`;
};

const resolveCartImage = (src) => {
  const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  if (!src || typeof src !== 'string') {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=40&h=40&fit=crop';
  }

  const isAbsolute = /^(https?:)?\/\//i.test(src) || src.startsWith('data:') || src.startsWith('blob:');
  return isAbsolute ? src : `${backendOrigin}${src.startsWith('/') ? src : `/${src}`}`;
};

export const CartProvider = ({ children }) => {
  const navigate = useNavigate();
  const authToken = localStorage.getItem('authToken');
  const [cartStorageKey, setCartStorageKey] = useState(buildScopedCartStorageKey);
  const [cart, setCart] = useState(() => readPersistedCart(buildScopedCartStorageKey()));
  const [addingToCart, setAddingToCart] = useState(null);
  const [showCartPreview, setShowCartPreview] = useState(false);
  const [itemQuantities, setItemQuantities] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch {
      // Storage can fail in private mode or low-space conditions.
    }
  }, [cart, cartStorageKey]);

  const isAuthenticated = () => Boolean(localStorage.getItem('authToken'));

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Token ${token}` } : {};
  };

  const loadBackendCart = async () => {
    if (!isAuthenticated()) {
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/orders/cart/current/`, {
        headers: getAuthHeaders(),
      });
      const backendItems = Array.isArray(response.data?.items) ? response.data.items : [];
      setCart(backendItems.map(mapBackendCartItemToFrontend));
    } catch {
      // Keep current local cart if backend fetch fails.
    }
  };

  useEffect(() => {
    loadBackendCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === 'authToken') {
        const nextStorageKey = buildScopedCartStorageKey();
        setCartStorageKey(nextStorageKey);
        if (event.newValue) {
          setCart([]);
          loadBackendCart();
        } else {
          setCart(readPersistedCart(nextStorageKey));
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const nextStorageKey = buildScopedCartStorageKey();
    if (nextStorageKey === cartStorageKey) {
      return;
    }

    setCartStorageKey(nextStorageKey);
    if (authToken) {
      setCart([]);
      loadBackendCart();
      return;
    }

    setCart(readPersistedCart(nextStorageKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, cartStorageKey]);

  // Placeholder toast hook; actual toast managed by AppContext
  // Toast integration placeholder removed (unused)

  const addToCart = async (item) => {
    const normalizedItem = normalizeCartItemShape(item);
    setAddingToCart(normalizedItem.id);
    const quantityToAdd = normalizedItem.quantity || 1;
    // cartEntryId allows the same item with different options to be separate entries
    const cartEntryId = normalizedItem.cartEntryId || String(normalizedItem.id);

    if (isAuthenticated()) {
      try {
        await axios.post(
          `${API_BASE_URL}/orders/cart/add_item/`,
          {
            menu_item_id: normalizedItem.id,
            quantity: quantityToAdd,
            customizations: buildBackendCustomizations(normalizedItem),
          },
          { headers: getAuthHeaders() }
        );
        await loadBackendCart();
        setShowCartPreview(true);
        setTimeout(() => setShowCartPreview(false), 3000);
      } catch {
        // Fall back to local state update if backend sync fails.
        setCart(currentCart => {
          const existingItem = currentCart.find(
            (ci) => (ci.cartEntryId || String(ci.id)) === cartEntryId
          );
          if (existingItem) {
            return currentCart.map((ci) =>
              (ci.cartEntryId || String(ci.id)) === cartEntryId
                ? { ...ci, quantity: ci.quantity + quantityToAdd }
                : ci
            );
          }
          return [...currentCart, { ...normalizedItem, cartEntryId, quantity: quantityToAdd }];
        });
        setShowCartPreview(true);
        setTimeout(() => setShowCartPreview(false), 3000);
      } finally {
        setAddingToCart(null);
      }
      return;
    }

    setCart(currentCart => {
      const existingItem = currentCart.find(
        (ci) => (ci.cartEntryId || String(ci.id)) === cartEntryId
      );
      if (existingItem) {
        return currentCart.map((ci) =>
          (ci.cartEntryId || String(ci.id)) === cartEntryId
            ? { ...ci, quantity: ci.quantity + quantityToAdd }
            : ci
        );
      }
      return [...currentCart, { ...normalizedItem, cartEntryId, quantity: quantityToAdd }];
    });
    setShowCartPreview(true);
    setTimeout(() => setShowCartPreview(false), 3000);
    setAddingToCart(null);
  };

  const addItemToCart = (item, quantity = 1) => {
    const itemToAdd = { ...item, quantity: parseInt(quantity) || 1 };
    addToCart(itemToAdd);
    setItemQuantities(prev => ({ ...prev, [item.id]: 1 }));
  };

  const updateItemQuantity = (itemId, quantity) => {
    if (quantity < 1) quantity = 1;
    if (quantity > 99) quantity = 99;
    setItemQuantities(prev => ({ ...prev, [itemId]: quantity }));
  };

  const getItemQuantity = (itemId) => itemQuantities[itemId] || 1;

  const removeFromCart = (cartEntryId) => {
    if (isAuthenticated()) {
      const itemToRemove = cart.find(
        (ci) => (ci.cartEntryId || String(ci.id)) === String(cartEntryId)
      );

      if (itemToRemove?.backendCartItemId) {
        axios
          .delete(`${API_BASE_URL}/orders/cart/remove_item/`, {
            headers: getAuthHeaders(),
            params: { item_id: itemToRemove.backendCartItemId },
          })
          .then(() => loadBackendCart())
          .catch(() => {
            setCart(currentCart =>
              currentCart.filter(
                (ci) => (ci.cartEntryId || String(ci.id)) !== String(cartEntryId)
              )
            );
          });
        return;
      }
    }

    setCart(currentCart =>
      currentCart.filter(
        (ci) => (ci.cartEntryId || String(ci.id)) !== String(cartEntryId)
      )
    );
  };

  const updateCartQuantity = (cartEntryId, quantity) => {
    if (isAuthenticated()) {
      const existingItem = cart.find(
        (ci) => (ci.cartEntryId || String(ci.id)) === String(cartEntryId)
      );

      if (existingItem?.backendCartItemId) {
        if (quantity <= 0) {
          removeFromCart(cartEntryId);
          return;
        }

        axios
          .put(
            `${API_BASE_URL}/orders/cart/update_item/`,
            { item_id: existingItem.backendCartItemId, quantity },
            { headers: getAuthHeaders() }
          )
          .then(() => loadBackendCart())
          .catch(() => {
            setCart(currentCart =>
              currentCart.map((ci) =>
                (ci.cartEntryId || String(ci.id)) === String(cartEntryId)
                  ? { ...ci, quantity }
                  : ci
              )
            );
          });
        return;
      }
    }

    if (quantity <= 0) {
      removeFromCart(cartEntryId);
    } else {
      setCart(currentCart =>
        currentCart.map((ci) =>
          (ci.cartEntryId || String(ci.id)) === String(cartEntryId)
            ? { ...ci, quantity }
            : ci
        )
      );
    }
  };

  const updateCartItemDetails = async (cartEntryId, updatedItem) => {
    if (isAuthenticated()) {
      const existingItem = cart.find(
        (ci) => (ci.cartEntryId || String(ci.id)) === String(cartEntryId)
      );

      if (existingItem?.backendCartItemId) {
        try {
          await axios.put(
            `${API_BASE_URL}/orders/cart/update_item/`,
            {
              item_id: existingItem.backendCartItemId,
              quantity: updatedItem.quantity,
              customizations: buildBackendCustomizations(updatedItem),
            },
            { headers: getAuthHeaders() }
          );
          await loadBackendCart();
          return;
        } catch {
          // Fall through to local optimistic update if backend request fails.
        }
      }
    }

    setCart((currentCart) => {
      const nextCartEntryId = buildCartEntryId(updatedItem.id, updatedItem.selectedOptions);
      const filteredCart = currentCart.filter(
        (ci) => (ci.cartEntryId || String(ci.id)) !== String(cartEntryId)
      );

      const matchingItem = filteredCart.find(
        (ci) => (ci.cartEntryId || String(ci.id)) === nextCartEntryId
      );

      if (matchingItem) {
        return filteredCart.map((ci) =>
          (ci.cartEntryId || String(ci.id)) === nextCartEntryId
            ? { ...ci, quantity: ci.quantity + updatedItem.quantity }
            : ci
        );
      }

      return [
        ...filteredCart,
        normalizeCartItemShape({
          ...updatedItem,
          cartEntryId: nextCartEntryId,
        }),
      ];
    });
  };

  const getCartTotal = () =>
    cart.reduce(
      (t, i) => t + (parseFloat(i.price) + parseFloat(i.extraPrice || 0)) * i.quantity,
      0
    );
  const getCartItemCount = () => cart.reduce((t, i) => t + i.quantity, 0);

  const clearCart = async () => {
    setCart([]);
    setShowCartPreview(false);
    if (isAuthenticated()) {
      try {
        await axios.delete(`${API_BASE_URL}/orders/cart/clear/`, {
          headers: getAuthHeaders(),
        });
      } catch {
        // Ignored — the checkout endpoint already clears the backend cart.
      }
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      addingToCart,
      showCartPreview,
      setShowCartPreview,
      addToCart,
      addItemToCart,
      updateItemQuantity,
      getItemQuantity,
      removeFromCart,
      updateCartQuantity,
      updateCartItemDetails,
      getCartTotal,
      getCartItemCount,
      clearCart
    }}>
      {children}
      {showCartPreview && cart.length > 0 && (
        <div
          className="position-fixed"
          data-testid="cart-preview"
          style={{ bottom: '20px', right: '20px', zIndex: 1500, animation: 'slideInUp 0.3s ease-out', pointerEvents: 'auto' }}
        >
          <div className="card shadow-lg border-0" style={{ minWidth: '320px', maxWidth: '400px' }}>
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <h6 className="mb-0">🛒 Cart Preview</h6>
              <button
                className="btn-close btn-close-white btn-sm"
                onClick={() => setShowCartPreview(false)}
                aria-label="Close cart preview"
                data-testid="cart-preview-close-btn"
              ></button>
            </div>
            <div className="card-body p-3">
              <div className="small mb-2 text-muted">
                {getCartItemCount()} item{getCartItemCount() !== 1 ? 's' : ''} • ${getCartTotal().toFixed(2)} total
              </div>
              <div className="max-height-150 overflow-auto">
                {cart.slice(0, 3).map(item => (
                  <div key={item.cartEntryId || item.id} className="d-flex align-items-center gap-2 mb-2">
                    <img
                      src={resolveCartImage(item.image)}
                      alt={item.name}
                      className="rounded"
                      style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                    <div className="flex-grow-1">
                      <div className="small fw-bold">{item.name}</div>
                      <div className="small text-muted">
                      {item.quantity}x ${(parseFloat(item.price) + parseFloat(item.extraPrice || 0)).toFixed(2)}
                    </div>
                    </div>
                  </div>
                ))}
                {cart.length > 3 && (
                  <div className="small text-muted text-center">
                    +{cart.length - 3} more item{cart.length - 3 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="d-grid mt-3">
                <button
                  className="btn btn-primary btn-sm"
                  data-testid="cart-preview-view-cart-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCartPreview(false);
                    navigate('/cart');
                  }}
                >
                  View Full Cart →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
