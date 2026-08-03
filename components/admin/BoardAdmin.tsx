"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";
import { canManageRole, roleLabel, type Role } from "@/lib/roles";

type BoardMember = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function BoardAdmin({
  currentAdminId,
  currentAdminRole,
}: {
  currentAdminId: number;
  currentAdminRole: string;
}) {
  const { confirm, dialog } = useConfirm();
  const isTechAdmin = currentAdminRole === "tech_admin";
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("board_member");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/admin/board");
    if (res.ok) setBoardMembers((await res.json()) as BoardMember[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addBoardMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const result = await adminFetch<{ email?: string }>("/api/admin/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(
      `Invitation email sent to ${result.data.email}. They'll get a link to set their own password.`
    );
    setName("");
    setEmail("");
    setRole("board_member");
    void load();
  }

  async function sendResetLink(m: BoardMember) {
    const ok = await confirm(
      `Send a password reset link to ${m.name} (${m.email})? Their current password keeps working until they use it.`,
      "Yes, send link"
    );
    if (!ok) return;
    setError("");
    setMessage("");
    const result = await adminFetch(`/api/admin/board/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_password" }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(`Password reset link sent to ${m.email}.`);
  }

  async function setMemberRole(m: BoardMember, nextRole: Role) {
    if (nextRole === m.role) return;
    const ok = await confirm(
      `Change ${m.name}'s access from "${roleLabel(m.role)}" to "${roleLabel(nextRole)}"?`,
      "Yes, change access"
    );
    if (!ok) return;
    setError("");
    const result = await adminFetch(`/api/admin/board/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_role", role: nextRole }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  async function remove(m: BoardMember) {
    const ok = await confirm(`Remove ${m.name}'s (${m.email}) CMS login? This cannot be undone.`);
    if (!ok) return;
    setError("");
    const result = await adminFetch(`/api/admin/board/${m.id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  return (
    <div>
      {dialog}
      <h1>Board Members</h1>
      <p className="admin-note">
        People listed here can log in to this admin site. Adding someone or sending a reset link
        emails them a one-time link to set their own password — nobody else ever sees it.
        Presidents can add and manage regular board members and other presidents; only a tech
        admin can create or change a tech admin login.
      </p>

      <form className="admin-form" onSubmit={addBoardMember}>
        <strong>Add a board member login</strong>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Access level
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="board_member">Board member (regular admin access)</option>
            <option value="president">President (can also manage board member logins)</option>
            {isTechAdmin && (
              <option value="tech_admin">Tech Admin (full system access)</option>
            )}
          </select>
        </label>
        {error && <p className="admin-note">{error}</p>}
        <button type="submit">Add board member</button>
      </form>

      {message && <p className="admin-note">{message}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Access</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {boardMembers.map((m) => {
            const canManage = canManageRole(currentAdminRole, m.role);
            return (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.email}</td>
                <td>
                  {canManage ? (
                    <select
                      value={m.role}
                      onChange={(e) => setMemberRole(m, e.target.value as Role)}
                    >
                      <option value="board_member">Board member</option>
                      <option value="president">President</option>
                      {isTechAdmin && <option value="tech_admin">Tech Admin</option>}
                    </select>
                  ) : (
                    roleLabel(m.role)
                  )}
                </td>
                <td className="admin-row-actions">
                  {canManage ? (
                    <>
                      <button type="button" onClick={() => sendResetLink(m)}>
                        Send password reset link
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => remove(m)}
                        disabled={m.id === currentAdminId}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <span className="admin-note">Managed by a tech admin</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
