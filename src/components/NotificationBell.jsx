import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { FaBell } from 'react-icons/fa';

const NotificationBell = () => {
    const { user, unreadCount } = useApp();

    if (!user) {
        return null;
    }

    return (
        <Link
            to="/notifications"
            className="flex flex-column items-center justify-center pa0-25 b"
            aria-label={
                unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : 'Notifications'
            }
        >
            <div className="mr0-50 grid">
                <FaBell size={16} className="gc1s2 gr1s2 mb0-50 gold0"/>
                {unreadCount > 0 && (
                    <div className="gc1s1 ml0-75 gr1s1
                        flex items-center justify-center 
                        w2-00 h1-25 
                        pa0-25 white-90 
                        bg-black-50 
                        f0-75 gold0
                        ba br2-00" 
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                
                )}
            </div>
            Notifications
        </Link>
    );
};

export default NotificationBell;
