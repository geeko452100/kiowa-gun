import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Payment Cancelled - Kiowa Gun Club" };

export default function DuesCancelPage() {
  return (
    <>
      <Header active="dues" />
      <main className="container" id="main">
        <section className="content-section">
          <h1>Payment Cancelled</h1>
          <p>No payment was made. You can try again whenever you&apos;re ready.</p>
          <p>
            <Link href="/dues">Back to Pay Dues</Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
