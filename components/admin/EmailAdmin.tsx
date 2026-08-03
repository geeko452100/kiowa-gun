"use client";

import { useEffect, useState } from "react";
import RichTextEditor from "./RichTextEditor";
import RecipientPicker from "./RecipientPicker";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";

type Campaign = {
  id: number;
  subject: string;
  sentAt: string;
  sentCount: number;
  failedCount: number;
  createdBy: string | null;
  recipientEmail: string | null;
};

type Member = {
  id: number;
  name: string;
  email: string;
  status: string;
};

export default function EmailAdmin() {
  const { confirm, dialog } = useConfirm();
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<Campaign[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [activeMembers, setActiveMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  async function loadHistory() {
    const res = await fetch("/api/admin/email");
    setHistory((await res.json()) as Campaign[]);
  }

  async function loadMembers() {
    const res = await fetch("/api/admin/members");
    const rows = (await res.json()) as Member[];
    const active = rows.filter((m) => m.status === "active");
    setActiveMembers(active);
    setSelectedIds(new Set(active.map((m) => m.id)));
  }

  useEffect(() => {
    void loadHistory();
    void loadMembers();
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setResult("Select at least one recipient");
      return;
    }
    const allSelected = selectedIds.size === activeMembers.length;
    const confirmMessage = allSelected
      ? "Send this email to every active member? There is no undo."
      : `Send this email to the ${selectedIds.size} selected member${selectedIds.size === 1 ? "" : "s"}? There is no undo.`;
    const ok = await confirm(confirmMessage, "Yes, send");
    if (!ok) return;
    setSending(true);
    setResult("");
    const result = await adminFetch<{ sentCount?: number; failedCount?: number }>("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, bodyHtml, memberIds: Array.from(selectedIds) }),
    });
    setSending(false);
    if (!result.ok) {
      setResult(result.error);
      return;
    }
    setResult(`Sent to ${result.data.sentCount} members (${result.data.failedCount} failed).`);
    setSubject("");
    setBodyHtml("");
    setFormKey((k) => k + 1);
    void loadHistory();
    void loadMembers();
  }

  const allSelected = activeMembers.length > 0 && selectedIds.size === activeMembers.length;

  return (
    <div>
      {dialog}
      <h1>Send Email</h1>
      <p className="admin-note">
        Choose who should receive this message below, then double-check it before sending — there
        is no undo.
      </p>

      <form className="admin-form" onSubmit={send}>
        <label>
          Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </label>
        <RichTextEditor key={formKey} label="Message" value={bodyHtml} onChange={setBodyHtml} />

        <RecipientPicker members={activeMembers} selectedIds={selectedIds} onChange={setSelectedIds} />

        {result && <p className="admin-note">{result}</p>}
        <button type="submit" disabled={sending || selectedIds.size === 0}>
          {sending
            ? "Sending…"
            : allSelected
              ? `Send to all active members (${activeMembers.length})`
              : `Send to ${selectedIds.size} selected member${selectedIds.size === 1 ? "" : "s"}`}
        </button>
      </form>

      <h2>Send history</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>To</th>
            <th>Sent at</th>
            <th>Sent / Failed</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {history.map((c) => (
            <tr key={c.id}>
              <td>{c.subject}</td>
              <td>{c.recipientEmail ?? "All active members"}</td>
              <td>{c.sentAt}</td>
              <td>
                {c.sentCount} / {c.failedCount}
              </td>
              <td>{c.createdBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
