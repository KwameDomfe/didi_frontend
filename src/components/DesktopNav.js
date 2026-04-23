import { useEffect, useRef, useState } from 'react';
import { FaStore, FaListAlt, FaShoppingCart, FaUsers, FaUser, FaShoppingBag, FaBell, FaCalendarAlt, FaCog, FaSignOutAlt, FaSignInAlt, FaNewspaper } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { useCart } from '../context/CartContext';
import NotificationBell from './NotificationBell';
import LogoutConfirmModal from './LogoutConfirmModal';
import UserAvatar from './UserAvatar';
import { canManageRestaurants } from '../utils/userRoles';
import UserInfoBlock from './UserInfoBlock';
import { GoTriangleDown, GoTriangleUp } from 'react-icons/go';

const NAV_LINKS = [
    { to: '/restaurants', label: 'Restaurants', Icon: FaStore },
    { to: '/menu', label: 'Menu', Icon: FaListAlt },
    { to: '/cart', label: 'Cart', Icon: FaShoppingCart },
    { to: '/posts', label: 'Posts', Icon: FaNewspaper, requiresAuth: true },
    { to: '/social-dining', label: 'Social Dining', Icon: FaUsers, requiresAuth: true },
];

const menuLinkClass = 'flex items-center w-100 tl pa0-50 black-90 no-underline hover-gold0 ';
const menuLinkWithBadgeClass = `${menuLinkClass} justify-between`;
const menuButtonClass = 'b bg-black-50 gold0 pa0-50 br0-25 ba bw1 b--gold0 pointer';

const DesktopNav = () => {
    const navigate = useNavigate();
    const { getCartItemCount } = useCart();
    const { user, setUser, showToast, unreadCount, pendingConnectionRequests } = useApp();
    const pendingRequestCount = pendingConnectionRequests || 0;
    const cartCount = getCartItemCount ? getCartItemCount() : 0;
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const userMenuRef = useRef(null);

    const confirmLogout = () => {
        localStorage.removeItem('authToken');
        setUser(null);
        showToast('Logged out successfully', 'success');
        setIsLogoutConfirmOpen(false);
        setIsUserMenuOpen(false);
        navigate('/');
    };

    const handleLogout = () => {
        setIsLogoutConfirmOpen(true);
    };

    const closeUserMenu = () => setIsUserMenuOpen(false);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const getProfileImageUrl = () => {
        if (!user?.profile_picture) return null;
        let url = user.profile_picture;
        if (url.startsWith('/media/')) url = `http://localhost:8000${url}`;
        return url;
    };

    const getUserInitials = () => {
        if (!user) return '';
        return (user.username || user.email || '').charAt(0).toUpperCase();
    };

    const getUserDisplayName = () => {
        if (!user) return '';
        return user.username || user.first_name || user.email?.split('@')[0] || 'User';
    };

    const menuItems = [
        {
            key: 'profile',
            label: 'My Profile',
            Icon: FaUser,
            to: '/profile',
        },
        {
            key: 'orders',
            label: 'My Orders',
            Icon: FaShoppingBag,
            to: '/orders',
        },
        {
            key: 'notifications',
            label: 'Notifications',
            Icon: FaBell,
            to: '/notifications',
            badge: unreadCount > 0 ? (
                <span className="flex items-center justify-center bg-black-50 gold0 ba f0-75 pa0-25 w2-00 h1-25 tc br1-00">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            ) : null,

            
        },
        {
            key: 'connections',
            label: 'My Connections',
            Icon: FaUsers,
            to: '/connections',
            badge: pendingRequestCount > 0 ? (
                <div className="bg-black-50 gold0 f0-75 pa0-25 ba w2-00 h1-25  b flex items-center justify-center tc br1-00">
                    {pendingRequestCount}
                </div>
            ) : null,
        },
        {
            key: 'posts',
            label: 'My Posts',
            Icon: FaNewspaper,
            to: '/posts?filter=mine',
        },
        {
            key: 'dining-plans',
            label: 'Dining Plans',
            Icon: FaCalendarAlt,
            to: '/social-dining',
        },
        {
            key: 'restaurants',
            label: 'My Restaurants',
            Icon: FaStore,
            to: '/vendor/dashboard',
            visible: canManageRestaurants(user),
        },
        {
            key: 'settings',
            label: 'Settings',
            Icon: FaCog,
            to: '/settings',
        },
    ].filter((item) => item.visible !== false);

    return (
        
        <div className="dn flex-m items-center">
            <LogoutConfirmModal
                isOpen={isLogoutConfirmOpen}
                onCancel={() => setIsLogoutConfirmOpen(false)}
                onConfirm={confirmLogout}
            />
            <ul className="flex"
            >
                {NAV_LINKS.filter(({ requiresAuth }) => !requiresAuth || user).map(({ to, label, Icon }) => (
                    <li key={to} className=" mr0-50">
                        <Link
                            to={to}
                            className="flex flex-column items-center justify-center 
                                pa0-25  
                                hover-gold0
                                br0-25"
                            aria-label={to === '/cart'
                                ? `Cart, ${cartCount} item${cartCount !== 1 ? 's' : ''}`
                                : label}
                        >
                            <div className="mr0-50 mb0-50 grid">
                                <Icon className="gc1s2 gr1s2 gold0 mb0-25" />
                                {to === '/cart' && cartCount > 0 && (
                                    <div
                                        className="gc2s1 gr1s1 flex items-center justify-center
                                            w2-00 h1-25
                                            ml1-00 
                                            gold0 b ba
                                            bg-black-60 f0-75 br2-00"
                                    >
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </div>
                                )}
                            </div>
                            <div className="b">{label}</div>
                        </Link>
                    </li>
                ))}
            </ul>
            {
                    user 
                ?   
                    (
                        <div className="flex items-center z-5">
                            <NotificationBell />
                            <div
                                id ="dropdown"
                                className="relative ml0-25"
                                ref={userMenuRef}
                            >
                                <button 
                                    className="bg-transparent b--none flex justify-center items-center pointer"
                                    type="button"
                                    id="userDropdown"
                                    aria-expanded={isUserMenuOpen}
                                    aria-controls="desktopUserMenu"
                                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                                >
                                    <UserAvatar
                                        src={getProfileImageUrl()}
                                        name={getUserDisplayName()}
                                        initials={getUserInitials()}
                                        sizePx="2.5rem"
                                        marginClass=""
                                        fallbackBg="bg-light"
                                        fallbackText="text-primary"
                                    />
                                    {isUserMenuOpen
                                        ? <GoTriangleUp className="gold0 ml0-25" />
                                        : <GoTriangleDown className="gold0 ml0-25" />
                                    }
                                </button>
                                {user && isUserMenuOpen && (
                                    <div
                                        id="desktopUserMenu"
                                        className="w16-00 
                                            absolute 
                                            mt2-00 right-0 
                                            pa0-50 shadow-5 
                                            bg-brown0 
                                            br0-50"
                                        
                                    >
                                        <ul aria-labelledby="userDropdown">
                                            <li className="bb b--light-gray pb0-50 mb0-50">
                                                <UserInfoBlock
                                                    src={getProfileImageUrl()}
                                                    name={getUserDisplayName()}
                                                    email={user.email}
                                                    initials={getUserInitials()}
                                                    sizePx="40px"
                                                    marginClass="mr0-50"
                                                />
                                            </li>
                                            {
                                                menuItems.map(
                                                    ({ key, label, Icon, to, badge }) => (
                                                        <li key={key}>
                                                            <Link
                                                                to={to}
                                                                className={badge ? menuLinkWithBadgeClass : menuLinkClass}
                                                                onClick={closeUserMenu}
                                                            >
                                                                <span className="flex items-center b white hover-gold0">
                                                                    <Icon className="mr0-50 gold0" />{label}
                                                                </span>
                                                                {badge}
                                                            </Link>
                                                        </li>
                                                    )
                                                )
                                            }
                                            <li className="bt b--light-gray mt0-50 pt0-50">
                                                <button
                                                    className={menuButtonClass}
                                                    onClick={handleLogout}
                                                >
                                                    <FaSignOutAlt className="mr0-50" />Logout
                                                </button>
                                            </li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                        </div>
                    ) 
                : 
                    (
                        <Link to="/login" 
                            className="b bg-black-50 gold0 pa0-50 br0-25 ba bw1"
                        >
                            <FaSignInAlt className="mr0-50" />Login
                        </Link>
                    )
            }
            
        </div> 
        
    )
}

export default DesktopNav