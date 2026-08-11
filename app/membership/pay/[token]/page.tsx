import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { membershipInvoices, members } from "@/lib/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InvoicePaymentForm from "@/components/InvoicePaymentForm";
import "../../../styles/apply.css";

export const metadata = { title: "Pay Your Dues - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function InvoicePaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getDb();
  const [invoice] = await db.select().from(membershipInvoices).where(eq(membershipInvoices.token, token));
  const member = invoice ? (await db.select().from(members).where(eq(members.id, invoice.memberId)))[0] : null;
  const { env } = await getCloudflareContext({ async: true });

  return (
    <>
      <Header active="membership" />
      <main className="container apply-main" id="main">
        <section className="apply-step">
          {!invoice || !member ? (
            <>
              <h2>Invoice Not Found</h2>
              <p>This payment link isn&apos;t valid. Contact the club if you believe this is a mistake.</p>
            </>
          ) : invoice.paidAt ? (
            <>
              <h2>Already Paid</h2>
              <p>This invoice has already been paid. Thanks, {member.name}!</p>
            </>
          ) : (
            <>
              <h2>Pay Your Dues</h2>
              <p className="apply-step-intro">
                Welcome, {member.name} — your background check has been cleared. Pay your first
                year&apos;s dues below to complete your membership.
              </p>
              <InvoicePaymentForm token={token} tokenizationKey={env.NMI_TOKENIZATION_KEY} />
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
