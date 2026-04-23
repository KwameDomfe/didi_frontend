import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { useCart } from '../context/CartContext';
import UserInfoBlock from './UserInfoBlock';
import LogoutConfirmModal from './LogoutConfirmModal';
import { FaStore, FaListAlt, FaShoppingCart, FaUsers, FaUser, FaShoppingBag, FaBell, FaCalendarAlt, FaCog, FaSignOutAlt, FaSignInAlt, FaNewspaper } from 'react-icons/fa';

const NAV_LINKS = [
    {   to: '/restaurants',   
        label: 'Restaurants',   
        Icon: FaStore },
    {   to: '/menu',          
        label: 'Menu',           
        Icon: FaListAlt },
    {   to: '/posts',
        label: 'Posts',
        Icon: FaNewspaper,
        requiresAuth: true },
    {   to: '/cart',          
        label: 'Cart',           
        Icon: FaShoppingCart },
    { to: '/social-dining', 
        label: 'Social Dining',  
        Icon: FaUsers,
        requiresAuth: true },
];

const menuLinkClass = 'flex items-center gold0 tl no-underline mb0-50 b';
const menuLinkWithBadgeClass = `${menuLinkClass} justify-between`;
const menuButtonClass = 'flex items-center pa0-50 bg-black-50 ba bw1 br0-25 b--gold0 gold0';

const MobileMenu = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { getCartItemCount } = useCart();
    const { user, setUser, showToast, unreadCount, pendingConnectionRequests } = useApp();
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const pendingRequestCount = pendingConnectionRequests || 0;
    const cartCount = getCartItemCount ? getCartItemCount() : 0;

    const menuItems = [
        { key: 'profile',       
            label: 'My Profile',    
            Icon: FaUser,        
            to: '/profile' 
        },
        { key: 'orders',        
            label: 'My Orders',     
            Icon: FaShoppingBag, 
            to: '/orders' 
        },
        {   key: 'notifications', 
            label: 'Notifications', 
            Icon: FaBell,        
            to: '/notifications',
            badge: unreadCount > 0 
            ?   <span className="bg-black-50 w2-00 h1-25 b ba flex items-center justify-center tc gold0 f0-75 pa0-25 br1-00">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span> 
            :   null 
        },
        { key: 'connections',   
            label: 'My Connections',
            Icon: FaUsers,       
            to: '/connections',
          badge: pendingRequestCount > 0 ? <span className="bg-gold w1-50 h1-50 tc black f0-75 pa0-25 br1-00">{pendingRequestCount}</span> : null },
        { key: 'dining-plans',  
            label: 'Dining Plans',  
            Icon: FaCalendarAlt, to: '/social-dining' },
        { key: 'posts',
            label: 'My Posts',
            Icon: FaNewspaper,   to: '/posts?filter=mine' },
        { key: 'restaurants',   
            label: 'My Restaurants',
            Icon: FaStore,       to: '/vendor/dashboard',
          visible: user?.user_type === 'vendor' || user?.user_type === 'platform_admin' },
        { key: 'settings',      
            label: 'Settings',      
            Icon: FaCog,         to: '/settings' },
    ].filter(item => item.visible !== false);

    const closeOffcanvas = () => onClose();

    const confirmLogout = () => {
        localStorage.removeItem('authToken');
        setUser(null);
        showToast('Logged out successfully', 'success');
        setIsLogoutConfirmOpen(false);
        navigate('/');
        closeOffcanvas();
    };

    const handleLogout = () => {
        setIsLogoutConfirmOpen(true);
    };

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

    if (!isOpen) return null;

    return (
        <div className="dn-m pv2-00 vh-90"
        >
            <LogoutConfirmModal
                isOpen={isLogoutConfirmOpen}
                onCancel={() => setIsLogoutConfirmOpen(false)}
                onConfirm={confirmLogout}
            />
            <div
                className="
                    container container90 h-100
                    pa1-00 bg-gold0
                    "
                aria-labelledby="mobileMenuLabel"
            >
                <div className="flex flex-column justify-between ggap1-00 h-100">
                    {/* User Info Section */}
                    {
                        user && (
                            <div className="pa0-50 shadow-4 bg-brown0 br0-25"
                            >
                                <UserInfoBlock
                                    src={getProfileImageUrl()}
                                    name={getUserDisplayName()}
                                    email={user.email}
                                    initials={getUserInitials()}
                                    sizePx="3rem"
                                    marginClass=""
                                />
                            </div>
                        )
                    }

                    {/* Navigation Links */}
                    <ul className="flex flex-column 
                         pv1-00 ph1-00 bg-brown0 shadow-5 br0-25"
                    >
                        {
                            NAV_LINKS.filter(({ requiresAuth }) => !requiresAuth || user).map(
                                ({ to, label, Icon }) => (
                                    <li key={to} className=" mb0-50">
                                        <Link to={to} className="b"
                                            onClick={closeOffcanvas}
                                        >
                                            <div className="flex items-center justify-between white-90">
                                                <div><Icon className=" mr0-50 gold0" /> {label}</div>
                                                {to === '/cart' && cartCount > 0 && (
                                                    <span className="flex items-center justify-center bg-black-50 gold0 f0-75 pa0-25 w2-00 h1-25 tc br1-00 ml0-25 ba ">
                                                        {cartCount > 99 ? '99+' : cartCount}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    </li>
                                )
                            )
                        }
                    </ul>

                    {/* User Menu Items */}
                    {
                        user ? (
                            <div className="shadow-04 br0-25"
                            >
                                <ul className="pv1-00 bg-brown0 shadow-5 br0-25 pa1-00">
                                    {menuItems.map(({ key, label, Icon, to, badge }) => (
                                        <li key={key} className="mb0-50">
                                            <Link
                                                to={to}
                                                className={badge ? menuLinkWithBadgeClass : menuLinkClass}
                                                onClick={closeOffcanvas}
                                            >
                                                <span className="flex items-center white"><Icon className=" mr0-50 gold0" />{label}</span>
                                                {badge}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>

                                <div className="pa1-00 bg-brown0 shadow-5 br0-25 mt1-00">
                                    <button
                                        className={menuButtonClass}
                                        onClick={handleLogout}
                                    >
                                        <FaSignOutAlt className="mr0-50 gold0 " /> Logout
                                    </button>
                                </div>
                                
                            </div>
                        ) : (
                            <div className="flex bg-brown0 shadow-5 br0-25 pa1-00 ">
                                <Link 
                                to="/login" 
                                    className="b bg-black-80 gold0 pa0-50 br0-25 ba bw1 pointer"
                                onClick={closeOffcanvas}
                            >
                                <FaSignInAlt className="mr0-50 gold0"/> Login
                            </Link>
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
}

export default MobileMenu