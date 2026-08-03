import type { Metadata } from "next";
import "./styles/styles.css";

export const metadata: Metadata = {
  title: "Kiowa Gun Club - Great Bend Kansas",
  description:
    "Kiowa Gun Club is one of the oldest established shooting clubs in the central Kansas region, offering monthly matches, membership, and range facilities near Great Bend, KS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700&display=swap"
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
