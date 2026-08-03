import { getCurrentAdmin } from "@/lib/auth";

export default async function DashboardPage() {
  const admin = await getCurrentAdmin();
  return (
    <div>
      <h1>Welcome, {admin?.name}</h1>
      <p className="admin-note">
        Use the menu on the left to update the calendar, page text, news, match schedule,
        downloadable forms, member list, and to send emails to members.
      </p>
    </div>
  );
}
