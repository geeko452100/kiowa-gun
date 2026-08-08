"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";

const MEMBER_STATUSES = ["Waiting List", "Non-Member", "Member"] as const;

type Member = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  renewalDate: string | null;
  pendingDocs: number;
};

export default function MembersAdmin() {
  const { confirm, dialog } = useConfirm();
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [csv, setCsv] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/members");
    setMembers((await res.json()) as Member[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await adminFetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setEmail("");
    setPhone("");
    void load();
  }

  async function importCsv(e: React.FormEvent) {
    e.preventDefault();
    setImportMsg("Importing…");
    const result = await adminFetch<{ imported?: number }>(
      "/api/admin/members/import",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      },
    );
    if (!result.ok) {
      setImportMsg(result.error);
      return;
    }
    setImportMsg(`Imported ${result.data.imported} rows.`);
    setCsv("");
    void load();
  }

  async function changeStatus(m: Member, status: string) {
    setError("");
    const result = await adminFetch(`/api/admin/members/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...m, status }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  async function changeRenewalDate(m: Member, renewalDate: string) {
    setError("");
    const result = await adminFetch(`/api/admin/members/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...m, renewalDate: renewalDate || null }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  async function remove(m: Member) {
    const ok = await confirm(
      `Delete ${m.name} (${m.email}) from the member list? This cannot be undone.`,
    );
    if (!ok) return;
    setError("");
    const result = await adminFetch(`/api/admin/members/${m.id}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  const memberCount = members.filter((m) => m.status === "Member").length;

  return (
    <div>
      {dialog}
      <h1>Members</h1>
      <p className="admin-note">
        {memberCount} members will receive newsletters.
      </p>
      <p className="admin-note">
        Board members are included in this list. Changing a board member&apos;s
        status here only affects newsletters — it does not remove their CMS
        login (manage that from Board Members).
      </p>
      <p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page nav */}
        <a className="admin-link" href="/api/admin/members/export">
          Export contact list as CSV
        </a>
      </p>

      <form className="admin-form" onSubmit={addMember}>
        <strong>Add a member</strong>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button type="submit">Add member</button>
      </form>

      <form className="admin-form" onSubmit={importCsv}>
        <strong>Add many members at once (from a spreadsheet)</strong>
        <p className="admin-note">
          1. Download the example spreadsheet below and fill it in, one member
          per row (a phone number is optional).
          <br />
          2. In Excel or Google Sheets, save or export it as a &quot;CSV&quot;
          file.
          <br />
          3. Open that file in a text editor, copy all the text, and paste it
          into the box below.
        </p>
        <p>
          <a className="admin-link" href="/members-template.csv" download>
            Download the example spreadsheet
          </a>
        </p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={
            "name,email,phone\nJane Doe,jane@example.com,620-555-0100"
          }
        />
        {importMsg && <p className="admin-note">{importMsg}</p>}
        <button type="submit">Add members from spreadsheet</button>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Renewal Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td data-label="Name">{m.name}</td>
                <td data-label="Email">{m.email}</td>
                <td data-label="Phone">{m.phone}</td>
                <td data-label="Status">
                  <select
                    value={m.status}
                    onChange={(e) => changeStatus(m, e.target.value)}
                  >
                    {MEMBER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {m.pendingDocs > 0 && (
                    <span className="admin-badge">
                      {m.pendingDocs} doc{m.pendingDocs === 1 ? "" : "s"} to review
                    </span>
                  )}
                </td>
                <td data-label="Renewal Date">
                  <input
                    type="date"
                    value={m.renewalDate ?? ""}
                    onChange={(e) => changeRenewalDate(m, e.target.value)}
                  />
                </td>
                <td className="admin-row-actions">
                  <button
                    type="button"
                    className="danger"
                    onClick={() => remove(m)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
