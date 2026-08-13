import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ResetPasswordForm from "./ResetPasswordForm";

export default function PortalResetPasswordPage() {
  return (
    <>
      <Header active="portal" />
      <main className="container" id="main">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
