import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Shipping Policy - Kiowa Gun Club" };

export default function ShippingPolicyPage() {
  return (
    <>
      <Header active="" />
      <main className="container" id="main">
        <section className="content-section">
          <h1>Shipping Policy</h1>
          <p>All memberships are digitally activated; no physical goods are shipped.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
