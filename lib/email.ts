import { getCloudflareContext } from "@opennextjs/cloudflare";

const FROM_NAME = "Kiowa Gun Club Admin";
const FROM_EMAIL = "admin@prairiewebstudio.com";

export async function sendAdminEmail(to: string, subject: string, html: string) {
  const { env } = await getCloudflareContext({ async: true });
  return sendPostmarkEmail(env.POSTMARK_SERVER_TOKEN, {
    from: { name: FROM_NAME, email: FROM_EMAIL },
    to,
    subject,
    html,
  });
}

export type EmailAttachment = {
  Name: string;
  Content: string; // base64
  ContentType: string;
  // Set to "cid:<matching id from the HtmlBody's <img src="cid:...">>" to embed
  // the image inline instead of showing it as a downloadable attachment.
  ContentID?: string;
};

export async function sendPostmarkEmail(
  serverToken: string,
  {
    from,
    to,
    subject,
    html,
    attachments,
  }: {
    from: { name: string; email: string };
    to: string;
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
  }
) {
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-postmark-server-token": serverToken,
    },
    body: JSON.stringify({
      From: `${from.name} <${from.email}>`,
      To: to,
      Subject: subject,
      HtmlBody: html,
      TrackOpens: true,
      TrackLinks: "HtmlAndText",
      ...(attachments && attachments.length > 0 ? { Attachments: attachments } : {}),
    }),
  });
  if (!res.ok) {
    return { error: await res.text(), messageId: null };
  }
  const body = (await res.json()) as { MessageID: string };
  return { error: null, messageId: body.MessageID };
}
