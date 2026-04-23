import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { FaLink, FaTrash, FaSignInAlt, FaUserPlus, FaCheck, FaClock } from 'react-icons/fa';
import { useApp } from '../../App';
import {
  connectWithUserInBackend,
  createPlanInBackend,
  deletePlanInBackend,
    getUserIdentity,
  joinPlanInBackend,
  leavePlanInBackend,
    loadSocialDiningState,
} from '../../utils/socialDiningData';

const normalizeArray = (data) => {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.results)) {
        return data.results;
    }

    return [];
};

const SocialDiningPage = () => {
    const location = useLocation();
    const {
        user,
        showToast,
        API_BASE_URL,
        restaurants,
        setRestaurants,
        menuItems,
        setMenuItems,
    } = useApp();

    const [plans, setPlans] = useState([]);
    const [connections, setConnections] = useState([]);
    const [socialDataSource, setSocialDataSource] = useState('backend');
    const [socialLoading, setSocialLoading] = useState(true);
    const [socialError, setSocialError] = useState(null);
    const [loadingDirectory, setLoadingDirectory] = useState(false);
    const [directoryError, setDirectoryError] = useState(null);
    const [filterRestaurantId, setFilterRestaurantId] = useState('');
    const [planView, setPlanView] = useState('all');
    const [formData, setFormData] = useState({
        title: '',
        restaurantId: '',
        menuItemId: '',
        scheduledFor: '',
        seats: 4,
        note: ''
    });

    const identity = useMemo(() => getUserIdentity(user), [user]);

    const reloadSocialState = useCallback(async () => {
      setSocialLoading(true);
      setSocialError(null);
      try {
        const state = await loadSocialDiningState({ API_BASE_URL, user });
        if (state.error === 'unauthenticated') {
          setSocialError('unauthenticated');
          setPlans([]);
          setConnections([]);
          setSocialDataSource('none');
          return state;
        }
        setPlans(state.plans);
        setConnections(state.connections);
        setSocialDataSource(state.source);
        return state;
      } catch (err) {
        const message = err?.response?.status === 401 || err?.response?.status === 403
          ? 'unauthenticated'
          : 'network';
        setSocialError(message);
        setPlans([]);
        setConnections([]);
        setSocialDataSource('none');
        return { plans: [], connections: [], source: 'none', error: message };
      } finally {
        setSocialLoading(false);
      }
    }, [API_BASE_URL, user]);

    useEffect(() => {
        let mounted = true;

        const loadState = async () => {
          await reloadSocialState();
          if (!mounted) {
            return;
          }
        };

        loadState();

        return () => {
          mounted = false;
        };
      }, [reloadSocialState]);

    useEffect(() => {
        if ((restaurants && restaurants.length > 0) && (menuItems && menuItems.length > 0)) {
        return;
        }

        let mounted = true;

        const loadDirectory = async () => {
        setLoadingDirectory(true);
        setDirectoryError(null);

        try {
            const [restaurantsResponse, menuResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/restaurants/`),
            axios.get(`${API_BASE_URL}/menu-items/`)
            ]);

            if (!mounted) {
            return;
            }

            setRestaurants(normalizeArray(restaurantsResponse.data));
            setMenuItems(normalizeArray(menuResponse.data));
        } catch {
            if (mounted) {
            setDirectoryError('Could not load restaurants and menus for social dining.');
            }
        } finally {
            if (mounted) {
            setLoadingDirectory(false);
            }
        }
        };

        loadDirectory();

        return () => {
        mounted = false;
        };
    }, [API_BASE_URL, menuItems, restaurants, setMenuItems, setRestaurants]);

    const restaurantsById = useMemo(() => {
        const map = new Map();
        (restaurants || []).forEach((restaurant) => {
        map.set(String(restaurant.id), restaurant);
        });
        return map;
    }, [restaurants]);

    const menuItemsById = useMemo(() => {
        const map = new Map();
        (menuItems || []).forEach((item) => {
        map.set(String(item.id), item);
        });
        return map;
    }, [menuItems]);

    const selectableMenuItems = useMemo(() => {
        if (!formData.restaurantId) {
        return [];
        }

        return (menuItems || [])
        .filter((item) => String(item.restaurant) === String(formData.restaurantId))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
        .slice(0, 200);
    }, [formData.restaurantId, menuItems]);

    const filteredPlans = useMemo(() => {
        const list = [...plans].sort((a, b) => {
        const left = new Date(a.scheduledFor || a.createdAt || 0).getTime();
        const right = new Date(b.scheduledFor || b.createdAt || 0).getTime();
        return left - right;
        });

        const now = Date.now();

        return list.filter((plan) => {
        if (filterRestaurantId && String(plan.restaurantId) !== String(filterRestaurantId)) {
            return false;
        }

        if (planView === 'upcoming') {
            return new Date(plan.scheduledFor || plan.createdAt || 0).getTime() >= now;
        }

        if (planView === 'mine') {
            return identity?.id ? plan.hostId === identity.id : false;
        }

        if (planView === 'joined') {
            return identity?.id
            ? (plan.attendees || []).some((attendee) => attendee.id === identity.id)
            : false;
        }

        return true;
        });
    }, [plans, filterRestaurantId, planView, identity?.id]);

    const highlightedPlanId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('plan');
    }, [location.search]);

  const pendingConnectionsCount = useMemo(
    () => connections.filter((entry) => entry?.isPending).length,
    [connections]
  );

  const savePlansLocal = (nextPlans) => {
    setPlans(nextPlans);
    window.dispatchEvent(new CustomEvent('socialDining:plansUpdated', {
      detail: { totalPlans: nextPlans.length }
    }));
  };

  const saveConnectionsLocal = (nextConnections) => {
    if (!identity?.id) {
      return;
    }

    setConnections(nextConnections);
    window.dispatchEvent(new CustomEvent('socialDining:connectionsUpdated', {
      detail: { userId: identity.id, totalConnections: nextConnections.length }
    }));
  };

  const handleCreatePlan = async (event) => {
    event.preventDefault();

    if (!identity) {
      showToast('Log in to create social dining plans.', 'info');
      return;
    }

    if (!formData.restaurantId || !formData.title.trim() || !formData.scheduledFor) {
      showToast('Please fill title, restaurant, and schedule.', 'error');
      return;
    }

    const restaurant = restaurantsById.get(String(formData.restaurantId));
    const selectedMenuItem = selectableMenuItems.find((item) => String(item.id) === String(formData.menuItemId));

    const nextPlan = {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: formData.title.trim(),
      restaurantId: String(formData.restaurantId),
      restaurantName: restaurant?.name || 'Restaurant',
      restaurantSlug: restaurant?.slug || null,
      menuItemId: formData.menuItemId ? String(formData.menuItemId) : null,
      menuItemName: selectedMenuItem?.name || null,
      menuItemSlug: selectedMenuItem?.slug || null,
      scheduledFor: formData.scheduledFor,
      seats: Math.max(2, Number(formData.seats) || 2),
      note: formData.note.trim(),
      hostId: identity.id,
      hostName: identity.name,
      attendees: [{ id: identity.id, name: identity.name }],
      createdAt: new Date().toISOString(),
    };

    try {
      await createPlanInBackend({ API_BASE_URL, planInput: nextPlan });
      await reloadSocialState();
    } catch {
      const nextPlans = [nextPlan, ...plans];
      savePlansLocal(nextPlans);
    }

    setFormData({
      title: '',
      restaurantId: '',
      menuItemId: '',
      scheduledFor: '',
      seats: 4,
      note: ''
    });

    showToast('Social dining plan created!', 'success');
  };

  const handleJoinPlan = async (planId) => {
    if (!identity) {
      showToast('Log in to join dining plans.', 'info');
      return;
    }

    try {
      await joinPlanInBackend({ API_BASE_URL, planId });
      await reloadSocialState();
      return;
    } catch {
      // Local fallback keeps social flow available offline or when backend actions are unavailable.
    }

    const nextPlans = plans.map((plan) => {
      if (plan.id !== planId) {
        return plan;
      }

      const attendees = Array.isArray(plan.attendees) ? plan.attendees : [];
      const alreadyJoined = attendees.some((attendee) => attendee.id === identity.id);
      if (alreadyJoined) {
        return plan;
      }

      if (attendees.length >= Number(plan.seats || 0)) {
        showToast('This dining plan is full.', 'error');
        return plan;
      }

      return {
        ...plan,
        attendees: [...attendees, { id: identity.id, name: identity.name }],
      };
    });

    savePlansLocal(nextPlans);
  };

  const handleLeavePlan = async (planId) => {
    if (!identity) {
      return;
    }

    try {
      await leavePlanInBackend({ API_BASE_URL, planId });
      await reloadSocialState();
      return;
    } catch {
      // Local fallback keeps social flow available offline or when backend actions are unavailable.
    }

    const nextPlans = plans
      .map((plan) => {
        if (plan.id !== planId) {
          return plan;
        }

        if (plan.hostId === identity.id) {
          return null;
        }

        return {
          ...plan,
          attendees: (plan.attendees || []).filter((attendee) => attendee.id !== identity.id),
        };
      })
      .filter(Boolean);

    savePlansLocal(nextPlans);
  };

  const handleConnect = async (targetUser) => {
    if (!identity?.id || !targetUser?.id || targetUser.id === identity.id) {
      return;
    }

    const alreadyConnected = connections.some((entry) => String(entry.id) === String(targetUser.id));
    if (alreadyConnected) {
      return;
    }

    try {
      const backendConnection = await connectWithUserInBackend({ API_BASE_URL, targetUserId: targetUser.id });
      await reloadSocialState();

      if (backendConnection?.isPending) {
        showToast(`Connection request sent to ${targetUser.name}.`, 'info');
      } else {
        showToast(`You connected with ${targetUser.name}.`, 'success');
      }
      return;
    } catch {
      // Local fallback keeps social flow available offline or when backend actions are unavailable.
    }

    const nextConnections = [...connections, { id: targetUser.id, name: targetUser.name }];
    saveConnectionsLocal(nextConnections);
    showToast(`You connected with ${targetUser.name}.`, 'success');
  };

  const handleDeletePlan = async (planId) => {
    if (!identity?.id) {
      return;
    }

    const plan = plans.find((entry) => entry.id === planId);
    if (!plan || plan.hostId !== identity.id) {
      return;
    }

    const shouldDelete = window.confirm(`Delete plan "${plan.title}"? This cannot be undone.`);
    if (!shouldDelete) {
      return;
    }

    try {
      await deletePlanInBackend({ API_BASE_URL, planId });
      await reloadSocialState();
      showToast('Dining plan deleted.', 'success');
      return;
    } catch {
      // Local fallback keeps social flow available offline or when backend actions are unavailable.
    }

    const nextPlans = plans.filter((entry) => entry.id !== planId);
    savePlansLocal(nextPlans);
    showToast('Dining plan deleted.', 'success');
  };

  const handleCopyInviteLink = async (planId) => {
    const inviteUrl = `${window.location.origin}/social-dining?plan=${encodeURIComponent(planId)}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        const field = document.createElement('textarea');
        field.value = inviteUrl;
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        document.body.removeChild(field);
      }
      showToast('Invite link copied.', 'success');
    } catch {
      showToast('Unable to copy invite link.', 'error');
    }
  };

  const resolveRestaurantLink = (plan) => {
    if (plan.restaurantSlug) {
      return `/restaurants/${plan.restaurantSlug}`;
    }

    const restaurant = restaurantsById.get(String(plan.restaurantId));
    if (restaurant?.slug) {
      return `/restaurants/${restaurant.slug}`;
    }

    return '/restaurants';
  };

  const resolveRestaurantMenuLink = (plan) => {
    if (plan.restaurantSlug) {
      return `/restaurants/${plan.restaurantSlug}/menu`;
    }

    const restaurant = restaurantsById.get(String(plan.restaurantId));
    if (restaurant?.slug) {
      return `/restaurants/${restaurant.slug}/menu`;
    }

    return '/menu';
  };

  const resolveMenuItemLink = (plan) => {
    if (plan.menuItemSlug) {
      return `/menu-items/${plan.menuItemSlug}`;
    }

    const item = plan.menuItemId ? menuItemsById.get(String(plan.menuItemId)) : null;
    if (item?.slug) {
      return `/menu-items/${item.slug}`;
    }

    return '/menu';
  };

  return (
    <div className="container container90">
        {/* Page header */}
        <div className="flex justify-between items-start mb2-00">
                <div>
                <div>
                </div><h1 className="f1-75 bg-brown0 mb0-25">Social Dining</h1>
                <p className="brown0 f0-85 mb0-25">Build dining connections around restaurants and menu discoveries.</p>
                <p className="f0-75 brown0 mb0-00" style={{ opacity: 0.7 }}>
                    Data source: {socialDataSource === 'backend' ? 'database' : socialDataSource}.
                </p>
                {pendingConnectionsCount > 0 && (
                    <p className="f0-85 gold1 mb0-00">
                    You have {pendingConnectionsCount} pending connection request{pendingConnectionsCount === 1 ? '' : 's'}.
                    </p>
                )}
                </div>
                {!identity && (
                <Link to="/login" className="ba pa0-50 br0-25 bg-brown0 gold0 b--brown0 no-underline b">
                    Log in to connect
                </Link>
                )}
        </div>

        {/* Status banners */}
        {socialLoading && (
            <div className="ba br0-25 pa0-75 mb1-50 bg-gold5 brown0 f0-85" role="status">
            Loading social dining data from database&hellip;
            </div>
        )}
        {!socialLoading && socialError === 'unauthenticated' && (
            <div className="ba br0-25 pa0-75 mb1-50 bg-gold5 brown0 f0-85" role="alert">
            You must be <Link to="/login" className="b brown0">logged in</Link> to view social dining plans and connections.
            </div>
        )}
        {!socialLoading && socialError === 'network' && (
            <div className="ba br0-25 pa0-75 mb1-50 bg-gold5 brown0 flex items-center ggap0-75 f0-85" role="alert">
            <span>Could not reach the database. Check your connection and{' '}</span>
            <button type="button" className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer f0-85" onClick={reloadSocialState}>retry</button>.
            </div>
        )}
        {directoryError && (
            <div className="ba br0-25 pa0-75 mb1-50 bg-gold5 brown0 f0-85" role="alert">
            {directoryError}
            </div>
        )}

        {!socialLoading && !socialError && (
            <div className="grid gtc1 gtc3-m ggap1-00">

            {/* ── Main column: create + plans ── */}
            <section id="plans" className="gc1s1 gc1s2-m flex flex-column ggap1-50">

                {/* Create plan card */}
                <div className="ba br0-25 shadow-4">
                    <header className="pa0-75 bg-brown0 gold0" style={{ borderRadius: '0.25rem 0.25rem 0 0' }}>
                        <h5 className="f1-00 gold0 mb0-25">Create Dining Plan</h5>
                        <p className="f0-75 gold0 mb0-00" 
                        style={{ opacity: 0.85 }}>Host a meal meetup tied to a restaurant and optional menu item.</p>
                    </header>
                    <form className="pa0-75 brown0" onSubmit={handleCreatePlan}>
                        <div className="mb0-75">
                        <label className="b db mb0-25 f0-85">Plan Title</label>
                        <input
                            type="text"
                            className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                            value={formData.title}
                            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                            placeholder="Friday tasting crew"
                            required
                        />
                        </div>
                        <div className="mb0-75">
                        <label className="b db mb0-25 f0-85">Restaurant</label>
                        <select
                            className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                            value={formData.restaurantId}
                            onChange={(e) => setFormData((p) => ({ ...p, restaurantId: e.target.value, menuItemId: '' }))}
                            required
                        >
                            <option value="">Choose restaurant</option>
                            {(restaurants || []).map((r) => (
                            <option key={r.id} value={String(r.id)}>{r.name}</option>
                            ))}
                        </select>
                        </div>
                        <div className="mb0-75">
                        <label className="b db mb0-25 f0-85">Featured Menu Item <span className="normal">(Optional)</span></label>
                        <select
                            className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                            value={formData.menuItemId}
                            onChange={(e) => setFormData((p) => ({ ...p, menuItemId: e.target.value }))}
                            disabled={!formData.restaurantId}
                        >
                            <option value="">No specific dish</option>
                            {selectableMenuItems.map((item) => (
                            <option key={item.id} value={String(item.id)}>{item.name}</option>
                            ))}
                        </select>
                        </div>
                        <div className="grid gtc2-m ggap0-75 mb0-75">
                        <div>
                            <label className="b db mb0-25 f0-85">Date &amp; Time</label>
                            <input
                            type="datetime-local"
                            className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                            value={formData.scheduledFor}
                            onChange={(e) => setFormData((p) => ({ ...p, scheduledFor: e.target.value }))}
                            required
                            />
                        </div>
                        <div>
                            <label className="b db mb0-25 f0-85">Seats</label>
                            <input
                            type="number" min="2" max="12"
                            className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                            value={formData.seats}
                            onChange={(e) => setFormData((p) => ({ ...p, seats: e.target.value }))}
                            />
                        </div>
                        </div>
                        <div className="mb0-75">
                        <label className="b db mb0-25 f0-85">Dining Note</label>
                        <textarea
                            className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                            rows="2"
                            value={formData.note}
                            onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                            placeholder="Let us try the new tasting menu and share reviews."
                            style={{ resize: 'vertical' }}
                        />
                        </div>
                        <button
                        type="submit"
                        className="ba pa0-50 br0-25 bg-brown0 gold0 b--brown0 pointer b"
                        disabled={!identity || loadingDirectory}
                        style={(!identity || loadingDirectory) ? { opacity: 0.5 } : undefined}
                        >
                        Create Plan
                        </button>
                    </form>
                </div>

                {/* Open plans card */}
                <div className="ba br0-25 shadow-4">
                    <header className="pa0-75 bg-brown0 gold0" style={{ borderRadius: '0.25rem 0.25rem 0 0' }}>
                        <div className="flex justify-between items-center">
                        <h5 className="f1-00 gold0 mb0-00">Open Dining Plans</h5>
                        <div className="flex ggap0-50 items-center">
                            <select
                            className="ba br0-25 b--gold0 bg-transparent gold0 pa0-25 f0-80"
                            style={{ maxWidth: '180px' }}
                            value={filterRestaurantId}
                            onChange={(e) => setFilterRestaurantId(e.target.value)}
                            >
                            <option value="">All restaurants</option>
                            {(restaurants || []).map((r) => (
                                <option key={r.id} value={String(r.id)}>{r.name}</option>
                            ))}
                            </select>
                            <button
                            type="button"
                            className="ba pa0-25 br0-25 bg-transparent gold0 b--gold0 pointer f0-80"
                            onClick={() => { setFilterRestaurantId(''); setPlanView('all'); }}
                            >
                            Reset
                            </button>
                        </div>
                        </div>
                    </header>

                    <div className="pa0-75">
                        {/* View filter tabs */}
                        <div className="flex ggap0-50 mb1-00">
                        {['all', 'upcoming', 'mine', 'joined'].map((view) => (
                            <button
                            key={view}
                            type="button"
                            className={`ba pa0-25 br0-25 pointer f0-85 b${planView === view ? ' bg-brown0 gold0 b--brown0' : ' bg-transparent brown0 b--brown0'}`}
                            onClick={() => setPlanView(view)}
                            disabled={(view === 'mine' || view === 'joined') && !identity}
                            style={(view === 'mine' || view === 'joined') && !identity ? { opacity: 0.4 } : undefined}
                            >
                            {view.charAt(0).toUpperCase() + view.slice(1)}
                            </button>
                        ))}
                        </div>

                        {filteredPlans.length === 0 ? (
                        <p className="brown0 f0-85">No dining plans yet. Start the first one.</p>
                        ) : (
                        <div className="flex flex-column ggap0-75">
                            {filteredPlans.map((plan) => {
                            const attendees = Array.isArray(plan.attendees) ? plan.attendees : [];
                            const isHost = identity?.id === plan.hostId;
                            const isJoined = attendees.some((a) => a.id === identity?.id);
                            const isFull = attendees.length >= Number(plan.seats || 0);
                            const canConnectHost = identity && plan.hostId !== identity.id;
                            const hostConnectionEntry = canConnectHost
                                ? connections.find((c) => String(c.id) === String(plan.hostId))
                                : null;
                            const hostConnected = Boolean(hostConnectionEntry && !hostConnectionEntry.isPending);
                            const hostPending = Boolean(hostConnectionEntry && hostConnectionEntry.isPending);
                            const isHighlighted = highlightedPlanId && highlightedPlanId === plan.id;
                            const restaurantLink = resolveRestaurantLink(plan);
                            const restaurantMenuLink = resolveRestaurantMenuLink(plan);
                            const menuItemLink = resolveMenuItemLink(plan);

                            return (
                                <div
                                key={plan.id}
                                className={`ba br0-25 pa0-75 bg-white brown0${isHighlighted ? ' shadow-4' : ''}`}
                                style={isHighlighted ? { borderColor: 'var(--brown0, #5c3d1e)' } : undefined}
                                >
                                <div className="flex justify-between items-start mb0-50">
                                    <div>
                                    <div className="b f0-95">{plan.title}</div>
                                    <div className="f0-80" style={{ opacity: 0.7 }}>{plan.restaurantName}</div>
                                    {plan.menuItemName && (
                                        <div className="f0-80" style={{ opacity: 0.7 }}>Menu focus: {plan.menuItemName}</div>
                                    )}
                                    <div className="f0-80" style={{ opacity: 0.7 }}>
                                        {new Date(plan.scheduledFor).toLocaleString()} | {attendees.length}/{plan.seats} seats
                                    </div>
                                    </div>
                                    <div className="f0-80 tr" style={{ opacity: 0.7 }}>Host: {plan.hostName}</div>
                                </div>

                                {plan.note && (
                                    <p className="f0-82 mb0-50" style={{ opacity: 0.85 }}>{plan.note}</p>
                                )}

                                <div className="f0-80 mb0-50" style={{ opacity: 0.7 }}>
                                    Attendees: {attendees.map((a) => a.name).join(', ') || 'None'}
                                </div>

                                {/* Links row */}
                                <div className="flex flex-wrap ggap0-50 mb0-50">
                                    <Link to={restaurantLink} className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 no-underline f0-82">View restaurant</Link>
                                    <Link to={restaurantMenuLink} className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 no-underline f0-82">Open menu</Link>
                                    {plan.menuItemName && (
                                    <Link to={menuItemLink} className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 no-underline f0-82">Featured dish</Link>
                                    )}
                                    <button
                                    type="button"
                                    className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer flex items-center ggap0-25 f0-82"
                                    onClick={() => handleCopyInviteLink(plan.id)}
                                    >
                                    <FaLink /> Copy invite
                                    </button>
                                </div>

                                {/* Action row */}
                                <div className="flex flex-wrap ggap0-50">
                                    {!identity && (
                                    <Link to="/login" className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 no-underline flex items-center ggap0-25 f0-82">
                                        <FaSignInAlt /> Log in to join
                                    </Link>
                                    )}
                                    {identity && !isHost && !isJoined && (
                                    <button
                                        type="button"
                                        className="ba pa0-25 br0-25 bg-brown0 gold0 b--brown0 pointer b f0-82"
                                        onClick={() => handleJoinPlan(plan.id)}
                                        disabled={isFull}
                                        style={isFull ? { opacity: 0.5 } : undefined}
                                    >
                                        {isFull ? 'Plan full' : 'Join plan'}
                                    </button>
                                    )}
                                    {identity && !isHost && isJoined && (
                                    <button
                                        type="button"
                                        className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer f0-82"
                                        onClick={() => handleLeavePlan(plan.id)}
                                    >
                                        Leave plan
                                    </button>
                                    )}
                                    {isHost && (
                                    <>
                                        <span className="ba pa0-25 br0-25 bg-brown0 gold0 b--brown0 f0-80">You host this plan</span>
                                        <button
                                        type="button"
                                        className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer flex items-center ggap0-25 f0-82"
                                        onClick={() => handleDeletePlan(plan.id)}
                                        >
                                        <FaTrash /> Delete plan
                                        </button>
                                    </>
                                    )}
                                    {canConnectHost && !hostConnected && !hostPending && (
                                    <button
                                        type="button"
                                        className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer flex items-center ggap0-25 f0-82"
                                        onClick={() => handleConnect({ id: plan.hostId, name: plan.hostName })}
                                    >
                                        <FaUserPlus /> Connect with host
                                    </button>
                                    )}
                                    {canConnectHost && hostConnected && (
                                    <span className="ba pa0-25 br0-25 bg-brown0 gold0 b--brown0 flex items-center ggap0-25 f0-80">
                                        <FaCheck /> Connected
                                    </span>
                                    )}
                                    {canConnectHost && hostPending && (
                                    <span className="ba pa0-25 br0-25 bg-gold5 brown0 b--brown0 flex items-center ggap0-25 f0-80">
                                        <FaClock /> Request pending
                                    </span>
                                    )}
                                </div>
                                </div>
                            );
                            })}
                        </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Sidebar ── */}
            <aside className="gc1s1 flex flex-column ggap1-00">
                <div className="ba br0-25 shadow-4">
                    <header className="pa0-75 bg-brown0 gold0" style={{ borderRadius: '0.25rem 0.25rem 0 0' }}>
                        <h6 className="f0-90 gold0 mb0-00">Social Snapshot</h6>
                    </header>
                    <div className="pa0-75 brown0">
                        <div className="f0-85 mb0-25">Open plans: {plans.length}</div>
                        <div className="f0-85 mb0-25">My connections: {connections.length}</div>
                        <div className="f0-85 mb0-25">Filtered view: {planView}</div>
                        <div className="f0-85 mb0-25">Data source: {socialDataSource}</div>
                        <div className="f0-85">Focus: restaurants + menus + shared dining.</div>
                    </div>
                </div>

                <div className="ba br0-25 shadow-4">
                    <header className="pa0-75 bg-brown0 gold0" style={{ borderRadius: '0.25rem 0.25rem 0 0' }}>
                        <h6 className="f0-90 gold0 mb0-00">My Dining Connections</h6>
                    </header>
                    <div className="pa0-75 brown0">
                        <p className="f0-85 mb1-00">
                        {connections.length} mutual connection{connections.length === 1 ? '' : 's'}
                        </p>
                        <Link to="/connections" className="w-100 db tc pa0-50 br0-25 ba b--brown0 bg-transparent brown0 no-underline b f0-85">
                        Manage connections
                        </Link>
                    </div>
                </div>
            </aside>

            </div>
            )
        }
    </div>
  );
};

export default SocialDiningPage;
