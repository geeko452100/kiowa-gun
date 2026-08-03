import { Suspense } from "react";
import LoginForm from "./LoginForm";
import "../admin.css";

export default function AdminLoginPage() {
  return (
    <div className="admin-shell admin-shell-centered">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
