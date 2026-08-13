import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ApplyWizardProvider } from "@/components/apply/ApplyWizardContext";
import ApplyStageBanner from "@/components/apply/ApplyStageBanner";

export const metadata = { title: "Apply for Membership - Kiowa Gun Club" };

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header active="membership" />
      <ApplyStageBanner />
      <main className="container apply-main" id="main">
        <ApplyWizardProvider>
          {children}
        </ApplyWizardProvider>
      </main>
      <Footer />
    </>
  );
}
