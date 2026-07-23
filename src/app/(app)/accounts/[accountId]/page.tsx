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
import { AccountPublishingSettingsForm } from "@/components/accounts/AccountPublishingSettingsForm";
import { ArchiveAccountButton } from "@/components/accounts/ArchiveAccountButton";
import { InviteAccountMemberForm } from "@/components/accounts/InviteAccountMemberForm";
import { RemoveAccountMemberButton } from "@/components/accounts/RemoveAccountMemberButton";
import { UseAccountWorkspaceButton } from "@/components/accounts/UseAccountWorkspaceButton";
import accountStyles from "@/components/accounts/AccountForms.module.css";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import { getApprovedStrategyFoundation } from "@/lib/strategy/get-approved-strategy-foundation";
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

function compactValue(value: string | null | undefined) {
  return value && value.trim() ? value : "Not set";
}

const strategyAreas = [
  {
    label: "Business Truth",
    description: "Company identity, website, CTA, service areas, logo, and durable business facts.",
    href: "/strategy/business-truth",
  },
  {
    label: "Brand Voice",
    description: "Voice, business framing, audience understanding, offers, and sales outcomes.",
    href: "/strategy/brand-voice",
  },
  {
    label: "Offerings",
    description: "Service lines, offers, outcomes, package notes, and campaign calls-to-action.",
    href: "/strategy/offerings",
  },
  {
    label: "Audiences",
    description: "Buyer groups, pain points, desired outcomes, decision context, and objections.",
    href: "/strategy/audiences",
  },
  {
    label: "Messaging & Proof",
    description: "Differentiators, proof context, business outcomes, and approved messaging sources.",
    href: "/strategy/messaging-proof",
  },
  {
    label: "Brand Rules",
    description: "Prioritized voice, behavior, positioning, safety, and compliance guardrails.",
    href: "/strategy/brand-rules",
  },
  {
    label: "Knowledge",
    description: "Documents, source material, approved examples, testimonials, and business memory.",
    href: "/strategy/knowledge",
  },
] as const;

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

  if (!user) redirect("/login");

  const accountAccess = await getAccountAccessForUser({
    supabase,
    accountId,
    userId: user.id,
  });

  if (!accountAccess.canView) redirect("/accounts");

  const [
    { data: account },
    { data: memberships },
    { data: publishingSettings },
    { count: campaignCount },
    { count: assetCount },
  ] = await Promise.all([
    supabase.from("accounts").select("*").eq("id", accountId).maybeSingle(),
    supabase
      .from("account_memberships")
      .select("*")
      .eq("account_id", accountId)
      .is("removed_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("account_publishing_settings")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId),
    supabase
      .from("generated_assets")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId),
  ]);

  if (!account || account.status === "archived") redirect("/accounts");

  const foundation = await getApprovedStrategyFoundation({
    supabase,
    accountId,
  });
  const memberRows = (memberships ?? []) as Array<{
    id: string;
    user_id: string | null;
    email: string;
    full_name: string | null;
    role: string;
    status: string;
    invited_at: string;
  }>;
  const activeMembers = memberRows.filter(
    (membership) => membership.status === "active",
  ).length;
  const pendingMembers = memberRows.filter(
    (membership) => membership.status === "pending",
  ).length;
  const canManage = accountAccess.canManage;
  const configuredChannels = [
    publishingSettings?.linkedin_enabled ? "LinkedIn" : null,
    publishingSettings?.facebook_enabled ? "Facebook" : null,
    publishingSettings?.galaxyai_enabled ? "GalaxyAI" : null,
  ].filter(Boolean);

  return (
    <WebsitePage>
      <div className={accountStyles.accountPage}>
        <WebsiteHero
          eyebrow="Account Administration"
          title={account.name}
          description="Manage workspace status, publishing, seats, access, and account lifecycle here. Business and market strategy now live in the dedicated Strategy Workspace."
          primaryAction={{ label: "Back to Accounts", href: "/accounts" }}
          secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
        />

        <section className={websiteStyles.metricsGrid}>
          <WebsiteMetric label="Status" value={account.status} description="Current account state." dot="blue" />
          <WebsiteMetric label="Campaigns" value={campaignCount ?? 0} description="Campaigns tied to this account." dot="green" />
          <WebsiteMetric label="Assets" value={assetCount ?? 0} description="Generated assets tied to this account." dot="purple" />
          <WebsiteMetric label="Seats" value={`${activeMembers} active`} description={`${pendingMembers} pending invitation${pendingMembers === 1 ? "" : "s"}.`} dot="gold" />
          <WebsiteMetric label="Strategy Readiness" value={`${foundation.readiness.score}%`} description={`${foundation.readiness.completedChecks} of ${foundation.readiness.totalChecks} foundation checks complete.`} dot={foundation.readiness.campaignReady ? "green" : "gold"} />
        </section>

        <WebsiteSection
          eyebrow="Control Panel"
          title="Account administration"
          description="Use Account Administration for operational controls and Strategy Workspace for business, audience, offer, messaging, rule, and knowledge management."
        >
          <div className={accountStyles.accountSetupGrid}>
            <aside className="xl:sticky xl:top-28 xl:self-start">
              <div className={accountStyles.accountMenuCard}>
                <p className={accountStyles.accountMenuEyebrow}>Account Menu</p>
                <nav className={accountStyles.accountMenuNav}>
                  {[
                    ["Overview", "#overview"],
                    ["Strategy Workspace", "#strategy-workspace"],
                    ["Publishing", "#publishing"],
                    ["Team", "#team"],
                    ["Danger Zone", "#danger-zone"],
                  ].map(([label, href]) => (
                    <a key={href} href={href} className={accountStyles.accountMenuLink}>
                      {label}
                    </a>
                  ))}
                </nav>
                <div className={accountStyles.accountWorkspaceBox}>
                  <p className="font-semibold text-slate-900">Use this workspace</p>
                  <p className="mt-1">{account.name}</p>
                  <UseAccountWorkspaceButton
                    accountId={account.id}
                    accountName={account.name}
                    label="Set Active Workspace"
                    className="mt-3 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:border-blue-300 hover:bg-blue-100"
                  />
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-400">Slug</p>
                  <p className="font-mono text-xs text-slate-700">{account.slug}</p>
                </div>
              </div>
            </aside>

            <div className={accountStyles.accountContentStack}>
              <section id="overview" className={`scroll-mt-28 ${accountStyles.accountSectionCard}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Overview</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">Workspace snapshot</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      Confirm the account identity and operating status before generating campaigns, approving assets, or publishing to connected channels.
                    </p>
                  </div>
                  <WebsiteBadge status={account.status} />
                </div>

                <div className={accountStyles.infoGrid}>
                  <InfoTile label="Website" value={compactValue(account.website_url)} />
                  <InfoTile label="Primary CTA" value={compactValue(account.primary_cta)} />
                  <InfoTile label="Created" value={formatDate(account.created_at)} />
                  <InfoTile label="Publishing channels" value={configuredChannels.length ? configuredChannels.join(", ") : "Not configured"} />
                </div>
              </section>

              <section id="strategy-workspace" className={`scroll-mt-28 ${accountStyles.accountSectionCard}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <SectionHeading
                    eyebrow="Strategy Workspace"
                    title="Business and market strategy"
                    description="Strategy editing has moved into one account-level workspace so campaigns inherit the same approved source of truth."
                  />
                  <WebsiteBadge status={foundation.readiness.campaignReady ? "approved" : "needs_review"} />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {strategyAreas.map((area) => (
                    <article key={area.href} className={websiteStyles.card}>
                      <h3 className={websiteStyles.cardTitle}>{area.label}</h3>
                      <p className={websiteStyles.cardText}>{area.description}</p>
                      <div className="mt-4">
                        <UseAccountWorkspaceButton
                          accountId={account.id}
                          accountName={account.name}
                          label={`Open ${area.label}`}
                          redirectHref={area.href}
                          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <UseAccountWorkspaceButton
                    accountId={account.id}
                    accountName={account.name}
                    label="Open Strategy Overview"
                    redirectHref="/strategy"
                    className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                  />
                  <Link href="/campaigns" className={websiteStyles.link}>Go to Campaigns →</Link>
                </div>
              </section>

              <section id="publishing" className={`scroll-mt-28 ${accountStyles.accountSectionCard}`}>
                <SectionHeading
                  eyebrow="Publishing"
                  title="Account publishing settings"
                  description="Keep LinkedIn, Facebook, GalaxyAI, and default CTA settings separate for each client or brand account."
                />
                <div className="mt-6">
                  {canManage ? (
                    <AccountPublishingSettingsForm accountId={account.id} settings={publishingSettings} />
                  ) : (
                    <p className={websiteStyles.cardText}>You can view this account, but only owners and admins can edit publishing settings.</p>
                  )}
                </div>
              </section>

              <section id="team" className={`scroll-mt-28 ${accountStyles.accountSectionCard}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <SectionHeading
                    eyebrow="Team"
                    title="Seats and account access"
                    description="Invite reviewers, editors, admins, or viewers to this account. Removing a seat removes access but preserves history."
                  />
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{activeMembers}</span> active · <span className="font-semibold text-slate-900">{pendingMembers}</span> pending
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Member</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Invited</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {memberRows.length ? (
                          memberRows.map((membership) => (
                            <tr key={membership.id} className="align-top">
                              <td className="px-4 py-4">
                                <p className="font-semibold text-slate-900">{membership.full_name || membership.email}</p>
                                <p className="text-xs text-slate-500">{membership.email}</p>
                              </td>
                              <td className="px-4 py-4 capitalize text-slate-700">{membership.role}</td>
                              <td className="px-4 py-4"><WebsiteBadge status={membership.status} /></td>
                              <td className="px-4 py-4 text-slate-600">{formatDate(membership.invited_at)}</td>
                              <td className="px-4 py-4">
                                <div className="flex justify-end">
                                  {canManage ? (
                                    <RemoveAccountMemberButton
                                      accountId={account.id}
                                      membershipId={membership.id}
                                      memberLabel={membership.full_name || membership.email}
                                      disabledReason={
                                        membership.user_id === user.id
                                          ? "You cannot remove your own access from this account."
                                          : membership.user_id && membership.user_id === account.owner_user_id
                                            ? "The primary account owner cannot be removed from this screen."
                                            : null
                                      }
                                    />
                                  ) : (
                                    <span className="text-xs text-slate-400">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={5}>No members recorded yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {canManage ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-5">
                      <InviteAccountMemberForm accountId={account.id} />
                    </div>
                  ) : null}
                </div>
              </section>

              <section id="danger-zone" className={`scroll-mt-28 ${accountStyles.accountDangerCard}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Danger Zone</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">Archive this account</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                      Archiving removes this account from active workspaces while keeping campaigns, assets, members, and history intact.
                    </p>
                  </div>
                  {canManage ? <ArchiveAccountButton accountId={account.id} accountName={account.name} /> : null}
                </div>
              </section>
            </div>
          </div>
        </WebsiteSection>
      </div>
    </WebsitePage>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={accountStyles.infoTile}>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
