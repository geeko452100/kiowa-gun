import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} Kiowa Gun Club. All rights reserved.</p>
        <nav className="footer-legal-links" aria-label="Legal">
          <Link href="/refund-policy">Refund & Cancellation Policy</Link>
          <Link href="/terms-of-service">Terms of Service</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/shipping-policy">Shipping Policy</Link>
        </nav>
        <Link href="/admin/login" className="board-login-link">
          Board Login
        </Link>
      </div>
    </footer>
  );
}
