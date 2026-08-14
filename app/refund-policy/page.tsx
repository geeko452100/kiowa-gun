import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Refund & Cancellation Policy - Kiowa Gun Club" };

export default function RefundPolicyPage() {
  return (
    <>
      <Header active="" />
      <main className="container" id="main">
        <section className="content-section">
          <h1>Refund & Cancellation Policy</h1>
          <p>
            Annual membership dues paid to Kiowa Gun Club are <strong>non-refundable</strong> once
            processed. Membership is non-transferable and cannot be assigned, sold, or gifted to
            another individual.
          </p>
          <p>
            If a dues charge was made in error (for example, a duplicate charge or a charge after
            membership was already canceled in writing), reach out via our{" "}
            <Link href="/contact">Contact Us</Link> page and we will review the charge.
          </p>
          <p>
            Members may cancel auto-renewal at any time by contacting the club before the next
            renewal date. Canceling auto-renewal stops future charges but does not refund dues
            already paid for the current membership term.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
