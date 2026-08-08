import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Payment Received - Kiowa Gun Club" };

export default function DuesSuccessPage() {
  return (
    <>
      <Header active="dues" />
      <main className="container" id="main">
        <section className="content-section">
          <h1>Thank You</h1>
          <p>Your payment was received. A receipt was sent to your email from Stripe.</p>
          <p>
            <Link href="/">Return home</Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
