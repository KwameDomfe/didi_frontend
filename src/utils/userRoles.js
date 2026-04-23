const MANAGEMENT_ROLE_SET = new Set([
  'vendor',
  'platform_admin',
  'restaurant_owner',
  'restaurant-owner',
  'owner'
]);

export const normalizeUserType = (userType) => String(userType || '').trim().toLowerCase();

export const canManageRestaurants = (user) => MANAGEMENT_ROLE_SET.has(normalizeUserType(user?.user_type));
