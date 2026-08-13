import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ResetPasswordForm from "./ResetPasswordForm";

export default function AdminResetPasswordPage() {
  return (
    <>
      <Header active="dashboard" />
      <main className="container" id="main">
        <div className="admin-shell admin-shell-centered">
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
