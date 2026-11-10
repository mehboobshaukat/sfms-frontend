// Role names mirror the backend (app/core/roles.py). The backend enforces every rule on
// its own; these helpers only decide what the UI shows.
export const ROLE_USER = "user";
export const ROLE_ADMIN = "admin";
export const ROLE_SUPER_ADMIN = "super_admin";

export const isAdminRole = (role) => role === ROLE_ADMIN || role === ROLE_SUPER_ADMIN;

export function roleLabel(role) {
  if (role === ROLE_SUPER_ADMIN) return "Super admin";
  if (role === ROLE_ADMIN) return "Admin";
  return "Member";
}

/** Can `me` (from GET /admin/me) act on `target` (an AdminUserOut)? Mirrors the backend's _assert_manageable. */
export function canManageUser(me, target) {
  if (!me || !target) return { allowed: false, reason: "" };
  if (target.username.toLowerCase() === me.username.toLowerCase()) {
    return { allowed: false, reason: "You can't change your own account from the admin panel." };
  }
  if (target.role === ROLE_SUPER_ADMIN) {
    return { allowed: false, reason: "The super admin account can't be modified." };
  }
  if (me.role !== ROLE_SUPER_ADMIN && target.role !== ROLE_USER) {
    return { allowed: false, reason: "Only the super admin can manage other admins." };
  }
  return { allowed: true, reason: "" };
}
