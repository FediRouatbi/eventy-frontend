import type { AuthSession } from "#/lib/auth";

export type AdminRole = "organizer_admin" | "super_admin";

export function isAdminRole(role?: string): role is AdminRole {
  return role === "organizer_admin" || role === "super_admin";
}

export function isSuperAdminSession(session: AuthSession | null) {
  return session?.user.role === "super_admin";
}

export function isOrganizerAdminSession(session: AuthSession | null) {
  return session?.user.role === "organizer_admin";
}

export function canAccessAdminApp(session: AuthSession | null) {
  return Boolean(session && isAdminRole(session.user.role));
}
