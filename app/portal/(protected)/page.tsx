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

export default async function PortalDashboardPage() {
  // Layout already redirects to /portal/login if there's no session.
  const member = (await getCurrentMember())!;
  const { env } = await getCloudflareContext({ async: true });

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

  return (
    <div className="portal-dashboard">
      <h1>Welcome, {member.name}</h1>

      <section className="portal-panel">
        <h2>Your Info</h2>
        <MembershipForm
          mode="portal"
          initialValues={{
            name: member.name,
            email: member.email,
            phone: member.phone ?? "",
            address: member.address ?? "",
            rulesAcknowledgedName: member.rulesAcknowledgedName,
            rulesAcknowledgedAt: member.rulesAcknowledgedAt,
            documents: MEMBERSHIP_FILE_FIELDS.map((f) => ({
              field: f.field,
              label: f.label,
              fileName: latestByCategory.get(f.category)?.fileName ?? null,
              reviewed: latestByCategory.get(f.category)?.reviewed !== 0,
            })),
          }}
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
