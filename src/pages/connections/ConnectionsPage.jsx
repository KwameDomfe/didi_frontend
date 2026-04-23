import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../../App';
import {
  acceptConnectionRequestInBackend,
  connectWithUserInBackend,
  declineConnectionRequestInBackend,
  disconnectUserInBackend,
  getUserIdentity,
  loadSocialDiningState,
} from '../../utils/socialDiningData';

const ConnectionsPage = () => {
  const { user, showToast, API_BASE_URL } = useApp();

  const [plans, setPlans] = useState([]);
  const [connections, setConnections] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [socialDataSource, setSocialDataSource] = useState('backend');
  const [socialLoading, setSocialLoading] = useState(true);
  const [socialError, setSocialError] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [connectingIds, setConnectingIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('suggestions');

  const identity = useMemo(() => getUserIdentity(user), [user]);
  const incomingRequests = requests?.incoming || [];
  const outgoingRequests = requests?.outgoing || [];

  const reloadState = useCallback(async () => {
    setSocialLoading(true);
    setSocialError(null);
    try {
      const state = await loadSocialDiningState({ API_BASE_URL, user });
      if (state.error === 'unauthenticated') {
        setSocialError('unauthenticated');
        setPlans([]);
        setConnections([]);
        setRequests({ incoming: [], outgoing: [] });
        setSocialDataSource('none');
        return;
      }
      setPlans(state.plans);
      setConnections(state.connections);
      setRequests(state.requests || { incoming: [], outgoing: [] });
      setSocialDataSource(state.source);
    } catch (err) {
      const message =
        err?.response?.status === 401 || err?.response?.status === 403
          ? 'unauthenticated'
          : 'network';
      setSocialError(message);
      setPlans([]);
      setConnections([]);
      setRequests({ incoming: [], outgoing: [] });
      setSocialDataSource('none');
    } finally {
      setSocialLoading(false);
    }
  }, [API_BASE_URL, user]);

  const loadSuggestions = useCallback(async (currentConnections, currentRequests) => {
    const token = localStorage.getItem('authToken');
    if (!token || !identity?.id) return;
    setSuggestionsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/accounts/users/`, {
        headers: { Authorization: `Token ${token}` },
      });
      const allUsers = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];

      const excludedIds = new Set([
        String(identity.id),
        ...(currentConnections || []).map(c => String(c.id)),
        ...(currentRequests?.incoming || []).map(r => String(r.userId)),
        ...(currentRequests?.outgoing || []).map(r => String(r.userId)),
      ]);

      setSuggestions(
        allUsers
          .filter(u => !excludedIds.has(String(u.id)))
          .map(u => ({
            id: String(u.id),
            name: String(
              u.username
              || `${u.first_name || ''} ${u.last_name || ''}`.trim()
              || u.email
              || 'User'
            ).trim(),
            profilePicture: u.profile_picture || null,
          }))
      );
    } catch {
      // silently skip — suggestions are non-critical
    } finally {
      setSuggestionsLoading(false);
    }
  }, [API_BASE_URL, identity?.id]);

  useEffect(() => {
    let mounted = true;
    reloadState().then(() => {
      if (!mounted) {
        return;
      }
    });
    return () => {
      mounted = false;
    };
  }, [reloadState]);

  useEffect(() => {
    if (!socialLoading && !socialError && identity) {
      loadSuggestions(connections, requests);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socialLoading, socialError, identity?.id]);

  const connectionsWithStats = useMemo(() => {
    if (!identity?.id || connections.length === 0) {
      return [];
    }

    return connections
      .map((entry) => {
        const sharedPlans = plans.filter((plan) => {
          const attendeeIds = (plan.attendees || []).map((attendee) => String(attendee.id));
          return (
            attendeeIds.includes(String(identity.id)) &&
            attendeeIds.includes(String(entry.id))
          );
        }).length;

        return { ...entry, sharedPlans };
      })
      .sort((a, b) => b.sharedPlans - a.sharedPlans || a.name.localeCompare(b.name));
  }, [connections, identity?.id, plans]);

  const handleConnect = async (suggestion) => {
    if (connectingIds.has(suggestion.id)) return;
    setConnectingIds(prev => new Set(prev).add(suggestion.id));
    try {
      await connectWithUserInBackend({ API_BASE_URL, targetUserId: suggestion.id });
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      showToast(`Connection request sent to ${suggestion.name}.`, 'success');
      reloadState();
    } catch {
      showToast('Could not send connection request.', 'error');
    } finally {
      setConnectingIds(prev => { const next = new Set(prev); next.delete(suggestion.id); return next; });
    }
  };

  const handleDisconnect = async (connection) => {
    if (!identity?.id) {
      return;
    }

    const targetUserId = connection?.id;
    const connectionId = connection?.connectionId;

    try {
      await disconnectUserInBackend({ API_BASE_URL, connectionId, targetUserId });
      await reloadState();
      showToast(`Removed connection with ${connection.name}.`, 'success');
    } catch {
      showToast('Could not remove connection.', 'error');
    }
  };

  const handleAcceptRequest = async (requestEntry) => {
    try {
      await acceptConnectionRequestInBackend({ API_BASE_URL, requestId: requestEntry.id });
      await reloadState();
      showToast(`Connected with ${requestEntry.name}.`, 'success');
    } catch {
      showToast('Could not accept connection request.', 'error');
    }
  };

  const handleDeclineRequest = async (requestEntry) => {
    try {
      await declineConnectionRequestInBackend({ API_BASE_URL, requestId: requestEntry.id });
      await reloadState();
      showToast(`Declined ${requestEntry.name}'s request.`, 'info');
    } catch {
      showToast('Could not decline connection request.', 'error');
    }
  };

  return (
    <div className="container container90">
      {/* Mobile top bar */}
      <div className="flex justify-between align-center mv2-00 bg-brown0 pa1-00 br0-25">
        <Link to="/notifications" className="ba pa0-50 br0-25 flex items-center brown0">
          ← Notifications
        </Link>
        <Link to="/social-dining" className="ba pa0-50 br0-25 brown0">
          Dining Plans
        </Link>
      </div>

      <div className="grid gtc12 relative ggap1-00 brown0 bg-white">
        {/* ── Sidebar ── */}
        <aside className="gc1s12 gc1s3-m">
          <div className="sticky top-4 pa1-0">
            {/* Stats card */}
            <div className="mb2-00 bg-brown0 br0-25 pa1-00">
              <h2 className="f1-25 gold0 mb1-00 bb pb0-50">My Connections</h2>
              <div className="grid ggap0-50" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f1-50 fw7 gold0">{connectionsWithStats.length}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Connected</div>
                </div>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f1-50 fw7 gold0">{incomingRequests.length}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Pending</div>
                </div>
              </div>
            </div>

            {/* Desktop nav links */}
            <div className="grid ggap0-50 mb2-00">
              <Link to="/notifications" className="brown0 hover-gold0 pa0-25 ba b--brown0 br0-25 tc">
                🔔 Notifications
              </Link>
              <Link to="/social-dining" className="brown0 hover-gold0 pa0-25 ba b--brown0 br0-25 tc">
                🍽️ Dining Plans
              </Link>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="gc1s12 gc4s6-m">

          {/* Loading / error states */}
          {socialLoading && (
            <div className="alert alert-info ma0-50" role="status">Loading connection data…</div>
          )}
          {!socialLoading && socialError === 'unauthenticated' && (
            <div className="alert alert-warning ma0-50" role="alert">
              You must be <Link to="/login">logged in</Link> to view your connections.
            </div>
          )}
          {!socialLoading && socialError === 'network' && (
            <div className="alert alert-danger ma0-50" role="alert">
              Could not reach the database.{' '}
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={reloadState}>Retry</button>
            </div>
          )}
          {!socialLoading && !socialError && !identity && (
            <div className="alert alert-warning ma0-50" role="alert">
              <Link to="/login">Log in</Link> to manage your dining connections.
            </div>
          )}

          {!socialLoading && !socialError && identity && (
            <div className="ba br0-25 shadow-4">

              {/* Tab bar */}
              <div className="flex bb" style={{ flexShrink: 0, flexWrap: 'wrap' }}>
                {[
                  { key: 'suggestions', label: 'Suggestions',       count: suggestions.length },
                  { key: 'incoming',    label: 'Incoming',           count: incomingRequests.length },
                  { key: 'outgoing',    label: 'Outgoing',           count: outgoingRequests.length },
                  { key: 'accepted',    label: 'Accepted',           count: connectionsWithStats.length },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`pa0-75 pointer b f0-85 flex items-center ggap0-25 ${
                      activeTab === key
                        ? 'bg-brown0 gold0 b--brown0'
                        : 'bg-transparent brown0 b--transparent'
                    }`}
                    style={activeTab === key ? { borderBottom: '2px solid currentColor' } : { borderBottom: '2px solid transparent' }}
                  >
                    {label}
                    {count > 0 && (
                      <span
                        className={`ba pa0-25 br0-25 f0-75 b ${
                          activeTab === key ? 'bg-transparent gold0 b--gold0' : 'bg-brown0 gold0 b--brown0'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab panels */}
              <div className="pa0-75">

                {/* Suggestions */}
                {activeTab === 'suggestions' && (
                  !suggestionsLoading && suggestions.length === 0 ? (
                    <p className="brown0 f0-85 mb0-00">No suggestions right now.</p>
                  ) : (
                    <div className="flex flex-column" style={{ gap: '0.6rem' }}>
                      {suggestionsLoading && <p className="brown0 f0-85">Loading…</p>}
                      {suggestions.map((suggestion) => (
                        <div key={suggestion.id} className="flex items-center ba br0-25 pa0-75 bg-white" style={{ gap: '0.75rem' }}>
                          {suggestion.profilePicture ? (
                            <img src={suggestion.profilePicture} alt={suggestion.name}
                              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div className="flex items-center justify-center bg-brown0 gold0 b br0-50"
                              style={{ width: 44, height: 44, flexShrink: 0, fontSize: '1.1rem' }}>
                              {suggestion.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="b brown0 f0-90 mb0-25">{suggestion.name}</div>
                            <div className="flex flex-wrap ggap0-50">
                              <Link to={`/users/${suggestion.id}`} className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 no-underline f0-80">View profile</Link>
                              <button type="button"
                                className="ba pa0-25 br0-25 bg-brown0 gold0 b--brown0 pointer b f0-80"
                                disabled={connectingIds.has(suggestion.id)}
                                style={connectingIds.has(suggestion.id) ? { opacity: 0.6 } : undefined}
                                onClick={() => handleConnect(suggestion)}>
                                {connectingIds.has(suggestion.id) ? 'Sending…' : 'Connect'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Incoming Requests */}
                {activeTab === 'incoming' && (
                  incomingRequests.length === 0 ? (
                    <p className="brown0 f0-85 mb0-00">No incoming requests right now.</p>
                  ) : (
                    <div className="flex flex-column" style={{ gap: '0.6rem' }}>
                      {incomingRequests.map((requestEntry) => (
                        <div key={requestEntry.id} className="flex items-center ba br0-25 pa0-75 bg-white"
                          style={{ borderLeft: '3px solid var(--brown0,#5c3d1e)', gap: '0.75rem' }}>
                          <div className="flex items-center justify-center bg-brown0 gold0 b br0-50"
                            style={{ width: 40, height: 40, flexShrink: 0 }}>
                            {(requestEntry.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="b brown0 f0-90 mb0-25">{requestEntry.name}</div>
                            <div className="f0-75 brown0 mb0-50" style={{ opacity: 0.7 }}>
                              Requested {requestEntry.createdAt ? new Date(requestEntry.createdAt).toLocaleString() : 'recently'}
                            </div>
                            <div className="flex flex-wrap ggap0-50">
                              <Link to={`/users/${requestEntry.userId}`} className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 no-underline f0-80">View profile</Link>
                              <button type="button" className="ba pa0-25 br0-25 bg-brown0 gold0 b--brown0 pointer b f0-80" onClick={() => handleAcceptRequest(requestEntry)}>Accept</button>
                              <button type="button" className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer f0-80" onClick={() => handleDeclineRequest(requestEntry)}>Decline</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Outgoing Requests */}
                {activeTab === 'outgoing' && (
                  outgoingRequests.length === 0 ? (
                    <p className="brown0 f0-85 mb0-00">No outgoing requests pending.</p>
                  ) : (
                    <div className="flex flex-column" style={{ gap: '0.6rem' }}>
                      {outgoingRequests.map((requestEntry) => (
                        <div key={requestEntry.id} className="flex items-center ba br0-25 pa0-75 bg-white" style={{ gap: '0.75rem' }}>
                          <div className="flex items-center justify-center bg-brown0 gold0 b br0-50"
                            style={{ width: 40, height: 40, flexShrink: 0 }}>
                            {(requestEntry.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="b brown0 f0-90 mb0-25">{requestEntry.name}</div>
                            <div className="f0-75 brown0 mb0-50" style={{ opacity: 0.7 }}>
                              Sent {requestEntry.createdAt ? new Date(requestEntry.createdAt).toLocaleString() : 'recently'}
                            </div>
                            <div className="flex flex-wrap ggap0-50">
                              <Link to={`/users/${requestEntry.userId}`} className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 no-underline f0-80">View profile</Link>
                              <span className="ba pa0-25 br0-25 bg-gold5 brown0 b--brown0 f0-75">Awaiting response</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Accepted */}
                {activeTab === 'accepted' && (
                  connectionsWithStats.length === 0 ? (
                    <p className="brown0 f0-85 mb0-00">
                      No accepted connections yet.{' '}
                      <Link to="/social-dining" className="b brown0">Browse dining plans</Link> to send requests.
                    </p>
                  ) : (
                    <div className="flex flex-column" style={{ gap: '0.6rem' }}>
                      {connectionsWithStats.map((connection) => (
                        <div key={connection.id} className="flex items-center ba br0-25 pa0-75 bg-white" style={{ gap: '0.75rem' }}>
                          {connection.profilePicture ? (
                            <img src={connection.profilePicture} alt={connection.name}
                              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div className="flex items-center justify-center bg-brown0 gold0 b br0-50"
                              style={{ width: 44, height: 44, flexShrink: 0, fontSize: '1.1rem' }}>
                              {(connection.name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="b brown0 f0-90 mb0-25">{connection.name}</div>
                            <div className="f0-75 brown0 mb0-50" style={{ opacity: 0.7 }}>
                              {connection.sharedPlans > 0
                                ? `${connection.sharedPlans} shared dining plan${connection.sharedPlans !== 1 ? 's' : ''}`
                                : 'No shared plans'}
                            </div>
                            <div className="flex flex-wrap ggap0-50">
                              <Link to={`/users/${connection.id}`} className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 no-underline f0-80">View profile</Link>
                              <button type="button" className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer f0-80" onClick={() => handleDisconnect(connection)}>Remove</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionsPage;
