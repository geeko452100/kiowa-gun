"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";
import PositionSelect from "./PositionSelect";
import { canManageRole, roleLabel, type Role } from "@/lib/roles";

type BoardMember = {
  id: number;
  name: string;
  email: string;
  role: string;
  position: string | null;
  phone: string | null;
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
  const [positionOptions, setPositionOptions] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("board_member");
  const [position, setPosition] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savedField, setSavedField] = useState<{ id: number; field: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/board");
    if (res.ok) setBoardMembers((await res.json()) as BoardMember[]);
  }

  async function loadPositionOptions() {
    const res = await fetch("/api/admin/position-options");
    if (res.ok) setPositionOptions((await res.json()) as string[]);
  }

  useEffect(() => {
    void load();
    void loadPositionOptions();
  }, []);

  async function addPositionOption(label: string): Promise<string | null> {
    const result = await adminFetch<{ label?: string }>("/api/admin/position-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (!result.ok) return result.error;
    const added = result.data.label!;
    setPositionOptions((opts) => (opts.includes(added) ? opts : [...opts, added].sort()));
    return null;
  }

  async function addBoardMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const result = await adminFetch<{ email?: string }>("/api/admin/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, role, position }),
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
    setPhone("");
    setRole("board_member");
    setPosition("");
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

  async function savePosition(m: BoardMember, nextPosition: string) {
    const trimmed = nextPosition.trim();
    if (trimmed === (m.position ?? "")) return;
    setError("");
    const result = await adminFetch(`/api/admin/board/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_position", position: trimmed }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBoardMembers((rows) => rows.map((r) => (r.id === m.id ? { ...r, position: trimmed || null } : r)));
    setSavedField({ id: m.id, field: "position" });
    setTimeout(() => setSavedField(null), 3000);
  }

  async function saveDetail(m: BoardMember, field: "name" | "email" | "phone", nextValue: string) {
    const trimmed = nextValue.trim();
    const required = field !== "phone";
    if ((required && !trimmed) || trimmed === (m[field] ?? "")) return;
    setError("");
    const result = await adminFetch<{ name?: string; email?: string; phone?: string | null }>(
      `/api/admin/board/${m.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_details", [field]: trimmed }),
      }
    );
    if (!result.ok) {
      setError(result.error);
      void load();
      return;
    }
    setBoardMembers((rows) => rows.map((r) => (r.id === m.id ? { ...r, ...result.data } : r)));
    setSavedField({ id: m.id, field });
    setTimeout(() => setSavedField(null), 3000);
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
        admin can create or change a tech admin login. Title (Vice President, Treasurer, etc.) is
        just a label — it doesn't change what someone can do here, only their access level does.
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
          Phone (optional)
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
        <label>
          Title (optional)
          <PositionSelect
            value={position}
            options={positionOptions}
            onChange={setPosition}
            onAddOption={addPositionOption}
          />
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
            <th>Phone</th>
            <th>Title</th>
            <th>Access</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {boardMembers.map((m) => {
            const canManage = canManageRole(currentAdminRole, m.role);
            return (
              <tr key={m.id}>
                <td>
                  {canManage ? (
                    <div className="admin-row-actions">
                      <input
                        key={`name-${m.id}-${m.name}`}
                        defaultValue={m.name}
                        onBlur={(e) => saveDetail(m, "name", e.target.value)}
                      />
                      {savedField?.id === m.id && savedField.field === "name" && (
                        <span className="admin-saved">✓</span>
                      )}
                    </div>
                  ) : (
                    m.name
                  )}
                </td>
                <td>
                  {canManage ? (
                    <div className="admin-row-actions">
                      <input
                        key={`email-${m.id}-${m.email}`}
                        type="email"
                        defaultValue={m.email}
                        onBlur={(e) => saveDetail(m, "email", e.target.value)}
                      />
                      {savedField?.id === m.id && savedField.field === "email" && (
                        <span className="admin-saved">✓</span>
                      )}
                    </div>
                  ) : (
                    m.email
                  )}
                </td>
                <td>
                  {canManage ? (
                    <div className="admin-row-actions">
                      <input
                        key={`phone-${m.id}-${m.phone ?? ""}`}
                        type="tel"
                        defaultValue={m.phone ?? ""}
                        placeholder="No phone"
                        onBlur={(e) => saveDetail(m, "phone", e.target.value)}
                      />
                      {savedField?.id === m.id && savedField.field === "phone" && (
                        <span className="admin-saved">✓</span>
                      )}
                    </div>
                  ) : (
                    m.phone || <span className="admin-note">—</span>
                  )}
                </td>
                <td>
                  {canManage ? (
                    <div className="admin-row-actions">
                      <PositionSelect
                        value={m.position ?? ""}
                        options={positionOptions}
                        onChange={(next) => savePosition(m, next)}
                        onAddOption={addPositionOption}
                      />
                      {savedField?.id === m.id && savedField.field === "position" && (
                        <span className="admin-saved">✓</span>
                      )}
                    </div>
                  ) : (
                    m.position || <span className="admin-note">—</span>
                  )}
                </td>
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
