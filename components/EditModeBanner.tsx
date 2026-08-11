import Link from "next/link";
import "@/app/styles/editable-section.css";

// Shown at the top of every public page when a board member is logged in, so
// the small in-place "Edit" buttons further down the page aren't the only
// clue that editing is possible here.
export default function EditModeBanner({ name }: { name: string }) {
  return (
    <div className="edit-mode-banner">
      <span>
        <strong>Edit mode</strong> — you&apos;re logged in as {name}. Look for the{" "}
        <strong>✎ Edit this section</strong> buttons below to change text, pictures, or documents
        on this page.
      </span>
      <Link href="/admin/dashboard" className="edit-mode-banner-link">
        Go to Dashboard
      </Link>
    </div>
  );
}
