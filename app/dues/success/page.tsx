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
          <p>
            Your payment was received. Dues are never billed automatically — we&apos;ll text you a
            reminder before next year&apos;s renewal is due, and you can pay from the member
            portal.
          </p>
          <p>
            <Link href="/">Return home</Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
