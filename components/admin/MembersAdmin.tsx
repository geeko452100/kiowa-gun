"use client";

import { useEffect, useRef, useState } from "react";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";

function formatDisplayDate(rawValue: string | null) {
  if (!rawValue || !/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return "";
  }

  const [year, month, day] = rawValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
}

function formatDateTextInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseMmDdYyyy(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return "";
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Mirrors lib/schema.ts MEMBER_STATUSES -- duplicated (like the same const in
// EmailAdmin.tsx/SmsAdmin.tsx) rather than imported, so this client component
// doesn't pull the Drizzle schema module into the browser bundle.
const MEMBER_STATUSES = ["Waiting List", "Non-Member", "Member", "Pending Review", "Terminated"] as const;

type Member = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: string;
  onShootingCommittee: number;
  onBoard: number;
  smsOptIn: number;
  renewalDate: string | null;
  pendingDocs: number;
  backgroundCheckCleared: number;
  nraActive: number;
  canPay: number;
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
  const [renewalDateText, setRenewalDateText] = useState<Record<number, string>>({});
  const renewalDateRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    setRenewalDateText((prev) => {
      const next: Record<number, string> = {};
      for (const member of members) {
        const existingValue = prev[member.id];
        const formattedValue = formatDisplayDate(member.renewalDate ?? "");
        next[member.id] = existingValue && existingValue !== formattedValue ? existingValue : formattedValue;
      }
      return next;
    });
  }, [members]);

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
    setRenewalDateText((prev) => ({ ...prev, [m.id]: formatDisplayDate(renewalDate || "") }));
    void load();
  }

  async function toggleShootingCommittee(m: Member, onShootingCommittee: boolean) {
    setError("");
    const result = await adminFetch(`/api/admin/members/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...m, onShootingCommittee }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  async function toggleBoard(m: Member, onBoard: boolean) {
    setError("");
    const result = await adminFetch(`/api/admin/members/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...m, onBoard }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  async function toggleSmsOptIn(m: Member, smsOptIn: boolean) {
    setError("");
    const result = await adminFetch(`/api/admin/members/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...m, smsOptIn }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  async function toggleBackgroundCheckCleared(m: Member, backgroundCheckCleared: boolean) {
    setError("");
    const result = await adminFetch(`/api/admin/members/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...m, backgroundCheckCleared }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  function openRenewalDatePicker(memberId: number) {
    const input = renewalDateRefs.current[memberId];
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
  }

  async function toggleNraActive(m: Member, nraActive: boolean) {
    setError("");
    const result = await adminFetch(`/api/admin/members/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...m, nraActive }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  async function changeAddress(m: Member, address: string) {
    setError("");
    const result = await adminFetch(`/api/admin/members/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...m, address: address || null }),
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
      <p className="admin-note">
        The &quot;Texts OK&quot; column reflects whether a member has agreed to receive texts —
        only check it here if you have their actual consent (e.g. they asked you directly), since
        this drives who receives text messages sent from this site.
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
              <th>Address</th>
              <th>Status</th>
              <th>Payment Eligibility</th>
              <th>Shooting Committee</th>
              <th>Board</th>
              <th>Texts OK</th>
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
                <td data-label="Address">
                  <input
                    key={m.id}
                    defaultValue={m.address ?? ""}
                    placeholder="Mailing address"
                    onBlur={(e) => {
                      if (e.target.value !== (m.address ?? "")) {
                        changeAddress(m, e.target.value);
                      }
                    }}
                  />
                </td>
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
                <td data-label="Payment Eligibility">
                  {m.status === "Pending Review" && (
                    <label className="admin-inline-checkbox">
                      <input
                        type="checkbox"
                        checked={!!m.backgroundCheckCleared}
                        onChange={(e) => toggleBackgroundCheckCleared(m, e.target.checked)}
                      />
                      Background check cleared
                    </label>
                  )}
                  {m.status === "Member" && (
                    <label className="admin-inline-checkbox">
                      <input
                        type="checkbox"
                        checked={!!m.nraActive}
                        onChange={(e) => toggleNraActive(m, e.target.checked)}
                      />
                      NRA active
                    </label>
                  )}
                  <span className="admin-note">{m.canPay ? "Can pay" : "Cannot pay"}</span>
                </td>
                <td data-label="Shooting Committee">
                  <input
                    type="checkbox"
                    checked={!!m.onShootingCommittee}
                    onChange={(e) => toggleShootingCommittee(m, e.target.checked)}
                  />
                </td>
                <td data-label="Board">
                  <input
                    type="checkbox"
                    checked={!!m.onBoard}
                    onChange={(e) => toggleBoard(m, e.target.checked)}
                  />
                </td>
                <td data-label="Texts OK">
                  <input
                    type="checkbox"
                    checked={!!m.smsOptIn}
                    onChange={(e) => toggleSmsOptIn(m, e.target.checked)}
                  />
                </td>
                <td data-label="Renewal Date">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="text"
                      value={renewalDateText[m.id] ?? formatDisplayDate(m.renewalDate ?? "")}
                      onChange={(e) => {
                        const nextValue = formatDateTextInput(e.target.value);
                        setRenewalDateText((prev) => ({ ...prev, [m.id]: nextValue }));
                        if (nextValue === "") {
                          if (m.renewalDate) changeRenewalDate(m, "");
                          return;
                        }
                        const normalized = parseMmDdYyyy(nextValue);
                        if (normalized && normalized !== (m.renewalDate ?? "")) {
                          changeRenewalDate(m, normalized);
                        }
                      }}
                      placeholder="MM/DD/YYYY"
                      inputMode="numeric"
                      pattern="^(0?[1-9]|1[0-2])/(0?[1-9]|[12][0-9]|3[01])/((\d{4}))$"
                      title="MM/DD/YYYY"
                      style={{ flex: 1 }}
                    />
                    <input
                      ref={(el) => {
                        renewalDateRefs.current[m.id] = el;
                      }}
                      type="date"
                      value={m.renewalDate ?? ""}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setRenewalDateText((prev) => ({ ...prev, [m.id]: formatDisplayDate(nextValue) }));
                        if (nextValue !== (m.renewalDate ?? "")) {
                          changeRenewalDate(m, nextValue);
                        }
                      }}
                      aria-label={`Choose renewal date for ${m.name}`}
                      style={{
                        position: "absolute",
                        width: 1,
                        height: 1,
                        opacity: 0,
                        pointerEvents: "none",
                      }}
                    />
                    <button
                      type="button"
                      aria-label={`Open renewal date picker for ${m.name}`}
                      title="Choose a date"
                      onClick={() => openRenewalDatePicker(m.id)}
                      style={{
                        minWidth: 42,
                        height: 42,
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.25)",
                        background: "rgba(255,255,255,0.04)",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      📅
                    </button>
                  </div>
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
