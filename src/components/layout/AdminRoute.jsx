import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { isAdminRole } from "../../lib/roles";

/** Keeps non-admins out of /admin/*. UI convenience only - every /admin API call is checked again by the backend. */
export default function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!isAdminRole(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

/** For pages only the super admin may open (e.g. /admin/admins). */
export function SuperAdminOnly({ me, children }) {
  if (!me?.capabilities?.manage_admins) return <Navigate to="/admin/messages" replace />;
  return children;
}
