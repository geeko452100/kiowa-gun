// Role hierarchy for CMS logins: tech_admin > president = vice_president > treasurer = board_member.
// tech_admin is the developer/owner-level account — it can appoint or replace
// the president at any time, and only another tech_admin can edit a tech_admin
// account. vice_president carries the same permissions as president (board
// management included). treasurer is otherwise a regular board_member, but
// also gets access to financial records, same as president/vice_president/tech_admin.
// Shared between server routes and client admin UI, so this file must stay
// free of server-only imports.

export const ROLES = ["board_member", "treasurer", "vice_president", "president", "tech_admin"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = {
  board_member: 0,
  treasurer: 0,
  vice_president: 1,
  president: 1,
  tech_admin: 2,
};

export function normalizeRole(role: string | null | undefined): Role {
  return role === "tech_admin" || role === "president" || role === "vice_president" || role === "treasurer"
    ? role
    : "board_member";
}

export function canManageBoard(role: string | null | undefined) {
  const r = normalizeRole(role);
  return r === "president" || r === "vice_president" || r === "tech_admin";
}

// Whether `actorRole` is allowed to set/edit a login that currently has (or would get) `targetRole`.
export function canManageRole(actorRole: string | null | undefined, targetRole: string | null | undefined) {
  return RANK[normalizeRole(actorRole)] >= RANK[normalizeRole(targetRole)];
}

// Whether `role` is allowed to view financial records (Payments).
export function canViewFinancials(role: string | null | undefined) {
  const r = normalizeRole(role);
  return r === "treasurer" || r === "president" || r === "vice_president" || r === "tech_admin";
}

export function roleLabel(role: string | null | undefined) {
  const r = normalizeRole(role);
  if (r === "tech_admin") return "Tech Admin";
  if (r === "president") return "President";
  if (r === "vice_president") return "Vice President";
  if (r === "treasurer") return "Treasurer";
  return "Board member";
}
