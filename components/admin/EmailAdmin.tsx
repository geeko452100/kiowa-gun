"use client";

import { Fragment, useEffect, useState } from "react";
import RichTextEditor from "./RichTextEditor";
import RecipientPicker from "./RecipientPicker";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";
import { MAX_FILE_ATTACHMENTS } from "@/lib/emailAttachments";

const MEMBER_STATUSES = ["Waiting List", "Non-Member", "Member"] as const;
const SHOOTING_COMMITTEE = "Shooting Committee";
// Shooting Committee is a subset of Member (like board members), not a
// mutually-exclusive status, so it's offered as its own checkbox alongside
// the status groups rather than folded into MEMBER_STATUSES.
const RECIPIENT_GROUPS = [...MEMBER_STATUSES, SHOOTING_COMMITTEE] as const;

function memberInGroup(m: Member, group: string) {
  return group === SHOOTING_COMMITTEE ? !!m.onShootingCommittee : m.status === group;
}

type Campaign = {
  id: number;
  subject: string;
  sentAt: string;
  sentCount: number;
  failedCount: number;
  createdBy: string | null;
  recipientEmail: string | null;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  spamCount: number;
};

type CampaignRecipient = {
  id: number;
  email: string;
  sendError: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  bounceType: string | null;
  spamComplaintAt: string | null;
};

type Member = {
  id: number;
  name: string;
  email: string;
  status: string;
  onShootingCommittee: number;
};

type FileAttachment = { r2Key: string; fileName: string };

export default function EmailAdmin() {
  const { confirm, dialog } = useConfirm();
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<Campaign[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [recipientGroups, setRecipientGroups] = useState<Set<string>>(new Set(["Member"]));
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState("");
  const [expandedCampaignId, setExpandedCampaignId] = useState<number | null>(null);
  const [recipientDetail, setRecipientDetail] = useState<CampaignRecipient[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function loadHistory() {
    const res = await fetch("/api/admin/email");
    setHistory((await res.json()) as Campaign[]);
  }

  async function loadMembers(resetSelection = false) {
    const res = await fetch("/api/admin/members");
    const rows = (await res.json()) as Member[];
    setAllMembers(rows);
    if (resetSelection) {
      setSelectedIds(
        new Set(rows.filter((m) => [...recipientGroups].some((g) => memberInGroup(m, g))).map((m) => m.id))
      );
    }
  }

  useEffect(() => {
    void loadHistory();
    void loadMembers(true);
  }, []);

  async function toggleCampaignDetail(id: number) {
    if (expandedCampaignId === id) {
      setExpandedCampaignId(null);
      return;
    }
    setExpandedCampaignId(id);
    setLoadingDetail(true);
    const res = await fetch(`/api/admin/email/${id}/recipients`);
    setRecipientDetail((await res.json()) as CampaignRecipient[]);
    setLoadingDetail(false);
  }

  async function uploadEmailImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("image", file);
    const result = await adminFetch<{ url: string }>("/api/admin/email/images", {
      method: "POST",
      body: formData,
    });
    if (!result.ok) throw new Error(result.error);
    return result.data.url;
  }

  async function attachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachError("");
    if (fileAttachments.length >= MAX_FILE_ATTACHMENTS) {
      setAttachError(`You can attach at most ${MAX_FILE_ATTACHMENTS} files.`);
      return;
    }
    setAttaching(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await adminFetch<FileAttachment>("/api/admin/email/attachments", {
      method: "POST",
      body: formData,
    });
    setAttaching(false);
    if (!result.ok) {
      setAttachError(result.error);
      return;
    }
    setFileAttachments((prev) => [...prev, result.data]);
  }

  function removeAttachment(r2Key: string) {
    setFileAttachments((prev) => prev.filter((a) => a.r2Key !== r2Key));
  }

  const activeMembers = allMembers.filter((m) => [...recipientGroups].some((g) => memberInGroup(m, g)));

  function toggleRecipientGroup(group: string) {
    const next = new Set(recipientGroups);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setRecipientGroups(next);
    setSelectedIds(new Set(allMembers.filter((m) => [...next].some((g) => memberInGroup(m, g))).map((m) => m.id)));
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setResult("Select at least one recipient");
      return;
    }
    const allSelected = selectedIds.size === activeMembers.length;
    const confirmMessage = allSelected
      ? "Send this email to every member? There is no undo."
      : `Send this email to the ${selectedIds.size} selected member${selectedIds.size === 1 ? "" : "s"}? There is no undo.`;
    const ok = await confirm(confirmMessage, "Yes, send");
    if (!ok) return;
    setSending(true);
    setResult("");
    const result = await adminFetch<{ sentCount?: number; failedCount?: number }>("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        bodyHtml,
        memberIds: Array.from(selectedIds),
        attachments: fileAttachments,
      }),
    });
    setSending(false);
    if (!result.ok) {
      setResult(result.error);
      return;
    }
    setResult(`Sent to ${result.data.sentCount} members (${result.data.failedCount} failed).`);
    setSubject("");
    setBodyHtml("");
    setFileAttachments([]);
    setFormKey((k) => k + 1);
    void loadHistory();
    void loadMembers(true);
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
        <RichTextEditor
          key={formKey}
          label="Message"
          value={bodyHtml}
          onChange={setBodyHtml}
          onImageUpload={uploadEmailImage}
        />

        <label>
          Attach a file (optional, e.g. a flyer PDF — shows as a downloadable attachment, not inline)
          <input
            type="file"
            onChange={attachFile}
            disabled={attaching || fileAttachments.length >= MAX_FILE_ATTACHMENTS}
          />
        </label>
        {attachError && <p className="admin-error">{attachError}</p>}
        {fileAttachments.length > 0 && (
          <ul className="admin-note">
            {fileAttachments.map((a) => (
              <li key={a.r2Key}>
                {a.fileName}{" "}
                <button type="button" onClick={() => removeAttachment(a.r2Key)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <fieldset className="status-group-picker">
          <legend>Contact groups</legend>
          {RECIPIENT_GROUPS.map((group) => (
            <label key={group}>
              <input
                type="checkbox"
                checked={recipientGroups.has(group)}
                onChange={() => toggleRecipientGroup(group)}
              />
              {group}
            </label>
          ))}
        </fieldset>

        <RecipientPicker members={activeMembers} selectedIds={selectedIds} onChange={setSelectedIds} />

        {result && <p className="admin-note">{result}</p>}
        <button type="submit" disabled={sending || selectedIds.size === 0}>
          {sending
            ? "Sending…"
            : allSelected
              ? `Send to all members (${activeMembers.length})`
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
            <th>Opens</th>
            <th>Clicks</th>
            <th>Bounces</th>
            <th>Spam</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {history.map((c) => (
            <Fragment key={c.id}>
              <tr className="admin-table-row-clickable" onClick={() => void toggleCampaignDetail(c.id)}>
                <td>{c.subject}</td>
                <td>{c.recipientEmail ?? "All contacts"}</td>
                <td>{c.sentAt}</td>
                <td>
                  {c.sentCount} / {c.failedCount}
                </td>
                <td>{c.openedCount}</td>
                <td>{c.clickedCount}</td>
                <td>{c.bouncedCount}</td>
                <td>{c.spamCount}</td>
                <td>{c.createdBy}</td>
              </tr>
              {expandedCampaignId === c.id && (
                <tr>
                  <td colSpan={9}>
                    {loadingDetail ? (
                      <p className="admin-note">Loading…</p>
                    ) : (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Recipient</th>
                            <th>Delivered</th>
                            <th>Opened</th>
                            <th>Clicked</th>
                            <th>Bounced</th>
                            <th>Spam complaint</th>
                            <th>Send error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipientDetail.map((r) => (
                            <tr key={r.id}>
                              <td>{r.email}</td>
                              <td>{r.deliveredAt ?? "—"}</td>
                              <td>{r.openedAt ?? "—"}</td>
                              <td>{r.clickedAt ?? "—"}</td>
                              <td>{r.bouncedAt ? `${r.bouncedAt} (${r.bounceType ?? "unknown"})` : "—"}</td>
                              <td>{r.spamComplaintAt ?? "—"}</td>
                              <td>{r.sendError ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
