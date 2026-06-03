import Link from "next/link";
import { redirect } from "next/navigation";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { AccountBrandProfileForm } from "@/components/accounts/AccountBrandProfileForm";
import { AccountPublishingSettingsForm } from "@/components/accounts/AccountPublishingSettingsForm";
import { ArchiveAccountButton } from "@/components/accounts/ArchiveAccountButton";
import { InviteAccountMemberForm } from "@/components/accounts/InviteAccountMemberForm";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: account },
    { data: memberships },
    { data: brandProfile },
    { data: publishingSettings },
    { count: campaignCount },
    { count: assetCount },
  ] = await Promise.all([
    supabase.from("profiles").select("id,platform_role").eq("id", user.id).maybeSingle(),
    supabase.from("accounts").select("*").eq("id", accountId).maybeSingle(),
    supabase
      .from("account_memberships")
      .select("*")
      .eq("account_id", accountId)
      .is("removed_at", null)
      .order("created_at", { ascending: true }),
    supabase.from("account_brand_profiles").select("*").eq("account_id", accountId).maybeSingle(),
    supabase.from("account_publishing_settings").select("*").eq("account_id", accountId).maybeSingle(),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId),
    supabase
      .from("generated_assets")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId),
  ]);

  if (!account || account.status === "archived") {
    redirect("/accounts");
  }

  const profileRow = profile as { platform_role?: string | null } | null;
  const memberRows = (memberships ?? []) as Array<{
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    status: string;
    invited_at: string;
  }>;
  const activeMembers = memberRows.filter((membership) => membership.status === "active").length;
  const pendingMembers = memberRows.filter((membership) => membership.status === "pending").length;
  const canManage =
    profileRow?.platform_role === "owner" ||
    profileRow?.platform_role === "admin" ||
    account.owner_user_id === user.id ||
    memberRows.some(
      (membership) =>
        membership.email?.toLowerCase() === user.email?.toLowerCase() &&
        ["owner", "admin"].includes(membership.role) &&
        membership.status === "active",
    );

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Phase 3C · Account Workspace"
        title={account.name}
        description="Manage the account context VIP will use for campaigns, assets, publishing destinations, brand memory, and client access."
        primaryAction={{ label: "Back to Accounts", href: "/accounts" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Status" value={account.status} description="Current account state." dot="blue" />
        <WebsiteMetric label="Campaigns" value={campaignCount ?? 0} description="Campaigns currently tied to this account." dot="green" />
        <WebsiteMetric label="Assets" value={assetCount ?? 0} description="Generated assets currently tied to this account." dot="purple" />
        <WebsiteMetric label="Seats" value={`${activeMembers} / ${pendingMembers}`} description="Active and pending account members." dot="gold" />
      </section>

      <WebsiteSection
        eyebrow="Workspace"
        title="Account overview"
        description="This is the active account-level foundation. As Phase 3 continues, campaign and asset screens will increasingly use this account context."
      >
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Account details</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p><span className="font-semibold text-slate-800">Slug:</span> {account.slug}</p>
              <p><span className="font-semibold text-slate-800">Created:</span> {formatDate(account.created_at)}</p>
              <p><span className="font-semibold text-slate-800">Website:</span> {account.website_url || "Not set"}</p>
              <p><span className="font-semibold text-slate-800">Primary CTA:</span> {account.primary_cta || "Not set"}</p>
            </div>
          </div>

          <div className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Controls</h3>
            <p className={websiteStyles.cardText}>
              Use this workspace for account-level setup before creating or publishing client content.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/accounts" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700">
                All Accounts
              </Link>
              {canManage ? <ArchiveAccountButton accountId={account.id} accountName={account.name} /> : null}
            </div>
          </div>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Brand Profile"
        title="Account-specific brand memory"
        description="Define the default voice, offer, audience, CTA, and positioning VIP should use for this account."
      >
        {canManage ? (
          <AccountBrandProfileForm accountId={account.id} profile={brandProfile} />
        ) : (
          <p className={websiteStyles.cardText}>You can view this account, but only owners and admins can edit the brand profile.</p>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Publishing"
        title="Account publishing settings"
        description="Keep LinkedIn, Facebook, GalaxyAI, and CTA settings separate for each client or brand account."
      >
        {canManage ? (
          <AccountPublishingSettingsForm accountId={account.id} settings={publishingSettings} />
        ) : (
          <p className={websiteStyles.cardText}>You can view this account, but only owners and admins can edit publishing settings.</p>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Members"
        title="Account seats and access"
        description="Invite reviewers, editors, admins, or viewers to this account."
      >
        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Invited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {memberRows.length ? (
                  memberRows.map((membership) => (
                    <tr key={membership.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{membership.full_name || membership.email}</p>
                        <p className="text-xs text-slate-500">{membership.email}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-700">{membership.role}</td>
                      <td className="px-4 py-3"><WebsiteBadge status={membership.status} /></td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(membership.invited_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={4}>No members recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {canManage ? <InviteAccountMemberForm accountId={account.id} /> : null}
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
