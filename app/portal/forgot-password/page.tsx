import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function PortalForgotPasswordPage() {
  return (
    <>
      <Header active="portal" />
      <main className="container" id="main">
        <ForgotPasswordForm />
      </main>
      <Footer />
    </>
  );
}
