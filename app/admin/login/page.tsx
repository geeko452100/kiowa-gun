import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginForm from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <>
      <Header active="dashboard" />
      <main className="container" id="main">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
