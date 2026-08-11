import { desc, eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/schema";
import { getCurrentMember } from "@/lib/memberAuth";
import { MEMBERSHIP_FILE_FIELDS } from "@/lib/constants";
import MembershipForm from "@/components/MembershipForm";
import ChangePasswordForm from "@/components/portal/ChangePasswordForm";
import PaymentSection from "@/components/portal/PaymentSection";
import PortalLogoutButton from "@/components/portal/PortalLogoutButton";

export const metadata = { title: "Member Portal - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function PortalDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  // Layout already redirects to /portal/login if there's no session, and
  // gates this page entirely behind emailVerified.
  const member = (await getCurrentMember())!;
  const { env } = await getCloudflareContext({ async: true });
  const { verified } = await searchParams;

  const db = await getDb();
  const docs = await db
    .select({ category: documents.category, fileName: documents.fileName, reviewed: documents.reviewed })
    .from(documents)
    .where(eq(documents.memberId, member.id))
    .orderBy(desc(documents.uploadedAt));
  const latestByCategory = new Map<string, { fileName: string; reviewed: number }>();
  for (const doc of docs) {
    if (!latestByCategory.has(doc.category)) {
      latestByCategory.set(doc.category, { fileName: doc.fileName, reviewed: doc.reviewed });
    }
  }

  const initialValues = {
    name: member.name,
    email: member.email,
    phone: member.phone ?? "",
    smsOptIn: !!member.smsOptIn,
    address: member.address ?? "",
    nraNumber: member.nraNumber ?? "",
    rulesAcknowledgedPrintedName: member.rulesAcknowledgedPrintedName,
    rulesAcknowledgedName: member.rulesAcknowledgedName,
    rulesAcknowledgedAt: member.rulesAcknowledgedAt,
    documents: MEMBERSHIP_FILE_FIELDS.map((f) => ({
      field: f.field,
      label: f.label,
      fileName: latestByCategory.get(f.category)?.fileName ?? null,
      reviewed: latestByCategory.get(f.category)?.reviewed !== 0,
    })),
  };

  return (
    <div className="portal-dashboard">
      <h1>Welcome, {member.name}</h1>

      {verified === "1" && <p className="portal-saved">Your email is verified — thanks for confirming.</p>}

      <section className="portal-panel">
        <h2>Your Info</h2>
        <MembershipForm
          // Forces a remount (resetting this client component's internal
          // state) whenever the server-fetched data actually changes --
          // otherwise React keeps the state from first mount and a freshly
          // saved document/field wouldn't show as updated. See the comment
          // in MembershipForm's portal-mode submit handler.
          key={JSON.stringify(initialValues)}
          mode="portal"
          initialValues={initialValues}
        />
      </section>

      <section className="portal-panel">
        <h2>Dues Payment</h2>
        <PaymentSection
          email={member.email}
          tokenizationKey={env.NMI_TOKENIZATION_KEY}
          hasSubscription={!!member.nmiCustomerVaultId}
          subscriptionStatus={member.subscriptionStatus}
        />
      </section>

      <section className="portal-panel">
        <h2>Change Password</h2>
        <ChangePasswordForm />
      </section>

      <PortalLogoutButton />
    </div>
  );
}
