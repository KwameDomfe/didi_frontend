import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FaShoppingCart, FaChevronLeft } from 'react-icons/fa';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../App';
import formatCurrency from '../../utils/formatCurrency';

const MOBILE_NETWORKS = [
  { value: 'mtn', label: 'MTN Mobile Money', accent: '#ffcb05' },
  { value: 'telecel', label: 'Telecel Cash', accent: '#e60000' },
  { value: 'airteltigo', label: 'AirtelTigo Money', accent: '#1d4ed8' },
];

const CARD_OPTIONS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'verve', label: 'Verve' },
];

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

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart } = useCart();
  const { API_BASE_URL, showToast, user } = useApp();
  const [restaurantMetaLookup, setRestaurantMetaLookup] = useState({});
  const [restaurantLookupLoading, setRestaurantLookupLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mobile-money');
  const [selectedNetwork, setSelectedNetwork] = useState('mtn');
  const [selectedCardType, setSelectedCardType] = useState('visa');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [formValues, setFormValues] = useState({
    fullName: user?.first_name || user?.username || '',
    phoneNumber: '',
    deliveryAddress: '',
    locationHint: '',
    momoNumber: '',
    momoReference: '',
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });

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

  const getRestaurantLookupMeta = (item) => {
    const matchKey = getRestaurantLookupKeys(item)
      .find((key) => restaurantMetaLookup[key] !== undefined);

    return matchKey ? restaurantMetaLookup[matchKey] : null;
  };

  useEffect(() => {
    if (cart.length === 0) {
      return;
    }

    const unresolvedItems = cart.filter((item) => {
      const deliveryFee = toNumber(item?.restaurant_delivery_fee);
      const minOrder = toNumber(item?.restaurant_min_order ?? item?.min_order);
      if (deliveryFee !== null && minOrder !== null) {
        return false;
      }

      const lookupKeys = getRestaurantLookupKeys(item);
      if (lookupKeys.length === 0) {
        return false;
      }

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
            const metadata = {
              deliveryFee: toNumber(restaurant?.delivery_fee ?? restaurant?.restaurant_delivery_fee),
              minOrder: toNumber(restaurant?.min_order ?? restaurant?.restaurant_min_order),
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

        if (!mounted || Object.keys(nextLookup).length === 0) {
          return;
        }

        setRestaurantMetaLookup((prev) => ({ ...prev, ...nextLookup }));
      } catch {
        // Keep checkout available even if metadata lookup fails.
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
  }, [API_BASE_URL, cart, restaurantMetaLookup]);

  const restaurantOrderBreakdown = useMemo(
    () => Object.values(
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
            deliveryFee: null,
          };
        }

        const lookupMeta = getRestaurantLookupMeta(item);
        const directMinOrder = toNumber(item.restaurant_min_order ?? item.min_order);
        const directDeliveryFee = toNumber(item.restaurant_delivery_fee);
        const unitPrice = parseFloat(item.price) + parseFloat(item.extraPrice || 0);

        acc[restaurantKey].subtotal += unitPrice * item.quantity;

        const minOrder = directMinOrder !== null ? directMinOrder : toNumber(lookupMeta?.minOrder);
        if (minOrder !== null) {
          acc[restaurantKey].minOrder = Math.max(0, minOrder);
        }

        const deliveryFee = directDeliveryFee !== null ? directDeliveryFee : toNumber(lookupMeta?.deliveryFee);
        if (deliveryFee !== null) {
          acc[restaurantKey].deliveryFee = Math.max(0, deliveryFee);
        }

        return acc;
      }, {})
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, restaurantMetaLookup]
  );

  const subtotal = getCartTotal();
  const deliveryFee = restaurantOrderBreakdown.reduce(
    (sum, entry) => sum + (entry.deliveryFee || 0),
    0
  );
  const VAT_RATE = 0.15;
  const NHIL_RATE = 0.025;
  const GETFUND_RATE = 0.025;
  const vatAmount = subtotal * VAT_RATE;
  const nhilAmount = subtotal * NHIL_RATE;
  const getfundAmount = subtotal * GETFUND_RATE;
  const tax = vatAmount + nhilAmount + getfundAmount;
  const total = subtotal + deliveryFee + tax;
  const unmetMinOrders = restaurantOrderBreakdown
    .filter((entry) => entry.minOrder !== null && entry.subtotal < entry.minOrder)
    .map((entry) => ({
      ...entry,
      remaining: entry.minOrder - entry.subtotal,
    }));
  const deliveryPendingCount = restaurantOrderBreakdown.filter((entry) => entry.deliveryFee === null).length;
  const isMobileMoney = paymentMethod === 'mobile-money';

  useEffect(() => {
    if (user) {
      return;
    }

    showToast('Please log in to access checkout.', 'info');
    navigate('/login');
  }, [navigate, showToast, user]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      showToast('Please log in to place an order.', 'error');
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      navigate('/cart');
      return;
    }

    if (unmetMinOrders.length > 0) {
      showToast('One or more restaurants have not met the minimum order.', 'error');
      return;
    }

    if (!formValues.fullName.trim() || !formValues.phoneNumber.trim() || !formValues.deliveryAddress.trim()) {
      showToast('Please complete your delivery details before payment.', 'error');
      return;
    }

    if (isMobileMoney) {
      if (!formValues.momoNumber.trim()) {
        showToast('Enter the mobile money number that should receive the payment prompt.', 'error');
        return;
      }
    } else if (!formValues.cardName.trim() || !formValues.cardNumber.trim() || !formValues.expiryDate.trim() || !formValues.cvv.trim()) {
      showToast('Complete the card payment details before continuing.', 'error');
      return;
    }

    setProcessingPayment(true);
    try {
      const token = localStorage.getItem('authToken');
      const paymentMethodValue = isMobileMoney
        ? `${selectedNetwork}_momo`
        : selectedCardType;

      const response = await axios.post(
        `${API_BASE_URL}/orders/orders/checkout/`,
        {
          delivery_address: formValues.deliveryAddress,
          delivery_instructions: formValues.locationHint,
          payment_method: paymentMethodValue,
          notes: formValues.momoReference || '',
        },
        { headers: { Authorization: `Token ${token}` } }
      );

      const createdOrder = response.data;
      await clearCart();

      if (isMobileMoney) {
        showToast(
          `Payment prompt sent to ${formValues.momoNumber} via ${MOBILE_NETWORKS.find((network) => network.value === selectedNetwork)?.label || 'Mobile Money'}. Approve on your phone.`,
          'success'
        );
      } else {
        showToast(`${selectedCardType.toUpperCase()} payment authorized for order ${createdOrder.order_number}.`, 'success');
      }

      navigate(`/orders/confirmation/${createdOrder.id}`);
    } catch (err) {
      const errData = err?.response?.data;
      const errorMsg =
        errData?.error
        || errData?.detail
        || (errData && typeof errData === 'object' ? Object.values(errData).flat().join('. ') : null)
        || 'Payment processing failed. Please try again.';
      showToast(errorMsg, 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

    if (cart.length === 0) {
        return (
            <div className="container container90 pv4-00 tc">
                <div style={{ fontSize: '3rem' }}><FaShoppingCart /></div>
                <h1 className="f1-75 brown0 mb1-00">Checkout</h1>
                <p className="brown0 mb2-00">Your cart is empty. Add items before checking out.</p>
                <div className="flex justify-center ggap1-00">
                    <button
                        className="ba pa0-50 br0-25 bg-brown0 gold0 b--brown0 pointer b"
                        onClick={() => navigate('/cart')}
                    >
                        Back to Cart
                    </button>
                    <Link to="/restaurants" className="ba pa0-50 br0-25 bg-transparent brown0 b--brown0 no-underline b">
                        Browse Restaurants
                    </Link>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="container container90 pv2-00">
            {/* Page header */}
            <div className="flex justify-between items-center mb2-00">
                <div>
                    <h1 className="f1-75 brown0 mb0-25">Checkout</h1>
                    <p className="brown0 f0-85 mb0-00">
                        Mobile money is the primary payment path. Card options remain available as fallback.
                    </p>
                </div>
                <button
                    className="ba pa0-50 br0-25 bg-transparent brown0 b--brown0 pointer flex items-center ggap0-25"
                    onClick={() => navigate('/cart')}
                >
                    <FaChevronLeft /> Back to Cart
                </button>
            </div>

            <div className="grid gtc1 gtc12-m ggap2-00">
                {/* ── Left column: payment forms ── */}
                <div className="gc1s12 gc1s8-m">
                    {/* Min-order warning */}
                    {unmetMinOrders.length > 0 && (
                        <div className="ba br0-25 pa1-00 mb2-00 bg-gold5 brown0 shadow-4" role="alert">
                            <div className="b mb0-50">Minimum order not met</div>
                            {unmetMinOrders.map((entry) => (
                                <div key={`${entry.key}-checkout-warning`} className="f0-85 mb0-25">
                                    {entry.label}: add {formatCurrency(entry.remaining)} more to reach {formatCurrency(entry.minOrder)}.
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Mobile Money card */}
                    <div className="ba br0-25 shadow-4 bg-white mb2-00">
                        <header className="flex justify-between items-start pa1-00 bg-brown0 gold0" style={{ borderRadius: '0.25rem 0.25rem 0 0' }}>
                            <div>
                                <div className="f0-75 gold0 mb0-25" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary payment</div>
                                <h2 className="f1-25 gold0 mb0-25">Mobile Money</h2>
                                <p className="f0-85 gold0 mb0-00" style={{ opacity: 0.85 }}>
                                    Fastest checkout flow. Customer receives a payment prompt directly on their phone.
                                </p>
                            </div>
                            <span className="ba pa0-25 br0-25 bg-transparent gold0 b--gold0 f0-75">Recommended</span>
                        </header>

                        <div className="pa1-00 brown0">
                            {/* Network selector */}
                            <div className="grid gtc3-m ggap0-75 mb1-50">
                                {MOBILE_NETWORKS.map((network) => (
                                    <button
                                        key={network.value}
                                        type="button"
                                        className={`pa0-75 br0-25 ba pointer tl${selectedNetwork === network.value ? ' bg-brown0 gold0 b--brown0' : ' bg-transparent brown0 b--brown0'}`}
                                        onClick={() => { setPaymentMethod('mobile-money'); setSelectedNetwork(network.value); }}
                                    >
                                        <div className="b f0-90">{network.label}</div>
                                        <div className="f0-75" style={{ opacity: 0.75 }}>Push prompt to payer</div>
                                    </button>
                                ))}
                            </div>

                            {/* Delivery + payment fields */}
                            <div className="grid gtc2-m ggap1-00">
                                <div>
                                    <label className="b db mb0-25 f0-90">Full Name</label>
                                    <input name="fullName" value={formValues.fullName} onChange={handleInputChange}
                                        className="w-100 ba br0-25 b--brown0 brown0 pa0-50" placeholder="Recipient name" />
                                </div>
                                <div>
                                    <label className="b db mb0-25 f0-90">Phone Number</label>
                                    <input name="phoneNumber" value={formValues.phoneNumber} onChange={handleInputChange}
                                        className="w-100 ba br0-25 b--brown0 brown0 pa0-50" placeholder="0XXXXXXXXX" />
                                </div>
                                <div>
                                    <label className="b db mb0-25 f0-90">MoMo Number</label>
                                    <input name="momoNumber" value={formValues.momoNumber} onChange={handleInputChange}
                                        className="w-100 ba br0-25 b--brown0 brown0 pa0-50" placeholder="Number to receive payment prompt" />
                                </div>
                                <div>
                                    <label className="b db mb0-25 f0-90">Reference</label>
                                    <input name="momoReference" value={formValues.momoReference} onChange={handleInputChange}
                                        className="w-100 ba br0-25 b--brown0 brown0 pa0-50" placeholder="Optional order note" />
                                </div>
                                <div className="gc1s2-m">
                                    <label className="b db mb0-25 f0-90">Delivery Address</label>
                                    <input name="deliveryAddress" value={formValues.deliveryAddress} onChange={handleInputChange}
                                        className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                                        placeholder="Street, landmark or house number"
                                        list="ghana-areas" />
                                    <datalist id="ghana-areas">
                                        <option value="Accra - Osu" /><option value="Accra - Labone" />
                                        <option value="Accra - East Legon" /><option value="Accra - Cantonments" />
                                        <option value="Accra - Airport Residential Area" /><option value="Accra - Dzorwulu" />
                                        <option value="Accra - Adabraka" /><option value="Accra - Madina" />
                                        <option value="Accra - Dome" /><option value="Accra - Spintex Road" />
                                        <option value="Accra - Tema" /><option value="Accra - Achimota" />
                                        <option value="Accra - Dansoman" /><option value="Accra - Lapaz" />
                                        <option value="Accra - Tesano" /><option value="Accra - North Kaneshie" />
                                        <option value="Accra - South Kaneshie" /><option value="Accra - Kasoa" />
                                        <option value="Accra - Teshie" /><option value="Accra - Nungua" />
                                        <option value="Accra - Accra Central" /><option value="Accra - Ashaiman" />
                                        <option value="Kumasi - Adum" /><option value="Kumasi - Bantama" />
                                        <option value="Kumasi - Asafo" /><option value="Kumasi - Nhyiaeso" />
                                        <option value="Kumasi - KNUST" /><option value="Takoradi" />
                                        <option value="Cape Coast" /><option value="Tamale" />
                                        <option value="Sunyani" /><option value="Ho" />
                                        <option value="Koforidua" /><option value="Bolgatanga" />
                                        <option value="Wa" /><option value="Techiman" />
                                    </datalist>
                                </div>
                                <div className="gc1s2-m">
                                    <label className="b db mb0-25 f0-90">Location Hint</label>
                                    <textarea name="locationHint" value={formValues.locationHint} onChange={handleInputChange}
                                        className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                                        rows="3" placeholder="Delivery instructions, gate code, nearby landmark"
                                        style={{ resize: 'vertical' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card payment card */}
                    <div className="ba br0-25 shadow-4 bg-white">
                        <header className="flex justify-between items-center pa1-00 bg-brown0 gold0" style={{ borderRadius: '0.25rem 0.25rem 0 0' }}>
                            <div>
                                <div className="f0-75 gold0 mb0-25" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secondary options</div>
                                <h2 className="f1-00 gold0 mb0-00">Visa and Other Cards</h2>
                            </div>
                            <button
                                type="button"
                                className={`ba pa0-25 br0-25 pointer f0-85${paymentMethod === 'card' ? ' bg-transparent gold0 b--gold0' : ' bg-transparent gold0 b--gold0'}`}
                                onClick={() => setPaymentMethod(paymentMethod === 'card' ? 'mobile-money' : 'card')}
                            >
                                {paymentMethod === 'card' ? 'Using Card' : 'Use Card Instead'}
                            </button>
                        </header>

                        <div className="pa1-00 brown0">
                            {/* Card type selector */}
                            <div className="flex ggap0-75 mb1-50">
                                {CARD_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`pa0-50 br0-25 ba pointer${selectedCardType === option.value ? ' bg-brown0 gold0 b--brown0' : ' bg-transparent brown0 b--brown0'}`}
                                        onClick={() => { setPaymentMethod('card'); setSelectedCardType(option.value); }}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            {paymentMethod === 'card' ? (
                                <div className="grid gtc2-m ggap1-00">
                                    <div className="gc1s2-m">
                                        <label className="b db mb0-25 f0-90">Name on Card</label>
                                        <input name="cardName" value={formValues.cardName} onChange={handleInputChange}
                                            className="w-100 ba br0-25 b--brown0 brown0 pa0-50" placeholder="Cardholder name" />
                                    </div>
                                    <div className="gc1s2-m">
                                        <label className="b db mb0-25 f0-90">Card Number</label>
                                        <input name="cardNumber" value={formValues.cardNumber} onChange={handleInputChange}
                                            className="w-100 ba br0-25 b--brown0 brown0 pa0-50" placeholder="XXXX XXXX XXXX XXXX" />
                                    </div>
                                    <div>
                                        <label className="b db mb0-25 f0-90">Expiry</label>
                                        <input name="expiryDate" value={formValues.expiryDate} onChange={handleInputChange}
                                            className="w-100 ba br0-25 b--brown0 brown0 pa0-50" placeholder="MM/YY" />
                                    </div>
                                    <div>
                                        <label className="b db mb0-25 f0-90">CVV</label>
                                        <input name="cvv" value={formValues.cvv} onChange={handleInputChange}
                                            className="w-100 ba br0-25 b--brown0 brown0 pa0-50" placeholder="CVV" />
                                    </div>
                                </div>
                            ) : (
                                <p className="brown0 f0-85">
                                    Card payments are available as fallback, but mobile money remains the preferred path for faster confirmation.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Right column: order summary ── */}
                <div className="gc1s12 gc9s4-m">
                    <div className="ba br0-25 shadow-4" style={{ position: 'sticky', top: '1rem' }}>
                        <header className="flex justify-between items-center pa1-00 bg-brown0 gold0" style={{ borderRadius: '0.25rem 0.25rem 0 0' }}>
                            <h2 className="f1-00 gold0 mb0-00">Order Summary</h2>
                            <span className="ba pa0-25 br0-25 bg-transparent gold0 b--gold0 f0-75">{cart.length} items</span>
                        </header>

                        <div className="pa1-00 brown0">
                            {/* Per-restaurant breakdown */}
                            <div className="f0-85 mb1-00">
                                {restaurantOrderBreakdown.map((entry) => (
                                    <div key={`${entry.key}-summary`} className="ba br0-25 pa0-75 mb0-75">
                                        <div className="b mb0-50">{entry.label}</div>
                                        <div className="flex justify-between mb0-25">
                                            <span>Food subtotal</span>
                                            <span>{formatCurrency(entry.subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between mb0-25">
                                            <span>Minimum order</span>
                                            <span>{entry.minOrder !== null ? formatCurrency(entry.minOrder) : (restaurantLookupLoading ? 'Loading...' : 'Not set')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Delivery</span>
                                            <span>{entry.deliveryFee !== null ? formatCurrency(entry.deliveryFee) : (restaurantLookupLoading ? 'Loading...' : 'Pending')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between mb0-50"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between mb0-25 f0-85"><span>VAT (15%)</span><span>{formatCurrency(vatAmount)}</span></div>
                            <div className="flex justify-between mb0-25 f0-85"><span>NHIL (2.5%)</span><span>{formatCurrency(nhilAmount)}</span></div>
                            <div className="flex justify-between mb0-50 f0-85"><span>GETFund (2.5%)</span><span>{formatCurrency(getfundAmount)}</span></div>
                            <div className="flex justify-between mb0-50">
                                <span>Delivery Fee</span>
                                <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : (restaurantLookupLoading ? 'Loading...' : 'Pending')}</span>
                            </div>
                            {deliveryPendingCount > 0 && (
                                <div className="f0-75 brown0 mb0-50">
                                    {deliveryPendingCount} restaurant{deliveryPendingCount !== 1 ? 's are' : ' is'} still resolving delivery fee.
                                </div>
                            )}
                            <div className="bb mb1-00" />
                            <div className="flex justify-between mb1-50 b f1-25">
                                <span>Total</span>
                                <span className="gold1">{formatCurrency(total)}</span>
                            </div>

                            <button
                                type="button"
                                className="w-100 tc pa0-50 br0-25 ba b b--brown0 bg-brown0 gold0 pointer mb1-00"
                                onClick={handlePlaceOrder}
                                disabled={processingPayment || unmetMinOrders.length > 0}
                                style={(processingPayment || unmetMinOrders.length > 0) ? { opacity: 0.5 } : undefined}
                            >
                                {processingPayment
                                    ? 'Processing Payment...'
                                    : (isMobileMoney ? 'Send Mobile Money Prompt' : `Pay with ${selectedCardType.toUpperCase()}`)}
                            </button>
                            <Link to="/cart" className="w-100 tc pa0-50 br0-25 ba b--brown0 bg-transparent brown0 no-underline b db">
                                Review Cart
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    };

export default CheckoutPage;