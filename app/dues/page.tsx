import { getCloudflareContext } from "@opennextjs/cloudflare";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Pay Your Dues - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function DuesPage() {
  const { env } = await getCloudflareContext({ async: true });
  const paymentLink = env.STRIPE_PAYMENT_LINK_URL || null;

  return (
    <>
      <Header active="dues" />
      <main className="container apply-main" id="main">
        <section className="apply-step">
          <h2>Pay Your Dues</h2>
          <p className="apply-step-intro">
            Welcome, member — your dues payment is quick and secure. Click below to pay with
            Stripe and complete your membership for the current year.
          </p>

          {paymentLink ? (
            <p>
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "0.8rem 1.4rem",
                  background: "#2b6cb0",
                  color: "white",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Pay Dues
              </a>
            </p>
          ) : (
            <p className="membership-form-error">
              Online card payment isn&apos;t configured yet. Contact the club to pay dues another way.
            </p>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
