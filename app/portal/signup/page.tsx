import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignupForm from "./SignupForm";

export const metadata = { title: "Member Sign Up - Kiowa Gun Club" };

export default function PortalSignupPage() {
  return (
    <>
      <Header active="portal" />
      <main className="container" id="main">
        <SignupForm />
      </main>
      <Footer />
    </>
  );
}
