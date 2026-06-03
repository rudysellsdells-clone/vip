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
import { RemoveAccountMemberButton } from "@/components/accounts/RemoveAccountMemberButton";
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
    user_id: string | null;
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

  const configuredChannels = [
    publishingSettings?.linkedin_enabled ? "LinkedIn" : null,
    publishingSettings?.facebook_enabled ? "Facebook" : null,
    publishingSettings?.galaxyai_enabled ? "GalaxyAI" : null,
  ].filter(Boolean);

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Account Workspace"
        title={account.name}
        description="Manage this client or brand workspace from one cleaner control panel: overview, brand memory, publishing settings, team access, and account removal."
        primaryAction={{ label: "Back to Accounts", href: "/accounts" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Status" value={account.status} description="Current account state." dot="blue" />
        <WebsiteMetric label="Campaigns" value={campaignCount ?? 0} description="Campaigns tied to this account." dot="green" />
        <WebsiteMetric label="Assets" value={assetCount ?? 0} description="Generated assets tied to this account." dot="purple" />
        <WebsiteMetric label="Seats" value={`${activeMembers} active`} description={`${pendingMembers} pending invitation${pendingMembers === 1 ? "" : "s"}.`} dot="gold" />
      </section>

      <WebsiteSection
        eyebrow="Control Panel"
        title="Account setup"
        description="Each section below handles one part of the workspace. Use the quick links to jump directly to the area you need."
      >
        <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
          <aside className="xl:sticky xl:top-28 xl:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="px-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Account Menu
              </p>
              <nav className="mt-3 grid gap-2 text-sm font-semibold">
                {[
                  ["Overview", "#overview"],
                  ["Brand Profile", "#brand-profile"],
                  ["Publishing", "#publishing"],
                  ["Team", "#team"],
                  ["Danger Zone", "#danger-zone"],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-2xl px-3 py-2.5 text-slate-700 transition hover:bg-slate-50 hover:text-blue-700"
                  >
                    {label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Active workspace</p>
                <p className="mt-1">{account.name}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">Slug</p>
                <p className="font-mono text-xs text-slate-700">{account.slug}</p>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section id="overview" className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Overview</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Workspace snapshot</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Use this summary to confirm the account identity before generating campaigns, approving assets, or publishing to connected channels.
                  </p>
                </div>
                <WebsiteBadge status={account.status} />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <InfoTile label="Website" value={compactValue(account.website_url)} />
                <InfoTile label="Primary CTA" value={compactValue(account.primary_cta)} />
                <InfoTile label="Created" value={formatDate(account.created_at)} />
                <InfoTile label="Publishing channels" value={configuredChannels.length ? configuredChannels.join(", ") : "Not configured"} />
              </div>
            </section>

            <section id="brand-profile" className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <SectionHeading
                eyebrow="Brand Profile"
                title="Account-specific brand memory"
                description="Define the voice, offer, audience, CTA, and positioning VIP should use for this account."
              />
              <div className="mt-6">
                {canManage ? (
                  <AccountBrandProfileForm accountId={account.id} profile={brandProfile} />
                ) : (
                  <p className={websiteStyles.cardText}>You can view this account, but only owners and admins can edit the brand profile.</p>
                )}
              </div>
            </section>

            <section id="publishing" className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
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

            <section id="team" className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
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

            <section id="danger-zone" className="scroll-mt-28 rounded-3xl border border-red-200 bg-red-50/60 p-6 shadow-sm md:p-8">
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
    </WebsitePage>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
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
