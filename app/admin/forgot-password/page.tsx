import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ForgotPasswordForm from "./ForgotPasswordForm";
import "../admin.css";

export default function AdminForgotPasswordPage() {
  return (
    <>
      <Header active="dashboard" />
      <main className="container" id="main">
        <div className="admin-shell admin-shell-centered">
          <ForgotPasswordForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
