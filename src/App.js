import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { CartProvider, useCart } from './context/CartContext';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import RestaurantDetailPage from './pages/restaurants/RestaurantDetailPage.jsx';
import MenuItemDetailPage from './pages/menus/MenuItemDetailPage.jsx';
import CartPage from './pages/cart/CartPage.jsx';
import MenuPage from './pages/menus/MenuPage.jsx';
import CheckoutPage from './pages/cart/CheckoutPage.jsx';
import LoginPage from './pages/accounts/LoginPage.jsx';
import ForgotPasswordPage from './pages/accounts/ForgotPasswordPage.jsx';
import VerifyEmailPage from './pages/accounts/VerifyEmailPage.jsx';
import CategoryDetailPage from './pages/CategoryDetailPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import RestaurantsPage from './pages/restaurants/RestaurantPage.jsx';
import ProfilePage from './pages/accounts/ProfilePage.jsx';
import OrdersPage from './pages/cart/OrdersPage.jsx';
import OrderConfirmationPage from './pages/cart/OrderConfirmationPage.jsx';
import SettingsPage from './pages/accounts/SettingsPage.jsx';
import VendorDashboard from './pages/accounts/VendorDashboard.jsx';
import ManageRestaurantMenu from './pages/menus/ManageRestaurantMenu.jsx';
import VendorCategoriesPage from './pages/accounts/VendorCategoriesPage.jsx';
import CuisinesPage from './pages/restaurants/CuisinesPage.jsx';
import SocialDiningPage from './pages/social_dining/SocialDiningPage.jsx';
import ConnectionsPage from './pages/connections/ConnectionsPage.jsx';
import NotificationsPage from './pages/accounts/NotificationsPage.jsx';
import UserProfilePage from './pages/accounts/UserProfilePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import HomePage from './pages/HomePage.jsx';
import PostsPage from './pages/PostsPage.jsx';
// import './App.css';
import './assets/css/style.css'

import MainFooter from './components/MainFooter.jsx';
import MainHeader from './components/MainHeader.jsx';


// Context setup
const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api";
    const [restaurants, setRestaurants] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingConnectionRequests, setPendingConnectionRequests] = useState(0);
    const [notificationStreamVersion, setNotificationStreamVersion] = useState(0);

    // Restore user from token on mount
    useEffect(
        () => {
            const restoreUser = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) { setAuthLoading(false); return; }

            try {
                // Verify token and get user data
                const response = await axios.get(`${API_BASE_URL}/accounts/users/me/`, {
                headers: {
                    'Authorization': `Token ${token}`
                }
                });
                setUser(response.data);
            } catch (error) {
                console.error('Failed to restore user session:', error);
                // Only clear the token for explicit auth rejections (401/403).
                // Network errors or server-down (no response) should keep the token
                // so the user stays logged in once the server recovers.
                const status = error?.response?.status;
                if (status === 401 || status === 403) {
                    localStorage.removeItem('authToken');
                }
                setUser(null);
            } finally {
                setAuthLoading(false);
            }
            };

            restoreUser();
        }, [API_BASE_URL]
    );

    const fetchNotifications = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/social/notifications/`, {
                headers: { Authorization: `Token ${token}` },
            });
            const data = Array.isArray(response.data)
                ? response.data
                : (response.data?.results ?? []);
            setNotifications(data);
            setUnreadCount(data.filter((n) => !n.is_read).length);
        } catch {
            // Silently fail — notifications are non-critical
        }
    }, [API_BASE_URL]);

    const fetchConnectionRequestsSummary = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/social/follow/requests/`, {
                headers: { Authorization: `Token ${token}` },
            });
            const incoming = Array.isArray(response.data?.incoming) ? response.data.incoming : [];
            setPendingConnectionRequests(incoming.length);
        } catch {
            // Silently fail — badge will keep prior value
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            setPendingConnectionRequests(0);
            return;
        }

        fetchNotifications();
        fetchConnectionRequestsSummary();

        const token = localStorage.getItem('authToken');
        if (!token) {
            return undefined;
        }

        const streamUrl = `${API_BASE_URL}/social/notifications/stream/?token=${encodeURIComponent(token)}`;
        const eventSource = new EventSource(streamUrl);
        let reconnectTimer;
        let intentionalClose = false;

        eventSource.onmessage = () => {
            fetchNotifications();
            fetchConnectionRequestsSummary();
        };

        eventSource.onerror = () => {
            if (intentionalClose) return;
            eventSource.close();
            // Stream ended (server closed after max cycles) or network hiccup — reconnect silently
            reconnectTimer = window.setTimeout(() => {
                setNotificationStreamVersion((current) => current + 1);
            }, 3000);
        };

        return () => {
            intentionalClose = true;
            if (reconnectTimer) {
                window.clearTimeout(reconnectTimer);
            }
            eventSource.close();
        };
    }, [API_BASE_URL, fetchConnectionRequestsSummary, fetchNotifications, notificationStreamVersion, user]);

    // Simple toast helper; replace with a real toast component if available
    const showToast = (message, type = 'info') => {
        try {
        // If a global toast system exists, hook here
        if (window && window.dispatchEvent) {
            const evt = new CustomEvent('app:toast', { detail: { message, type } });
            window.dispatchEvent(evt);
        }
        } catch (_) {}
        // Fallback to alert for now
        if (type === 'error') {
        console.error(message);
        }
        // Avoid blocking UX with alert; log to console
        // console.log(`[${type}] ${message}`);
    };
    const value = {
        restaurants,
        setRestaurants,
        menuItems,
        setMenuItems,
        loading,
        setLoading,
        error,
        setError,
        user,
        setUser,
        authLoading,
        showToast,
        API_BASE_URL,
        notifications,
        unreadCount,
        pendingConnectionRequests,
        fetchNotifications,
        fetchConnectionRequestsSummary,
    };
    return (
        <AppContext.Provider value={value}>
        {children}
        </AppContext.Provider>
    );
};
AppProvider.propTypes = {
children: PropTypes.node.isRequired,
};

export const useApp = () => {
const ctx = useContext(AppContext);
if (!ctx) throw new Error('useApp must be used within an AppProvider');
return ctx;
};

// Optional: Floating cart button
const FloatingCartButton = () => {
    const { getCartItemCount } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const cartCount = getCartItemCount ? getCartItemCount() : 0;
    const hiddenOn = ['/cart', '/checkout', '/login', '/forgot-password'];
    if (hiddenOn.includes(location.pathname) || cartCount === 0) return null;
    return (
        <button className="btn btn-warning rounded-circle position-fixed shadow-lg floating-cart-btn"
            style={{ bottom: '2rem', right: '2rem', width: '60px', height: '60px', zIndex: 1000 }}
            onClick={() => navigate('/cart')}
            aria-label={`View cart with ${cartCount} items`}
        >
        <div className="position-relative">
            🛒
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {cartCount}
            </span>
        </div>
        </button>
    );
};

// Main App component with floating cart button and error boundary
class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch() { /* error captured */ }
    render() {
        if (this.state.hasError) {
        return (
            <div className="container py-5">
            <div className="alert alert-danger" role="alert">
                <h4 className="alert-heading">Unexpected Error</h4>
                <p>Something went wrong rendering the application.</p>
                <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
            </div>
            </div>
        );
        }
        return this.props.children;
    }
}

function App() {
    const location = useLocation();
    const mainRef = React.useRef(null);

    // Update document title based on route
    useEffect(() => {
        const path = location.pathname;
        const brand = 'The Restaurant';
        let title = brand;
        const last = decodeURIComponent(path.split('/').filter(Boolean).pop() || '');
        if (path === '/') title = `Home • ${brand}`;
        else if (path.startsWith('/restaurants/')) title = `Restaurant Details • ${brand}`;
        else if (path === '/restaurants') title = `Restaurants • ${brand}`;
        else if (path === '/menu') title = `Menu • ${brand}`;
        else if (path.startsWith('/menu-items/')) title = `Menu Item • ${brand}`;
        else if (path === '/cart') title = `Cart • ${brand}`;
        else if (path === '/checkout') title = `Checkout • ${brand}`;
        else if (path === '/login') title = `Login • ${brand}`;
        else if (path === '/forgot-password') title = `Forgot Password • ${brand}`;
        else if (path === '/cuisines') title = `Popular Cuisines • ${brand}`;
        else if (path.startsWith('/cuisines/')) title = `${last} • Cuisines • ${brand}`;
        else if (path === '/social-dining') title = `Social Dining • ${brand}`;
        else if (path === '/notifications') title = `Notifications • ${brand}`;
        else if (path.startsWith('/users/')) title = `User Profile • ${brand}`;
        document.title = title;
    }, [location.pathname]);

    // Move focus to main content on navigation for accessibility
    useEffect(
        () => {
            const el = mainRef.current;
            if (el) {
            setTimeout(() => {
                try { el.focus(); } catch (_) {}
            }, 0);
            }
        }, [location.pathname]
    );

    return (
        <AppErrorBoundary>
        <AppProvider>
            <CartProvider>
            <div className="App min-vh-100 bg-gold flex flex-column justify-between"
            >
                <MainHeader />
                <main id="main-content" 
                    ref={mainRef} 
                    tabIndex="-1" 
                    role="main" 
                    aria-label="Main content"
                >
                    <Routes
                    >
                        <Route path="/" 
                            element={<HomePage />} 
                        />

                        <Route path="/restaurants" 
                            element={<RestaurantsPage />} 
                        />

                        <Route path="/restaurants/:slug" 
                            element={<RestaurantDetailPage />} 
                        />
                        
                        <Route path="/restaurants/:slug/menu" 
                            element={<MenuPage />} 
                        />

                        <Route path="/menu" 
                            element={<MenuPage />} 
                        />

                        <Route path="/categories" 
                            element={<CategoriesPage />} 
                        />

                        <Route path="/categories/:slug" 
                            element={<CategoryDetailPage />} 
                        />

                        <Route path="/cuisines" 
                            element={<CuisinesPage />} 
                        />

                        <Route path="/cuisines/:slug" 
                            element={<RestaurantsPage />} 
                        />

                        <Route path="/social-dining" 
                            element={<SocialDiningPage />} 
                        />

                        <Route path="/connections" 
                            element={<ConnectionsPage />} 
                        />

                        <Route path="/notifications" 
                            element={<NotificationsPage />} 
                        />
                        <Route path="/users/:userId" 
                            element={<UserProfilePage />} 
                        />

                        <Route path="/menu-items/:slug" 
                            element={<MenuItemDetailPage />} 
                        />

                        <Route path="/cart" 
                            element={<CartPage />} 
                        />

                        <Route path="/checkout" 
                            element={<CheckoutPage />} 
                        />

                        <Route path="/login" 
                            element={<LoginPage />} 
                        />
                        <Route path="/forgot-password" 
                            element={<ForgotPasswordPage />} 
                        />

                        <Route path="/verify-email" 
                            element={<VerifyEmailPage />} 
                        />
                        
                        <Route path="/profile" 
                            element={<ProfilePage />} 
                        />
                        <Route path="/orders" 
                            element={<OrdersPage />} 
                        />

                        <Route path="/orders/confirmation/:orderId" 
                            element={<OrderConfirmationPage />} 
                        />

                        <Route path="/settings" 
                            element={<SettingsPage />} 
                        />

                        <Route path="/vendor/dashboard" 
                            element={<VendorDashboard />} 
                        />

                        <Route path="/vendor/menu-items" 
                            element={<ManageRestaurantMenu />} 
                        />

                        <Route path="/vendor/categories" 
                            element={<VendorCategoriesPage />} 
                        />

                        <Route path="/vendor/restaurants/:slug/menu" 
                            element={<ManageRestaurantMenu />} 
                        />

                        <Route path="/posts"
                            element={<PostsPage />}
                        />

                        <Route path="*" 
                            element={<NotFoundPage />} 
                        />
                        
                    </Routes>
                </main>
                <FloatingCartButton />
                <MainFooter />
            </div>
            </CartProvider>
        </AppProvider>
        </AppErrorBoundary>
    );
}

export default App;