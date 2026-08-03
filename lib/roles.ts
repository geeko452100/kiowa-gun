// Role hierarchy for CMS logins: tech_admin > president > board_member.
// tech_admin is the developer/owner-level account — it can appoint or replace
// the president at any time, and only another tech_admin can edit a tech_admin
// account. Shared between server routes and client admin UI, so this file
// must stay free of server-only imports.

export const ROLES = ["board_member", "president", "tech_admin"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { board_member: 0, president: 1, tech_admin: 2 };

export function normalizeRole(role: string | null | undefined): Role {
  return role === "tech_admin" || role === "president" ? role : "board_member";
}

export function canManageBoard(role: string | null | undefined) {
  const r = normalizeRole(role);
  return r === "president" || r === "tech_admin";
}

// Whether `actorRole` is allowed to set/edit a login that currently has (or would get) `targetRole`.
export function canManageRole(actorRole: string | null | undefined, targetRole: string | null | undefined) {
  return RANK[normalizeRole(actorRole)] >= RANK[normalizeRole(targetRole)];
}

export function roleLabel(role: string | null | undefined) {
  const r = normalizeRole(role);
  if (r === "tech_admin") return "Tech Admin";
  if (r === "president") return "President";
  return "Board member";
}
