import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useApp } from '../../App';
import { useNavigate, Link } from 'react-router-dom';
import formatCurrency from '../../utils/formatCurrency';
import { FaShoppingBag } from 'react-icons/fa';

const OrdersPage = () => {
  const { user, API_BASE_URL, showToast } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/orders/orders/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      setOrders(response.data.results || response.data);
    } catch (error) {
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, showToast]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user, navigate, fetchOrders]);

  const getStatusBadgeClass = (status) => {
    const classes = {
      'pending': 'bg-warning',
      'confirmed': 'bg-info',
      'preparing': 'bg-primary',
      'ready': 'bg-success',
      'delivered': 'bg-success',
      'cancelled': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
  };

  if (!user) return null;

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">My Orders</h2>
          
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="card shadow">
              <div className="card-body text-center py-5">
                <FaShoppingBag style={{ fontSize: '4rem', color: '#ccc' }} aria-hidden="true" />
                <h4 className="mt-3">No Orders Yet</h4>
                <p className="text-muted">You haven't placed any orders yet.</p>
                <button 
                  className="btn btn-primary mt-3"
                  onClick={() => navigate('/restaurants')}
                >
                  Browse Restaurants
                </button>
              </div>
            </div>
          ) : (
            <div className="row">
              {orders.map(order => (
                <div key={order.id} className="col-md-6 mb-4">
                  <div className="card shadow h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h5 className="card-title mb-1">Order #{order.id}</h5>
                          <small className="text-muted">
                            {new Date(order.created_at).toLocaleDateString()}
                          </small>
                        </div>
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <strong>Restaurant:</strong> {order.restaurant?.name || 'N/A'}
                      </div>
                      
                      <div className="mb-3">
                        <strong>Items:</strong>
                        <ul className="list-unstyled ms-3 mt-2">
                          {(order.items || []).map((item, idx) => (
                            <li key={idx}>
                              {item.quantity}x {item.menu_item?.name || item.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="d-flex justify-content-between align-items-center">
                        <strong>Total:</strong>
                        <span className="h5 mb-0">{formatCurrency(order.total_amount)}</span>
                      </div>
                      <div className="mt-3">
                        <Link
                          to={`/orders/confirmation/${order.id}`}
                          className="btn btn-sm btn-outline-primary w-100"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;