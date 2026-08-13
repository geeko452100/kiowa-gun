"use client";

import { Fragment, useEffect, useState } from "react";
import RecipientPicker from "./RecipientPicker";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";

const MEMBER_STATUSES = ["Waiting List", "Non-Member", "Member"] as const;
const SHOOTING_COMMITTEE = "Shooting Committee";
const BOARD = "Board";
// Shooting Committee and Board are subsets of Member, not mutually-exclusive
// statuses, so they're offered as their own checkboxes alongside the status
// groups rather than folded into MEMBER_STATUSES.
const RECIPIENT_GROUPS = [...MEMBER_STATUSES, SHOOTING_COMMITTEE, BOARD] as const;

function memberInGroup(m: Member, group: string) {
  if (group === SHOOTING_COMMITTEE) return !!m.onShootingCommittee;
  if (group === BOARD) return !!m.onBoard;
  return m.status === group;
}

type Campaign = {
  id: number;
  body: string;
  sentAt: string;
  sentCount: number;
  failedCount: number;
  createdBy: string | null;
  recipientPhone: string | null;
  mediaUrl: string | null;
  deliveredCount: number;
  undeliveredCount: number;
};

type CampaignRecipient = {
  id: number;
  phone: string;
  signalwireSid: string | null;
  sendError: string | null;
  status: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
};

type Member = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  onShootingCommittee: number;
  onBoard: number;
  smsOptIn: number;
};

export default function SmsAdmin() {
  const { confirm, dialog } = useConfirm();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<Campaign[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [recipientGroups, setRecipientGroups] = useState<Set<string>>(new Set(["Member"]));
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFileName, setMediaFileName] = useState("");
  const [attachingMedia, setAttachingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [expandedCampaignId, setExpandedCampaignId] = useState<number | null>(null);
  const [recipientDetail, setRecipientDetail] = useState<CampaignRecipient[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function toggleCampaignDetail(id: number) {
    if (expandedCampaignId === id) {
      setExpandedCampaignId(null);
      return;
    }
    setExpandedCampaignId(id);
    setLoadingDetail(true);
    const res = await fetch(`/api/admin/sms/${id}/recipients`);
    setRecipientDetail((await res.json()) as CampaignRecipient[]);
    setLoadingDetail(false);
  }

  async function loadHistory() {
    const res = await fetch("/api/admin/sms");
    setHistory((await res.json()) as Campaign[]);
  }

  async function loadMembers(resetSelection = false) {
    const res = await fetch("/api/admin/members");
    const rows = (await res.json()) as Member[];
    setAllMembers(rows);
    if (resetSelection) {
      setSelectedIds(
        new Set(
          rows
            .filter((m) => [...recipientGroups].some((g) => memberInGroup(m, g)) && m.phone && m.smsOptIn)
            .map((m) => m.id)
        )
      );
    }
  }

  useEffect(() => {
    void loadHistory();
    void loadMembers(true);
  }, []);

  async function attachMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaError("");
    setAttachingMedia(true);
    const formData = new FormData();
    formData.append("image", file);
    const result = await adminFetch<{ url: string }>("/api/admin/sms/media", {
      method: "POST",
      body: formData,
    });
    setAttachingMedia(false);
    if (!result.ok) {
      setMediaError(result.error);
      return;
    }
    setMediaUrl(result.data.url);
    setMediaFileName(file.name);
  }

  function removeMedia() {
    setMediaUrl("");
    setMediaFileName("");
  }

  const withPhone = allMembers.filter((m) => m.phone && m.smsOptIn);
  const activeMembers = withPhone.filter((m) => [...recipientGroups].some((g) => memberInGroup(m, g)));
  const noPhoneCount = allMembers.filter(
    (m) => [...recipientGroups].some((g) => memberInGroup(m, g)) && !m.phone
  ).length;
  const noOptInCount = allMembers.filter(
    (m) => [...recipientGroups].some((g) => memberInGroup(m, g)) && m.phone && !m.smsOptIn
  ).length;

  function toggleRecipientGroup(group: string) {
    const next = new Set(recipientGroups);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setRecipientGroups(next);
    setSelectedIds(
      new Set(withPhone.filter((m) => [...next].some((g) => memberInGroup(m, g))).map((m) => m.id))
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setResult("Select at least one recipient");
      return;
    }
    const allSelected = selectedIds.size === activeMembers.length;
    const confirmMessage = allSelected
      ? "Send this text to every selected contact? There is no undo."
      : `Send this text to the ${selectedIds.size} selected contact${selectedIds.size === 1 ? "" : "s"}? There is no undo.`;
    const ok = await confirm(confirmMessage, "Yes, send");
    if (!ok) return;
    setSending(true);
    setResult("");
    const result = await adminFetch<{ sentCount?: number; failedCount?: number }>("/api/admin/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, memberIds: Array.from(selectedIds), mediaUrl: mediaUrl || undefined }),
    });
    setSending(false);
    if (!result.ok) {
      setResult(result.error);
      return;
    }
    setResult(`Sent to ${result.data.sentCount} contacts (${result.data.failedCount} failed).`);
    setBody("");
    removeMedia();
    void loadHistory();
    void loadMembers(true);
  }

  const allSelected = activeMembers.length > 0 && selectedIds.size === activeMembers.length;

  return (
    <div>
      {dialog}
      <h1>Send Text Message</h1>
      <p className="admin-note">
        Choose who should receive this message below, then double-check it before sending — there
        is no undo.
      </p>

      <form className="admin-form" onSubmit={send}>
        <label>
          Message
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1600}
            rows={5}
            required
          />
        </label>
        <p className="admin-note">{body.length} / 1600 characters</p>

        <label>
          Attach a picture (optional — sends as a picture message/MMS)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={attachMedia}
            disabled={attachingMedia}
          />
        </label>
        {mediaError && <p className="admin-error">{mediaError}</p>}
        {mediaUrl && (
          <p className="admin-note">
            {mediaFileName}{" "}
            <button type="button" onClick={removeMedia}>
              Remove
            </button>
          </p>
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
        {noPhoneCount > 0 && (
          <p className="admin-note">
            {noPhoneCount} contact{noPhoneCount === 1 ? "" : "s"} in the selected groups have no
            phone number on file and are excluded.
          </p>
        )}
        {noOptInCount > 0 && (
          <p className="admin-note">
            {noOptInCount} contact{noOptInCount === 1 ? "" : "s"} in the selected groups haven&apos;t
            opted in to texts and are excluded.
          </p>
        )}

        <RecipientPicker members={activeMembers} selectedIds={selectedIds} onChange={setSelectedIds} />

        {result && <p className="admin-note">{result}</p>}
        <button type="submit" disabled={sending || selectedIds.size === 0}>
          {sending
            ? "Sending…"
            : allSelected
              ? `Send to all contacts (${activeMembers.length})`
              : `Send to ${selectedIds.size} selected contact${selectedIds.size === 1 ? "" : "s"}`}
        </button>
      </form>

      <h2>Send history</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Message</th>
            <th>To</th>
            <th>Sent at</th>
            <th>Sent / Failed</th>
            <th>Delivered</th>
            <th>Undelivered</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {history.map((c) => (
            <Fragment key={c.id}>
              <tr className="admin-table-row-clickable" onClick={() => void toggleCampaignDetail(c.id)}>
                <td>
                  {c.body}
                  {c.mediaUrl && (
                    <>
                      {" "}
                      <a href={c.mediaUrl} target="_blank" rel="noopener">
                        (picture)
                      </a>
                    </>
                  )}
                </td>
                <td>{c.recipientPhone ?? "All contacts"}</td>
                <td>{c.sentAt}</td>
                <td>
                  {c.sentCount} / {c.failedCount}
                </td>
                <td>{c.deliveredCount}</td>
                <td>{c.undeliveredCount}</td>
                <td>{c.createdBy}</td>
              </tr>
              {expandedCampaignId === c.id && (
                <tr>
                  <td colSpan={7}>
                    {loadingDetail ? (
                      <p className="admin-note">Loading…</p>
                    ) : (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Recipient</th>
                            <th>Status</th>
                            <th>Delivered</th>
                            <th>Undelivered</th>
                            <th>Send error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipientDetail.map((r) => (
                            <tr key={r.id}>
                              <td>{r.phone}</td>
                              <td>{r.status ?? "—"}</td>
                              <td>{r.deliveredAt ?? "—"}</td>
                              <td>{r.failedAt ? `${r.failedAt} (${r.errorCode ?? "unknown"})` : "—"}</td>
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
