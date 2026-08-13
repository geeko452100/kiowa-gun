import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginForm from "./LoginForm";

export const metadata = { title: "Member Login - Kiowa Gun Club" };

export default function PortalLoginPage() {
  return (
    <>
      <Header active="portal" />
      <main className="container" id="main">
        <LoginForm />
      </main>
      <Footer />
    </>
  );
}
