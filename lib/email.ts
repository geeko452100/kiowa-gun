import { getCloudflareContext } from "@opennextjs/cloudflare";

export const FROM_NAME = "Kiowa Gun Club Admin";
export const FROM_EMAIL = "admin@kiowa.prairiewebstudio.com";

export async function sendAdminEmail(to: string, subject: string, html: string) {
  const { env } = await getCloudflareContext({ async: true });
  return sendResendEmail(env.RESEND_API, {
    from: { name: FROM_NAME, email: FROM_EMAIL },
    to,
    subject,
    html,
  });
}

export type EmailAttachment = {
  filename: string;
  content: string; // base64
  content_type: string;
  // Set to the matching id referenced by the HtmlBody's <img src="cid:...">
  // to embed the image inline instead of showing it as a downloadable
  // attachment.
  content_id?: string;
};

export async function sendResendEmail(
  apiKey: string,
  {
    from,
    to,
    subject,
    html,
    text,
    attachments,
  }: {
    from: { name: string; email: string };
    to: string;
    subject: string;
    // Exactly one of html/text is expected -- html for normal member email,
    // text for carrier email-to-SMS gateways (lib/sms.ts), which relay only
    // plain text and often mangle or strip HTML.
    html?: string;
    text?: string;
    attachments?: EmailAttachment[];
  }
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `${from.name} <${from.email}>`,
      to,
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
    }),
  });
  if (!res.ok) {
    return { error: await res.text(), messageId: null };
  }
  const body = (await res.json()) as { id: string };
  return { error: null, messageId: body.id };
}

// Sends up to 100 independently-addressed emails (Resend's batch cap) in one
// API call -- used by the admin bulk-email tool instead of one call per
// recipient, since a single board send can go to 200+ members. A non-2xx
// response fails the whole batch (Resend gives no documented per-item
// failure shape), so every message in it is reported as failed.
export async function sendResendBatch(
  apiKey: string,
  messages: {
    from: { name: string; email: string };
    to: string;
    subject: string;
    html?: string;
    text?: string;
    attachments?: EmailAttachment[];
  }[]
): Promise<{ error: string | null; messageId: string | null }[]> {
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(
      messages.map(({ from, to, subject, html, text, attachments }) => ({
        from: `${from.name} <${from.email}>`,
        to,
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      }))
    ),
  });
  if (!res.ok) {
    const error = await res.text();
    return messages.map(() => ({ error, messageId: null }));
  }
  const body = (await res.json()) as { data: { id: string }[] };
  return body.data.map(({ id }) => ({ error: null, messageId: id }));
}
