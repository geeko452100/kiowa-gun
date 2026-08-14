import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Terms of Service - Kiowa Gun Club" };

export default function TermsOfServicePage() {
  return (
    <>
      <Header active="" />
      <main className="container" id="main">
        <section className="content-section">
          <h1>Terms of Service</h1>
          <p>
            By using this website and applying for or maintaining membership with Kiowa Gun Club,
            you agree to the following terms.
          </p>

          <h3>Membership</h3>
          <p>
            Membership is granted at the club&apos;s discretion and requires acknowledgement of
            the club&apos;s <Link href="/rules">Range Rules</Link>. Members are responsible for
            keeping their contact information current and for following all posted range rules
            while on club property.
          </p>

          <h3>Dues and Payment</h3>
          <p>
            Membership dues are billed annually and may auto-renew, as described at{" "}
            <Link href="/membership">Membership Info</Link>. Payments are processed by a
            third-party payment processor; the club does not store your full card number. See our{" "}
            <Link href="/refund-policy">Refund & Cancellation Policy</Link> for details on
            refunds and canceling auto-renewal.
          </p>

          <h3>Account Use</h3>
          <p>
            The member portal is for the use of the account holder only. You are responsible for
            keeping your login credentials confidential and for all activity under your account.
          </p>

          <h3>Assumption of Risk</h3>
          <p>
            Use of the range and club facilities involves inherent risks associated with firearms.
            Members and guests use club property at their own risk and agree to follow all safety
            rules posted or communicated by the club.
          </p>

          <h3>Changes</h3>
          <p>
            The club may update these terms from time to time. Continued use of the site or
            membership after changes are posted constitutes acceptance of the updated terms.
          </p>

          <h3>Contact</h3>
          <p>
            Questions about these terms can be directed to us via our{" "}
            <Link href="/contact">Contact Us</Link> page.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
