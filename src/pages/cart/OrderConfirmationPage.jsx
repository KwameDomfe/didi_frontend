import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../App';
import formatCurrency from '../../utils/formatCurrency';

const TERMINAL_STATUSES = new Set(['delivered', 'cancelled']);
const POLL_INTERVAL_MS = 5000;

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_BADGE = {
  pending: 'bg-warning text-dark',
  confirmed: 'bg-info text-dark',
  preparing: 'bg-primary',
  ready: 'bg-success',
  delivered: 'bg-success',
  cancelled: 'bg-danger',
};

const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, API_BASE_URL, showToast } = useApp();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  const intervalRef = useRef(null);

  const fetchOrder = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/orders/orders/${orderId}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      setOrder(response.data);
      if (TERMINAL_STATUSES.has(response.data.status)) {
        setPolling(false);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        showToast('Order not found.', 'error');
        navigate('/orders');
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, orderId, navigate, showToast, user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrder();
  }, [user, navigate, fetchOrder]);

  useEffect(() => {
    if (!polling || !user) return;
    intervalRef.current = setInterval(fetchOrder, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [polling, fetchOrder, user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading order...</span>
        </div>
        <p className="mt-3 text-muted">Loading your order details...</p>
      </div>
    );
  }

  if (!order) return null;

  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const isTerminal = isCancelled || isDelivered;
  const itemsSubtotal = (order.items || []).reduce(
    (sum, item) => sum + parseFloat(item.total_price || 0),
    0
  );

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">

          {/* Header card */}
          <div className={`card border-0 shadow-sm mb-4`}>
            <div
              className={`card-body text-center py-4 ${
                isCancelled ? 'bg-danger-subtle' : 'bg-success-subtle'
              }`}
            >
              <div className="mb-3" style={{ fontSize: '3rem' }}>
                {isCancelled ? '❌' : '✅'}
              </div>
              <h1 className="h3 mb-1">
                {isCancelled ? 'Order Cancelled' : 'Order Placed Successfully!'}
              </h1>
              <p className="text-muted mb-2">
                {isCancelled
                  ? 'This order was cancelled.'
                  : "We've received your order and it's being processed."}
              </p>
              <div className="fw-bold fs-5 mb-2">#{order.order_number}</div>
              <span
                className={`badge ${STATUS_BADGE[order.status] || 'bg-secondary'} px-3 py-2`}
              >
                {STATUS_LABEL[order.status] || order.status}
              </span>

              {polling && !isTerminal && (
                <div className="mt-3 small text-muted d-flex align-items-center justify-content-center gap-2">
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  />
                  Tracking your order live...
                </div>
              )}
            </div>
          </div>

          {/* Tracking timeline */}
          {Array.isArray(order.tracking) && order.tracking.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h2 className="h6 fw-semibold mb-3">Order Timeline</h2>
                <ol className="list-unstyled mb-0">
                  {[...order.tracking].reverse().map((event, idx, arr) => (
                    <li key={event.id || idx} className="d-flex gap-3 mb-3">
                      <div className="d-flex flex-column align-items-center">
                        <div
                          className="rounded-circle bg-success flex-shrink-0"
                          style={{ width: '10px', height: '10px', marginTop: '4px' }}
                        />
                        {idx < arr.length - 1 && (
                          <div
                            style={{
                              width: '2px',
                              flex: 1,
                              background: '#dee2e6',
                              minHeight: '20px',
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <div className="small fw-semibold">
                          {event.message || STATUS_LABEL[event.status] || event.status}
                        </div>
                        <div className="small text-muted">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Order details */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h6 fw-semibold mb-0">Order Details</h2>
                <span className="text-muted small">
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </div>

              {order.restaurant && (
                <div className="mb-3">
                  <div className="text-muted small">Restaurant</div>
                  <div className="fw-semibold">{order.restaurant.name}</div>
                </div>
              )}

              {order.delivery_address && (
                <div className="mb-3">
                  <div className="text-muted small">Delivery Address</div>
                  <div>{order.delivery_address}</div>
                  {order.delivery_instructions && (
                    <div className="text-muted small mt-1">{order.delivery_instructions}</div>
                  )}
                </div>
              )}

              <div className="mb-3">
                <div className="text-muted small mb-2">Items</div>
                {(order.items || []).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="d-flex justify-content-between small mb-1"
                  >
                    <span>
                      {item.quantity}× {item.menu_item?.name || 'Item'}
                    </span>
                    <span>{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>

              <hr />
              <div className="d-flex justify-content-between small mb-1">
                <span>Items subtotal</span>
                <span>{formatCurrency(itemsSubtotal)}</span>
              </div>
              <div className="d-flex justify-content-between small mb-1">
                <span>Delivery fee</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
              <div className="d-flex justify-content-between small mb-1">
                <span>Tax</span>
                <span>{formatCurrency(order.tax_amount)}</span>
              </div>
              {parseFloat(order.tip_amount || 0) > 0 && (
                <div className="d-flex justify-content-between small mb-1">
                  <span>Tip</span>
                  <span>{formatCurrency(order.tip_amount)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between fw-bold mt-2">
                <span>Total</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h2 className="h6 fw-semibold mb-3">Payment</h2>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Method</span>
                <span className="text-capitalize">
                  {(order.payment_method || '').replace(/_/g, ' ')}
                </span>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <span className="text-muted">Status</span>
                <span
                  className={`badge ${
                    order.payment_status === 'paid' ? 'bg-success' : 'bg-warning text-dark'
                  }`}
                >
                  {order.payment_status || 'pending'}
                </span>
              </div>
              {order.estimated_delivery_time && (
                <div className="d-flex justify-content-between mt-2">
                  <span className="text-muted">Estimated delivery</span>
                  <span>{new Date(order.estimated_delivery_time).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="d-flex gap-3">
            <Link to="/orders" className="btn btn-primary flex-grow-1">
              View All Orders
            </Link>
            <Link to="/restaurants" className="btn btn-outline-secondary flex-grow-1">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
