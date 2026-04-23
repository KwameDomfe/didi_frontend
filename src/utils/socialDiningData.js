import axios from 'axios';

export const SOCIAL_PLANS_KEY = 'didi_social_dining_plans_v1';
export const SOCIAL_CONNECTIONS_PREFIX = 'didi_social_connections_v1_';

const SOCIAL_API = {
  plans: '/social/groups/',
  connections: '/social/follow/connections/',
  requests: '/social/follow/requests/',
  connectUser: '/social/follow/connect_user/',
  acceptRequest: '/social/follow/accept_request/',
  declineRequest: '/social/follow/decline_request/',
  disconnectUser: '/social/follow/disconnect_user/',
};

const withIdPath = (collectionPath, id, action = '') => (
  `${collectionPath}${encodeURIComponent(String(id))}/${action}`
);

const normalizeArray = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return null;
  }
  return { headers: { Authorization: `Token ${token}` } };
};

const getAuthHeadersOrThrow = () => {
  const auth = getAuthHeaders();
  if (!auth) {
    throw new Error('Missing auth token for social dining backend requests');
  }
  return auth;
};

const buildUrl = (baseUrl, path) => `${String(baseUrl || '').replace(/\/$/, '')}${path}`;

const fetchAllPages = async (url, config) => {
  const all = [];
  let nextUrl = url;

  while (nextUrl) {
    const response = await axios.get(nextUrl, config);
    const payload = response.data;

    if (Array.isArray(payload)) {
      all.push(...payload);
      nextUrl = null;
    } else {
      all.push(...(payload?.results || []));
      nextUrl = payload?.next || null;
    }
  }

  return all;
};

export const getUserIdentity = (user) => {
  if (!user) {
    return null;
  }

  const id = String(user.id ?? user.email ?? user.username ?? '').trim();
  if (!id) {
    return null;
  }

  const name = String(
    user.username
      || `${user.first_name || ''} ${user.last_name || ''}`.trim()
      || user.email
      || 'User'
  ).trim();

  return { id, name };
};

export const readLocalPlans = () => {
  try {
    const raw = localStorage.getItem(SOCIAL_PLANS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeLocalPlans = (plans) => {
  localStorage.setItem(SOCIAL_PLANS_KEY, JSON.stringify(Array.isArray(plans) ? plans : []));
};

export const readLocalConnections = (userIdentity) => {
  if (!userIdentity) {
    return [];
  }

  try {
    const raw = localStorage.getItem(`${SOCIAL_CONNECTIONS_PREFIX}${userIdentity}`);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeLocalConnections = (userIdentity, connections) => {
  if (!userIdentity) {
    return;
  }

  localStorage.setItem(
    `${SOCIAL_CONNECTIONS_PREFIX}${userIdentity}`,
    JSON.stringify(Array.isArray(connections) ? connections : [])
  );
};

const mapBackendPlan = (plan) => {
  // Backend model is DiningGroup: name, description, creator, restaurant (nested),
  // planned_date, max_members, members (array added by serializer), created_at
  const creatorObject = plan?.creator && typeof plan.creator === 'object' ? plan.creator : null;
  const restaurantObject = plan?.restaurant && typeof plan.restaurant === 'object' ? plan.restaurant : null;

  const attendees = normalizeArray(plan?.members).map((m) => ({
    id: String(m?.id ?? m?.name ?? ''),
    name: String(m?.name || m?.username || 'Diner'),
  }));

  const hostId = String(creatorObject?.id ?? plan?.creator_id ?? '');
  const hostName = String(
    creatorObject?.username
    || `${creatorObject?.first_name || ''} ${creatorObject?.last_name || ''}`.trim()
    || creatorObject?.email
    || 'Host'
  );

  const mapped = {
    id: String(plan?.id ?? `backend-plan-${Date.now()}`),
    title: plan?.name || plan?.title || 'Dining Plan',
    restaurantId: String(restaurantObject?.id ?? plan?.restaurant_id ?? plan?.restaurant ?? ''),
    restaurantName: restaurantObject?.name || 'Restaurant',
    restaurantSlug: restaurantObject?.slug || null,
    menuItemId: null,
    menuItemName: null,
    menuItemSlug: null,
    scheduledFor: plan?.planned_date || plan?.scheduled_for || null,
    seats: Number(plan?.max_members ?? plan?.seats ?? 4),
    note: plan?.description || plan?.note || '',
    hostId,
    hostName,
    attendees,
    createdAt: plan?.created_at || new Date().toISOString(),
  };

  if (mapped.attendees.length === 0 && mapped.hostId) {
    mapped.attendees = [{ id: mapped.hostId, name: mapped.hostName }];
  }

  return mapped;
};

const mapBackendConnection = (entry) => {
  // Connection endpoints still serialize through FollowSerializer and expose
  // the other user in the `following` field of the current user's forward record.
  const followingUser = entry?.following && typeof entry.following === 'object'
    ? entry.following
    : null;

  const id = followingUser?.id ?? entry?.id;
  const name = String(
    followingUser?.username
    || `${followingUser?.first_name || ''} ${followingUser?.last_name || ''}`.trim()
    || followingUser?.email
    || entry?.name
    || 'Connection'
  );

  return {
    id: String(id ?? name),
    name,
    connectionId: followingUser?.id != null ? String(followingUser.id) : String(id ?? name),
    status: 'accepted',
    isPending: false,
  };
};

const mapConnectionRequest = (entry, direction) => {
  const otherUser = direction === 'incoming'
    ? (entry?.sender && typeof entry.sender === 'object' ? entry.sender : null)
    : (entry?.recipient && typeof entry.recipient === 'object' ? entry.recipient : null);

  const name = String(
    otherUser?.username
    || `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim()
    || otherUser?.email
    || 'User'
  );

  return {
    id: String(entry?.id ?? `${direction}-${otherUser?.id ?? name}`),
    userId: String(otherUser?.id ?? name),
    name,
    direction,
    status: String(entry?.status || 'pending'),
    createdAt: entry?.created_at || null,
    respondedAt: entry?.responded_at || null,
  };
};

const toBackendPlanPayload = (planInput) => ({
  // DiningGroup model fields
  name: String(planInput?.title || '').trim(),
  description: String(planInput?.note || '').trim(),
  restaurant_id: planInput?.restaurantId ? Number(planInput.restaurantId) : null,
  planned_date: planInput?.scheduledFor || null,
  max_members: Number(planInput?.seats || 4),
  is_public: true,
});

export const createPlanInBackend = async ({ API_BASE_URL, planInput }) => {
  const authConfig = getAuthHeadersOrThrow();
  const response = await axios.post(
    buildUrl(API_BASE_URL, SOCIAL_API.plans),
    toBackendPlanPayload(planInput),
    authConfig
  );

  return mapBackendPlan(response.data);
};

export const joinPlanInBackend = async ({ API_BASE_URL, planId }) => {
  const authConfig = getAuthHeadersOrThrow();
  const detailUrl = buildUrl(API_BASE_URL, withIdPath(SOCIAL_API.plans, planId));
  await axios.post(`${detailUrl}join/`, {}, authConfig);
};

export const leavePlanInBackend = async ({ API_BASE_URL, planId }) => {
  const authConfig = getAuthHeadersOrThrow();
  const detailUrl = buildUrl(API_BASE_URL, withIdPath(SOCIAL_API.plans, planId));
  await axios.post(`${detailUrl}leave/`, {}, authConfig);
};

export const deletePlanInBackend = async ({ API_BASE_URL, planId }) => {
  const authConfig = getAuthHeadersOrThrow();
  const detailPath = withIdPath(SOCIAL_API.plans, planId);
  const detailUrl = buildUrl(API_BASE_URL, detailPath);
  await axios.delete(detailUrl, authConfig);
};

export const connectWithUserInBackend = async ({ API_BASE_URL, targetUserId }) => {
  const authConfig = getAuthHeadersOrThrow();
  const response = await axios.post(
    buildUrl(API_BASE_URL, SOCIAL_API.connectUser),
    { user_id: targetUserId },
    authConfig
  );

  return {
    relationshipStatus: String(response?.data?.relationship_status || 'pending_outgoing'),
    request: response?.data?.request
      ? mapConnectionRequest(response.data.request, response.data.relationship_status === 'pending_outgoing' ? 'outgoing' : 'incoming')
      : null,
    connection: response?.data?.connection ? mapBackendConnection(response.data.connection) : null,
  };
};

export const acceptConnectionRequestInBackend = async ({ API_BASE_URL, requestId }) => {
  const authConfig = getAuthHeadersOrThrow();
  const response = await axios.post(
    buildUrl(API_BASE_URL, SOCIAL_API.acceptRequest),
    { request_id: requestId },
    authConfig
  );

  return response.data;
};

export const declineConnectionRequestInBackend = async ({ API_BASE_URL, requestId }) => {
  const authConfig = getAuthHeadersOrThrow();
  const response = await axios.post(
    buildUrl(API_BASE_URL, SOCIAL_API.declineRequest),
    { request_id: requestId },
    authConfig
  );

  return response.data;
};

export const disconnectUserInBackend = async ({ API_BASE_URL, connectionId, targetUserId }) => {
  const authConfig = getAuthHeadersOrThrow();
  const userId = connectionId ?? targetUserId;
  await axios.post(
    buildUrl(API_BASE_URL, SOCIAL_API.disconnectUser),
    { user_id: userId },
    authConfig
  );
};

const tryFetchPlansFromBackend = async (API_BASE_URL) => {
  const authConfig = getAuthHeaders();
  if (!authConfig) {
    throw new Error('Missing auth token for backend plans');
  }

  const allPlans = await fetchAllPages(buildUrl(API_BASE_URL, SOCIAL_API.plans), authConfig);
  return allPlans.map(mapBackendPlan);
};

const tryFetchConnectionsFromBackend = async (API_BASE_URL) => {
  const authConfig = getAuthHeaders();
  if (!authConfig) {
    throw new Error('Missing auth token for backend connections');
  }

  const allConnections = await fetchAllPages(buildUrl(API_BASE_URL, SOCIAL_API.connections), authConfig);
  return allConnections.map(mapBackendConnection);
};

const tryFetchConnectionRequestsFromBackend = async (API_BASE_URL) => {
  const authConfig = getAuthHeaders();
  if (!authConfig) {
    throw new Error('Missing auth token for backend connection requests');
  }

  const response = await axios.get(buildUrl(API_BASE_URL, SOCIAL_API.requests), authConfig);
  return {
    incoming: normalizeArray(response.data?.incoming).map((entry) => mapConnectionRequest(entry, 'incoming')),
    outgoing: normalizeArray(response.data?.outgoing).map((entry) => mapConnectionRequest(entry, 'outgoing')),
  };
};

export const loadSocialDiningState = async ({ API_BASE_URL, user }) => {
  const identity = getUserIdentity(user);

  if (!identity) {
    return {
      source: 'unauthenticated',
      plans: [],
      connections: [],
      requests: { incoming: [], outgoing: [] },
      error: 'unauthenticated',
    };
  }

  const [plans, connections, requests] = await Promise.all([
    tryFetchPlansFromBackend(API_BASE_URL),
    tryFetchConnectionsFromBackend(API_BASE_URL),
    tryFetchConnectionRequestsFromBackend(API_BASE_URL),
  ]);

  return {
    source: 'backend',
    plans,
    connections,
    requests,
    error: null,
  };
};

export const loadMyConnectionsCount = async ({ API_BASE_URL, user }) => {
  const identity = getUserIdentity(user);
  if (!identity) {
    return { count: 0, source: 'none' };
  }

  const connections = await tryFetchConnectionsFromBackend(API_BASE_URL);
  return { count: connections.length, source: 'backend' };
};
