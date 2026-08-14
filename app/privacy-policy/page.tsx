import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Privacy Policy - Kiowa Gun Club" };

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header active="" />
      <main className="container" id="main">
        <section className="content-section">
          <h1>Privacy Policy</h1>
          <p>
            This policy describes what information Kiowa Gun Club collects from members and site
            visitors, and how it is used.
          </p>

          <h3>Information We Collect</h3>
          <p>
            When you apply for or hold membership, we collect information such as your name,
            email address, phone number, mailing address, and NRA number (if provided). If you
            opt in to text messages, we record your consent and use your phone number to send
            board broadcasts and renewal reminders.
          </p>

          <h3>Payment Information</h3>
          <p>
            Dues payments are processed by a third-party payment processor. The club does not
            collect or store your full card number — the processor returns a reference token used
            to identify your payment method for renewals, and only that token, along with payment
            status and history, is stored in our system.
          </p>

          <h3>How We Use Your Information</h3>
          <p>
            We use member information to manage membership status, process dues payments and
            renewals, communicate club news and events by email or text, and verify range rule
            acknowledgement. We do not sell member information to third parties.
          </p>

          <h3>Who Can See Your Information</h3>
          <p>
            Member contact and payment records are visible to authorized club board members for
            the purpose of managing membership and dues.
          </p>

          <h3>Your Choices</h3>
          <p>
            You can opt out of text messages at any time, and can update or request removal of
            your contact information by reaching out via our{" "}
            <Link href="/contact">Contact Us</Link> page.
          </p>

          <h3>Changes</h3>
          <p>
            The club may update this policy from time to time. Continued use of the site or
            membership after changes are posted constitutes acceptance of the updated policy.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
