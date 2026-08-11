import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { getCurrentAdmin } from "@/lib/auth";
import { canManageBoard, canManageRole, roleLabel } from "@/lib/roles";
import UnlockAccountButton from "@/components/admin/UnlockAccountButton";
import { getDb } from "@/lib/db";
import {
  payments,
  members,
  emailCampaigns,
  emailCampaignRecipients,
  smsCampaigns,
  adminUsers,
} from "@/lib/schema";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const admin = await getCurrentAdmin();
  const db = await getDb();

  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [[{ total: collectedThisYear }], [{ active, pastDue }], [{ member, waiting, nonMember }]] =
    await Promise.all([
      db
        .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)` })
        .from(payments)
        .where(sql`${payments.paidAt} >= ${yearStart}`),
      db
        .select({
          active: sql<number>`count(case when ${members.subscriptionStatus} = 'active' then 1 end)`,
          pastDue: sql<number>`count(case when ${members.subscriptionStatus} = 'past_due' then 1 end)`,
        })
        .from(members),
      db
        .select({
          member: sql<number>`count(case when ${members.status} = 'Member' then 1 end)`,
          waiting: sql<number>`count(case when ${members.status} = 'Waiting List' then 1 end)`,
          nonMember: sql<number>`count(case when ${members.status} = 'Non-Member' then 1 end)`,
        })
        .from(members),
    ]);

  const [recentPayments, [lastEmail], [lastSms]] = await Promise.all([
    db
      .select({
        memberName: members.name,
        amountCents: payments.amountCents,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .innerJoin(members, eq(payments.memberId, members.id))
      .orderBy(desc(payments.paidAt))
      .limit(5),
    db
      .select({
        id: emailCampaigns.id,
        subject: emailCampaigns.subject,
        sentAt: emailCampaigns.sentAt,
        sentCount: emailCampaigns.sentCount,
        failedCount: emailCampaigns.failedCount,
        openedCount: sql<number>`count(distinct case when ${emailCampaignRecipients.openedAt} is not null then ${emailCampaignRecipients.id} end)`,
        bouncedCount: sql<number>`count(distinct case when ${emailCampaignRecipients.bouncedAt} is not null then ${emailCampaignRecipients.id} end)`,
      })
      .from(emailCampaigns)
      .leftJoin(emailCampaignRecipients, eq(emailCampaignRecipients.campaignId, emailCampaigns.id))
      .groupBy(emailCampaigns.id)
      .orderBy(desc(emailCampaigns.sentAt))
      .limit(1),
    db.select().from(smsCampaigns).orderBy(desc(smsCampaigns.sentAt)).limit(1),
  ]);

  const openRate =
    lastEmail && lastEmail.sentCount > 0 ? Math.round((lastEmail.openedCount / lastEmail.sentCount) * 100) : null;

  const showLoginSecurity = canManageBoard(admin?.role);
  const loginAccounts = showLoginSecurity
    ? await db
        .select({
          id: adminUsers.id,
          name: adminUsers.name,
          role: adminUsers.role,
          failedLoginCount: adminUsers.failedLoginCount,
          lockedUntil: adminUsers.lockedUntil,
        })
        .from(adminUsers)
        .orderBy(desc(adminUsers.failedLoginCount))
    : [];
  const lockedNow = loginAccounts.filter((a) => a.lockedUntil && a.lockedUntil > Date.now());
  const flagged = loginAccounts.filter((a) => !lockedNow.includes(a) && a.failedLoginCount > 0);

  return (
    <div>
      <h1>Welcome, {admin?.name}</h1>
      <p className="admin-note">
        This dashboard is for calendar, matches, forms, members, and sending emails/texts. To edit
        the wording, pictures, or documents shown on the public site, click &quot;Edit Site
        Layout&quot; above instead. Below is a quick look at dues payments and recent messages.
      </p>

      <h2 className="dashboard-section-heading">Membership Dues</h2>
      <div className="dashboard-stat-grid">
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-number">{formatCents(collectedThisYear)}</div>
          <div className="dashboard-stat-label">Collected in dues this year</div>
        </div>
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-number">{active}</div>
          <div className="dashboard-stat-label">Members paid up and current</div>
        </div>
        <div className={`dashboard-stat-card${pastDue > 0 ? " dashboard-stat-card-warn" : ""}`}>
          <div className="dashboard-stat-number">{pastDue}</div>
          <div className="dashboard-stat-label">Members behind on payment</div>
        </div>
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-number">{member}</div>
          <div className="dashboard-stat-label">
            Current members ({waiting} on waiting list, {nonMember} non-members)
          </div>
        </div>
      </div>
      {recentPayments.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p, i) => (
                <tr key={i}>
                  <td data-label="Member">{p.memberName}</td>
                  <td data-label="Amount">{formatCents(p.amountCents)}</td>
                  <td data-label="Date">{formatDate(p.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Link className="admin-link" href="/admin/payments">
        See all payments →
      </Link>

      <h2 className="dashboard-section-heading">Recent Messages</h2>
      <div className="dashboard-stat-grid">
        {lastEmail ? (
          <div className="dashboard-message-card">
            <div className="dashboard-message-title">Last Email — &ldquo;{lastEmail.subject}&rdquo;</div>
            <p className="admin-note">
              Sent to {lastEmail.sentCount} {lastEmail.sentCount === 1 ? "person" : "people"} on{" "}
              {formatDate(lastEmail.sentAt)}.{" "}
              {openRate !== null && `${lastEmail.openedCount} opened it (about ${openRate}%).`}
              {lastEmail.bouncedCount > 0 && ` ${lastEmail.bouncedCount} did not go through.`}
            </p>
          </div>
        ) : (
          <div className="dashboard-message-card">
            <p className="admin-note">No emails have been sent yet.</p>
          </div>
        )}
        {lastSms ? (
          <div className="dashboard-message-card">
            <div className="dashboard-message-title">Last Text Message</div>
            <p className="admin-note">
              Sent to {lastSms.sentCount} {lastSms.sentCount === 1 ? "person" : "people"} on{" "}
              {formatDate(lastSms.sentAt)}.
              {lastSms.failedCount > 0 && ` ${lastSms.failedCount} did not go through.`}
            </p>
          </div>
        ) : (
          <div className="dashboard-message-card">
            <p className="admin-note">No text messages have been sent yet.</p>
          </div>
        )}
      </div>
      <div className="admin-row-actions">
        <Link className="admin-link" href="/admin/email">
          Send / view emails →
        </Link>
        <Link className="admin-link" href="/admin/sms">
          Send / view texts →
        </Link>
      </div>

      {showLoginSecurity && (
        <>
          <h2 className="dashboard-section-heading">Board Login Security</h2>
          {lockedNow.length === 0 && flagged.length === 0 ? (
            <div className="dashboard-message-card">
              <p className="admin-note">
                No locked-out accounts and no recent failed sign-in attempts. Everything looks
                normal.
              </p>
            </div>
          ) : (
            <div className="dashboard-stat-grid">
              {lockedNow.map((a) => (
                <div key={a.id} className="dashboard-stat-card dashboard-stat-card-warn">
                  <div className="dashboard-message-title">{a.name}</div>
                  <div className="dashboard-stat-label">
                    Locked out until{" "}
                    {new Date(a.lockedUntil as number).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    after too many failed sign-in attempts ({roleLabel(a.role)}).
                  </div>
                  {canManageRole(admin?.role, a.role) && <UnlockAccountButton id={a.id} name={a.name} />}
                </div>
              ))}
              {flagged.map((a) => (
                <div key={a.id} className="dashboard-stat-card">
                  <div className="dashboard-message-title">{a.name}</div>
                  <div className="dashboard-stat-label">
                    {a.failedLoginCount} recent failed sign-in {a.failedLoginCount === 1 ? "attempt" : "attempts"} —
                    not locked out ({roleLabel(a.role)}).
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
