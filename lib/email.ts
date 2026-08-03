import { Resend } from "resend";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const FROM = "Kiowa Gun Club Admin <admin@kiowa.prairiewebstudio.com>";

export async function sendAdminEmail(to: string, subject: string, html: string) {
  const { env } = await getCloudflareContext({ async: true });
  const resend = new Resend(env.RESEND_API_KEY);
  return resend.emails.send({ from: FROM, to, subject, html });
}
