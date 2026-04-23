import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useApp } from '../../App';
import {
  FaBell,
  FaUserCheck,
  FaUserPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarCheck,
  FaHeart,
  FaCommentDots,
  FaShare,
  FaStar
} from 'react-icons/fa';

const TYPE_LABELS = {
  new_connection: 'New Connection',
  connection_request_received: 'Connection Request',
  connection_request_accepted: 'Request Accepted',
  connection_request_declined: 'Request Declined',
  plan_joined: 'Plan Joined',
  post_liked: 'Post Liked',
  post_commented: 'Post Commented',
  post_shared: 'Post Shared',
  restaurant_liked: 'Restaurant Liked',
  restaurant_commented: 'Restaurant Commented',
  restaurant_reviewed: 'Restaurant Reviewed',
  menu_item_liked: 'Menu Item Liked',
  menu_item_commented: 'Menu Item Commented',
  menu_item_shared: 'Menu Item Shared',
};

const TYPE_ICONS = {
  new_connection: { icon: FaUserCheck, color: '#198754' },
  connection_request_received: { icon: FaUserPlus, color: '#f0ad4e' },
  connection_request_accepted: { icon: FaCheckCircle, color: '#198754' },
  connection_request_declined: { icon: FaTimesCircle, color: '#dc3545' },
  plan_joined: { icon: FaCalendarCheck, color: '#0d6efd' },
  post_liked: { icon: FaHeart, color: '#dc3545' },
  post_commented: { icon: FaCommentDots, color: '#0dcaf0' },
  post_shared: { icon: FaShare, color: '#6c757d' },
  restaurant_liked: { icon: FaHeart, color: '#dc3545' },
  restaurant_commented: { icon: FaCommentDots, color: '#0dcaf0' },
  restaurant_reviewed: { icon: FaStar, color: '#ffc107' },
  menu_item_liked: { icon: FaHeart, color: '#dc3545' },
  menu_item_commented: { icon: FaCommentDots, color: '#0dcaf0' },
  menu_item_shared: { icon: FaShare, color: '#6c757d' },
};

const FILTER_GROUPS = [
  { label: 'All', value: 'all' },
  { label: 'Connections', value: 'connections' },
  { label: 'Posts', value: 'posts' },
  { label: 'Restaurants', value: 'restaurants' },
  { label: 'Menu Items', value: 'menu_items' },
  { label: 'Unread', value: 'unread' },
];

const FILTER_TYPES = {
  connections: ['new_connection', 'connection_request_received', 'connection_request_accepted', 'connection_request_declined'],
  posts: ['post_liked', 'post_commented', 'post_shared'],
  restaurants: ['restaurant_liked', 'restaurant_commented', 'restaurant_reviewed', 'plan_joined'],
  menu_items: ['menu_item_liked', 'menu_item_commented', 'menu_item_shared'],
};

const NotificationsPage = () => {
  const {
    notifications,
    fetchNotifications,
    fetchConnectionRequestsSummary,
    API_BASE_URL,
    showToast,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState('all');

  const syncNotificationState = async () => {
    await Promise.all([fetchNotifications(), fetchConnectionRequestsSummary()]);
  };

  const token = () => localStorage.getItem('authToken');

  const getNotificationLink = (notification) => {
    if (notification.notification_type === 'plan_joined' && notification.data?.plan_id) {
      return { to: `/social-dining?plan=${encodeURIComponent(String(notification.data.plan_id))}`, label: 'View plan' };
    }
    if (['restaurant_liked', 'restaurant_commented', 'restaurant_reviewed'].includes(notification.notification_type) && notification.data?.restaurant_name) {
      return { to: `/restaurants/${encodeURIComponent(notification.data.restaurant_name.toLowerCase().replace(/\s+/g, '-'))}`, label: 'View restaurant' };
    }
    const userId = notification.data?.user_id || notification.sender?.id;
    if (userId) {
      return { to: `/users/${encodeURIComponent(String(userId))}`, label: 'View profile' };
    }
    return null;
  };

  const handleMarkRead = async (id) => {
    try {
      await axios.post(`${API_BASE_URL}/social/notifications/${id}/mark_read/`, {}, { headers: { Authorization: `Token ${token()}` } });
      await syncNotificationState();
    } catch {
      showToast('Could not update notification.', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/social/notifications/mark_all_read/`, {}, { headers: { Authorization: `Token ${token()}` } });
      await syncNotificationState();
    } catch {
      showToast('Could not update notifications.', 'error');
    }
  };

  const handleRequestAction = async (notification, action) => {
    try {
      await axios.post(
        `${API_BASE_URL}/social/follow/${action}_request/`,
        { request_id: notification.data?.request_id },
        { headers: { Authorization: `Token ${token()}` } }
      );
      await syncNotificationState();
      showToast(action === 'accept' ? 'Connection request accepted.' : 'Connection request declined.', action === 'accept' ? 'success' : 'info');
    } catch {
      showToast('Could not update connection request.', 'error');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !n.is_read;
    return (FILTER_TYPES[activeFilter] || []).includes(n.notification_type);
  });

  const totalUnread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="container container90">
      {/* Mobile top bar */}
      <div className="flex justify-between align-center mv2-00 bg-brown0 pa1-00 br0-25">
        <Link to="/connections" className="ba pa0-50 br0-25 flex items-center brown0">
          ← My Connections
        </Link>
        {totalUnread > 0 && (
          <button type="button" className="ba pa0-50 br0-25 bg-gold0 brown0 b pointer" onClick={handleMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>

      <div className="grid gtc12 relative ggap1-00 brown0 bg-white">
        {/* ── Sidebar ── */}
        <aside className="gc1s12 gc1s3-m">
          <div className="sticky top-4 pa1-0">
            {/* Stats card */}
            <div className="mb2-00 bg-brown0 br0-25 pa1-00">
              <h2 className="f1-25 gold0 mb1-00 bb pb0-50">Notifications</h2>
              <div className="grid ggap0-50" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f1-50 fw7 gold0">{notifications.length}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Total</div>
                </div>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f1-50 fw7 gold0">{totalUnread}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Unread</div>
                </div>
              </div>
            </div>

            {/* Desktop nav actions */}
            <div className="grid ggap0-50 mb2-00">
              <Link to="/connections" className="brown0 hover-gold0 pa0-25 ba b--brown0 br0-25 tc">
                👥 My Connections
              </Link>
              {totalUnread > 0 && (
                <button type="button" className="pa0-25 ba b--brown0 br0-25 pointer bg-brown0 gold0 b" onClick={handleMarkAllRead}>
                  ✓ Mark all read
                </button>
              )}
            </div>

            <div className="bg-light pv1-00 ph0-75 br0-25">
              <p className="bg-brown0 pa0-50 br0-25 mb0-50 f1-25 gold0 flex items-center justify-center">
                Sections
              </p>
              <p className="mb0-00 f0-85 brown0 tc">
                Switch between notification groups using the tabs on the right.
              </p>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="gc1s12 gc4s6-m">
          <div id="notifications-header" className="ba br0-25 shadow-4 ma0-50 mb2-00">
            <div className="flex bb" style={{ flexShrink: 0, flexWrap: 'wrap' }}>
              {FILTER_GROUPS.map(({ label, value }) => {
                const count = value === 'all'
                  ? notifications.length
                  : value === 'unread'
                  ? totalUnread
                  : notifications.filter((n) => (FILTER_TYPES[value] || []).includes(n.notification_type)).length;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveFilter(value)}
                    className={`pa0-75 pointer b f0-85 flex items-center ggap0-25 ${
                      activeFilter === value
                        ? 'bg-brown0 gold0 b--brown0'
                        : 'bg-transparent brown0 b--transparent'
                    }`}
                    style={activeFilter === value ? { borderBottom: '2px solid currentColor' } : { borderBottom: '2px solid transparent' }}
                  >
                    {label}
                    {count > 0 && (
                      <span
                        className={`ba pa0-25 br0-25 f0-75 b ${
                          activeFilter === value ? 'bg-transparent gold0 b--gold0' : 'bg-brown0 gold0 b--brown0'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pa0-75">
              <div className="flex items-center justify-between flex-wrap mb1-00" style={{ gap: '0.5rem' }}>
                <h5 className="flex items-center f1-25 mb0-00 brown0">
                  <FaBell className="mr0-50" aria-hidden="true" />
                  {FILTER_GROUPS.find((g) => g.value === activeFilter)?.label ?? 'Notifications'}
                </h5>
                {filteredNotifications.length > 0 && (
                  <span className="ba pa0-25 br0-25 bg-brown0 gold0 b--brown0 f0-75 b">
                    {filteredNotifications.length} item{filteredNotifications.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {filteredNotifications.length === 0 ? (
                <p className="brown0 f0-85 mb0-00">
                  {activeFilter === 'unread' ? 'No unread notifications.' : 'No notifications in this section.'}
                </p>
              ) : (
                <div className="flex flex-column" style={{ gap: '0.75rem' }}>
                  {filteredNotifications.map((notification) => {
                    const deepLink = getNotificationLink(notification);
                    const iconConfig = TYPE_ICONS[notification.notification_type] || { icon: FaBell, color: '#6c757d' };
                    const NotificationTypeIcon = iconConfig.icon;
                    const canRespondToRequest = (
                      notification.notification_type === 'connection_request_received'
                      && !notification.is_read
                      && notification.data?.request_id
                    );
                    return (
                      <div
                        key={notification.id}
                        className="br0-25 pa1-00"
                        style={{
                          background: notification.is_read ? '#fafafa' : '#fffbf2',
                          borderLeft: notification.is_read ? '3px solid transparent' : '3px solid #c8860a',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                        }}
                      >
                        <div className="flex items-start" style={{ gap: '0.75rem' }}>
                          <div className="pt-1" style={{ flexShrink: 0 }}>
                            <NotificationTypeIcon aria-hidden="true" style={{ color: iconConfig.color, fontSize: '1.1rem' }} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex justify-between align-center flex-wrap" style={{ gap: '0.25rem', marginBottom: '0.25rem' }}>
                              <div className="flex items-center" style={{ gap: '0.4rem' }}>
                                <span className="badge bg-secondary fw-normal" style={{ fontSize: '0.72rem' }}>
                                  {TYPE_LABELS[notification.notification_type] ?? notification.notification_type}
                                </span>
                                {!notification.is_read && (
                                  <span className="badge" style={{ background: '#c8860a', color: '#fff', fontSize: '0.68rem' }}>New</span>
                                )}
                              </div>
                              <small style={{ color: '#888', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                                {new Date(notification.created_at).toLocaleString()}
                              </small>
                            </div>

                            <p className="mb-0 mt-1" style={{ fontSize: '0.88rem' }}>{notification.message}</p>

                            {notification.sender && (
                              <small style={{ color: '#888', display: 'block', marginTop: '2px', fontSize: '0.75rem' }}>
                                From: {notification.sender.username}
                              </small>
                            )}

                            <div className="flex flex-wrap" style={{ gap: '0.4rem', marginTop: '0.6rem' }}>
                              {deepLink && (
                                <Link to={deepLink.to} className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 no-underline f0-80">
                                  {deepLink.label}
                                </Link>
                              )}
                              {canRespondToRequest && (
                                <>
                                  <button type="button" className="ba pa0-25 br0-25 bg-brown0 gold0 b--brown0 pointer b f0-80" onClick={() => handleRequestAction(notification, 'accept')}>
                                    Accept
                                  </button>
                                  <button type="button" className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer f0-80" onClick={() => handleRequestAction(notification, 'decline')}>
                                    Decline
                                  </button>
                                </>
                              )}
                              {!notification.is_read && !canRespondToRequest && (
                                <button type="button" className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer f0-80" onClick={() => handleMarkRead(notification.id)}>
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;

