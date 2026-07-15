import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import {
  defaultUtmTaxonomySettings,
  mergeUtmTaxonomySettings,
} from "@/lib/analytics/utm-taxonomy";
import { UtmTaxonomyPanel } from "@/components/analytics/UtmTaxonomyPanel";
import {
  WebsiteHero,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export const dynamic = "force-dynamic";

const mappings = [
  ["LinkedIn organic", "linkedin", "organic-social"],
  ["LinkedIn paid", "linkedin", "paid-social"],
  ["Facebook organic", "facebook", "organic-social"],
  ["Facebook paid", "facebook", "paid-social"],
  ["Instagram organic", "instagram", "organic-social"],
  ["Email", "Configured email source", "email"],
  ["SMS", "Configured SMS source", "sms"],
  ["Google Search Ads", "google", "cpc"],
  ["Google Display", "google", "display"],
  ["YouTube", "youtube", "video"],
  ["QR code", "qr", "qr"],
];

function formatDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function UtmTaxonomyPage() {
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const accountId = accountContext.activeAccountId;

  if (!accountId) redirect("/accounts");

  const [{ data: settingsData }, { data: trackingLinks }] = await Promise.all([
    supabase
      .from("analytics_utm_settings")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("analytics_tracking_links")
      .select("id,channel,destination_url,tracked_url,utm_source,utm_medium,utm_campaign,utm_content,utm_term,created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const settings = mergeUtmTaxonomySettings(
    settingsData ?? defaultUtmTaxonomySettings(accountId),
    accountId,
  );
  const recentLinks = (trackingLinks ?? []) as Array<Record<string, any>>;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow={`Measure · ${accountContext.activeAccountName ?? "Workspace"}`}
        title="UTM taxonomy and campaign attribution"
        description="Control the naming system Marketing VIP uses to connect every published campaign link to GA4, the exact VIP campaign, and the exact generated asset."
        primaryAction={{ label: "Analytics", href: "/analytics" }}
        secondaryAction={{ label: "Publish Center", href: "/publishing-schedule" }}
      />

      <WebsiteSection
        eyebrow="Rules"
        title="One readable taxonomy, plus exact VIP identifiers"
        description="GA4 receives readable UTM values. Marketing VIP receives permanent campaign and asset UUIDs for exact attribution."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Standard GA4 parameters</h3>
            <p className={websiteStyles.cardText}>
              <code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code>, <code>utm_content</code>, and optional <code>utm_term</code> use lowercase, hyphenated values.
            </p>
          </article>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Marketing VIP identifiers</h3>
            <p className={websiteStyles.cardText}>
              <code>vip_campaign</code> and <code>vip_asset</code> carry the exact database IDs without replacing readable UTM names.
            </p>
          </article>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Safe publishing behavior</h3>
            <p className={websiteStyles.cardText}>
              VIP preserves legitimate query parameters, removes duplicate tracking parameters, and never changes the approved asset stored in the database.
            </p>
          </article>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Workspace settings"
        title="Taxonomy defaults"
        description="These settings apply to the active workspace and are used by the canonical publishing attribution layer."
      >
        <UtmTaxonomyPanel
          accountId={accountId}
          canManage={accountContext.canManageActiveAccount}
          initialSettings={settings}
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Controlled mapping"
        title="Default source and medium rules"
        description="The platform determines the source from the publishing destination and limits medium values to this controlled vocabulary."
      >
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-black">Destination</th>
                <th className="px-4 py-3 font-black">utm_source</th>
                <th className="px-4 py-3 font-black">utm_medium</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map(([destination, source, medium]) => (
                <tr key={destination} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-semibold text-slate-900">{destination}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{source}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{medium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Recent output"
        title="Generated tracking links"
        description="Links are recorded when an approved asset enters live publishing execution."
      >
        {recentLinks.length ? (
          <div className="grid gap-4">
            {recentLinks.map((link) => (
              <article key={link.id} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className={websiteStyles.cardTitle}>
                    {link.utm_campaign} · {link.utm_content}
                  </h3>
                  <span className={websiteStyles.badge}>{link.channel}</span>
                </div>
                <p className={websiteStyles.cardMeta}>
                  {link.utm_source} / {link.utm_medium}
                  {link.utm_term ? ` · ${link.utm_term}` : ""} · {formatDate(link.created_at)}
                </p>
                <p className="mt-3 break-all font-mono text-xs text-slate-600">{link.tracked_url}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No tracking links have been generated yet. Open an approved social or email asset in Publish Center to preview and execute the first attributed link.
          </div>
        )}
        <p className="mt-4 text-sm text-slate-600">
          Return to <Link className="font-bold text-[#0b4a7a] underline" href="/analytics">Analytics</Link> to review attributed campaign and asset performance after traffic arrives.
        </p>
      </WebsiteSection>
    </WebsitePage>
  );
}
