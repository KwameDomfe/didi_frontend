import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { canManageRestaurants } from '../utils/userRoles';

const QUICK_LINKS = [
    { to: '/restaurants', label: 'Restaurants' },
    { to: '/menu', label: 'Menu' },
    { to: '/cart', label: 'Cart' },
    { to: '/social-dining', label: 'Social Dining' },
];

const AUTH_LINKS = [
    { to: '/orders', label: 'Orders' },
    { to: '/profile', label: 'Profile' },
    { to: '/settings', label: 'Settings' },
];

const GUEST_LINKS = [
    { to: '/login', label: 'Login' },
];

const VENDOR_LINKS = [
    { to: '/vendor/dashboard', label: 'Vendor Dashboard' },
];

const MainFooter = () => {
    const { user } = useApp();
    const currentYear = new Date().getFullYear();
    const isVendorOrAdmin = canManageRestaurants(user);

    const quickLinks = [
        ...QUICK_LINKS,
        ...(user ? AUTH_LINKS : GUEST_LINKS),
        ...(isVendorOrAdmin ? VENDOR_LINKS : []),
    ];

    return (
        <footer className="bg-brown0 white pv1-00">
            <div className="container container90 ph1-00 pv0-50 bg-white-10 br0-25">
                <div className="tc">
                    <p className="f0-75 tracked ttu white-80 mb0-25">Powered by</p>
                    <a
                        href="https://www.kdadesign.tech"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gold no-underline hover-white fw6"
                    >
                        kda design technologies
                    </a>

                    <div className="bt b--white-10 w-100 mt0-50 pt0-50">
                        <div className="flex justify-center flex-wrap" style={{ gap: '0.75rem' }}>
                            {quickLinks.map(({ to, label }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className="gold0 no-underline hover-gold f0-75"
                                >
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <p className="white-80 f0-75 mt0-50 mb0-00">
                        &copy; {currentYear} The Restaurant
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default MainFooter;