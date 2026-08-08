import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DuesForm from "@/components/DuesForm";
import "../styles/dues.css";

export const metadata = { title: "Pay Dues - Kiowa Gun Club" };

export default function DuesPage() {
  return (
    <>
      <Header active="dues" />
      <main className="container" id="main">
        <section id="dues" className="content-section">
          <h1>Pay Your Dues</h1>
          <p>
            Enter the email address on file with the club, then complete payment through
            Stripe&apos;s secure checkout. Card, bank transfer, and other payment methods are
            accepted.
          </p>
          <DuesForm />
        </section>
      </main>
      <Footer />
    </>
  );
}
