import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} Kiowa Gun Club. All rights reserved.</p>
        <p>
          <Link href="/admin/login" className="board-login-link">
            Board Login
          </Link>
        </p>
      </div>
    </footer>
  );
}
