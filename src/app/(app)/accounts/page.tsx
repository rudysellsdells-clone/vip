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
import { CreateAccountForm } from "@/components/accounts/CreateAccountForm";
import { InviteAccountMemberForm } from "@/components/accounts/InviteAccountMemberForm";
import { ArchiveAccountButton } from "@/components/accounts/ArchiveAccountButton";
import accountStyles from "@/components/accounts/AccountForms.module.css";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type AccountRow = {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  primary_cta: string | null;
  status: string;
  owner_user_id: string;
  created_at: string;
};

type MembershipRow = {
  id: string;
  account_id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  removed_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  platform_role?: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function groupMembershipsByAccount(memberships: MembershipRow[]) {
  return memberships.reduce<Record<string, MembershipRow[]>>((groups, membership) => {
    if (!groups[membership.account_id]) {
      groups[membership.account_id] = [];
    }

    groups[membership.account_id].push(membership);
    return groups;
  }, {});
}

export default async function AccountsPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: accountsData }, { data: membershipsData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,full_name,platform_role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("*")
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase
      .from("account_memberships")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  const currentProfile = profile as ProfileRow | null;
  const accounts = ((accountsData ?? []) as AccountRow[]).filter((account) => account.status !== "archived");
  const memberships = ((membershipsData ?? []) as MembershipRow[]).filter(
    (membership) => !membership.removed_at,
  );
  const membershipsByAccount = groupMembershipsByAccount(memberships);
  const pendingCount = memberships.filter((membership) => membership.status === "pending").length;
  const activeCount = memberships.filter((membership) => membership.status === "active").length;
  const canCreateAccounts = currentProfile?.platform_role === "owner" || currentProfile?.platform_role === "admin";

  return (
    <WebsitePage>
      <div className={accountStyles.accountPage}>
      <WebsiteHero
        eyebrow="Phase 3B · Accounts"
        title="Manage client accounts and workspace access."
        description="Create separate accounts for clients or brands, assign owners, and invite the people who should review, edit, or approve work inside each workspace."
        primaryAction={{ label: "Settings", href: "/settings" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Accounts"
          value={accounts.length}
          description="Separate client, company, or brand workspaces you can manage."
          dot="blue"
        />
        <WebsiteMetric
          label="Active Seats"
          value={activeCount}
          description="Users currently attached to one or more accounts."
          dot="green"
        />
        <WebsiteMetric
          label="Pending Invites"
          value={pendingCount}
          description="People invited or recorded as pending account members."
          dot="gold"
        />
        <WebsiteMetric
          label="Your Role"
          value={currentProfile?.platform_role ?? "user"}
          description="Platform-level role for creating and managing accounts."
          dot="purple"
        />
      </section>

      {canCreateAccounts ? (
        <WebsiteSection
          eyebrow="Create Account"
          title="Add a new client or brand workspace"
          description="Use this when you want a separate account, not just another seat under your own account. You remain the managing owner while the invited owner is recorded for that account."
        >
          <CreateAccountForm />
        </WebsiteSection>
      ) : (
        <WebsiteSection
          eyebrow="Access"
          title="Account creation is limited"
          description="Your user can access assigned accounts, but only a VIP owner or admin can create separate client accounts."
        >
          <div className={websiteStyles.card}>
            <p className={websiteStyles.cardText}>
              Ask the account owner to create the workspace or promote your platform role.
            </p>
          </div>
        </WebsiteSection>
      )}

      <WebsiteSection
        eyebrow="Workspaces"
        title="Accounts you can manage"
        description="Each account can have its own owner, seats, brand profile, campaigns, and publishing setup as Phase 3 continues."
      >
        <div className={accountStyles.accountsList}>
          {accounts.length ? (
            accounts.map((account) => {
              const accountMemberships = membershipsByAccount[account.id] ?? [];
              const activeMembers = accountMemberships.filter((membership) => membership.status === "active").length;
              const pendingMembers = accountMemberships.filter((membership) => membership.status === "pending").length;

              return (
                <article key={account.id} className={accountStyles.accountManageCard}>
                  <div className={accountStyles.accountManageHeaderGrid}>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-slate-950">
                          <Link href={`/accounts/${account.id}`} className="hover:text-blue-700">
                            {account.name}
                          </Link>
                        </h3>
                        <WebsiteBadge status={account.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Slug: <span className="font-mono text-slate-800">{account.slug}</span>
                      </p>
                      <div className={accountStyles.accountManageDetailsGrid}>
                        <p>
                          <span className="font-semibold text-slate-800">Website:</span>{" "}
                          {account.website_url || "Not set"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Primary CTA:</span>{" "}
                          {account.primary_cta || "Not set"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Created:</span>{" "}
                          {formatDate(account.created_at)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Seats:</span>{" "}
                          {activeMembers} active, {pendingMembers} pending
                        </p>
                      </div>
                    </div>

                    <div className={accountStyles.accountManageActionPanel}>
                      <div>
                        <p className="font-semibold text-slate-900">Phase 3B foundation</p>
                        <p className="mt-1 max-w-sm">
                          The account exists now. Next, campaign and asset screens can be scoped to this workspace through an account switcher.
                        </p>
                      </div>
                      <div className={accountStyles.accountManageActions}>
                        <Link
                          href={`/accounts/${account.id}`}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700"
                        >
                          Manage Account
                        </Link>
                        {canCreateAccounts ? (
                          <ArchiveAccountButton accountId={account.id} accountName={account.name} />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className={accountStyles.accountMemberTableWrap}>
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
                        {accountMemberships.length ? (
                          accountMemberships.map((membership) => (
                            <tr key={membership.id}>
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-900">{membership.full_name || membership.email}</p>
                                <p className="text-xs text-slate-500">{membership.email}</p>
                              </td>
                              <td className="px-4 py-3 capitalize text-slate-700">{membership.role}</td>
                              <td className="px-4 py-3">
                                <WebsiteBadge status={membership.status} />
                              </td>
                              <td className="px-4 py-3 text-slate-600">{formatDate(membership.invited_at)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={4}>
                              No members recorded for this account yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <InviteAccountMemberForm accountId={account.id} />
                </article>
              );
            })
          ) : (
            <div className={websiteStyles.card}>
              <h3 className={websiteStyles.cardTitle}>No accounts yet</h3>
              <p className={websiteStyles.cardText}>
                Create your first managed client or brand account above.
              </p>
            </div>
          )}
        </div>
      </WebsiteSection>
      </div>
    </WebsitePage>
  );
}
