import { getCloudflareContext } from "@opennextjs/cloudflare";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DuesForm from "@/components/DuesForm";
import "../styles/dues.css";

export const metadata = { title: "Pay Dues - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function DuesPage() {
  const { env } = await getCloudflareContext({ async: true });

  return (
    <>
      <Header active="dues" />
      <main className="container" id="main">
        <section id="dues" className="content-section">
          <h1>Pay Your Dues</h1>
          <p>
            Enter the email address on file with the club, then enter your card info below. This
            sets up your annual dues to renew automatically each year.
          </p>
          <DuesForm tokenizationKey={env.NMI_TOKENIZATION_KEY} />
        </section>
      </main>
      <Footer />
    </>
  );
}
