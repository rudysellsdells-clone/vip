import Link from "next/link";
import {
  WebsiteBadge,
  WebsiteMetric,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import type { AdPackage } from "@/lib/ad-studio/ad-package";
import { scoreAdPackage } from "@/lib/ad-studio/ad-package-scoring";
import { buildCampaignAdReadiness } from "@/lib/ad-studio/campaign-ad-readiness";
import { isAdStudioEnabled } from "@/lib/ad-studio/feature";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type AdAssetRow = {
  id: string;
  account_id: string | null;
  asset_type: string;
  title: string;
  status: string | null;
  metadata: unknown;
  created_at: string;
};

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function adPackageFromAsset(asset: AdAssetRow): AdPackage | null {
  const metadata = recordValue(asset.metadata);
  const candidate = recordValue(metadata.adPackage);
  if (
    metadata.generatedBy !== "ad_studio" ||
    candidate.version !== "h1.17" ||
    !text(candidate.channel) ||
    !Array.isArray(candidate.variants)
  ) {
    return null;
  }
  return candidate as unknown as AdPackage;
}

function channelLabel(adPackage: AdPackage) {
  if (adPackage.channel === "google_search") return "Google Search";
  if (adPackage.channel === "linkedin") return "LinkedIn";
  return "Meta";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export async function CampaignAdLane({ campaignId }: { campaignId: string }) {
  if (!isAdStudioEnabled()) return null;

  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id,account_id,name")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign?.account_id) return null;

  const accountId = String(campaign.account_id);
  const access = await getAccountAccessForUser({
    supabase,
    accountId,
    userId: user.id,
  });
  if (!access.canView) return null;

  const { data: assetRows } = await supabase
    .from("generated_assets")
    .select("id,account_id,asset_type,title,status,metadata,created_at")
    .eq("account_id", accountId)
    .eq("campaign_id", campaignId)
    .in("asset_type", ["search_ad", "facebook_post", "linkedin_post"])
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const packages = ((assetRows ?? []) as AdAssetRow[])
    .map((asset) => {
      const adPackage = adPackageFromAsset(asset);
      return adPackage
        ? { asset, adPackage, score: scoreAdPackage(adPackage) }
        : null;
    })
    .filter(
      (
        item,
      ): item is {
        asset: AdAssetRow;
        adPackage: AdPackage;
        score: ReturnType<typeof scoreAdPackage>;
      } => Boolean(item),
    );
  const readiness = buildCampaignAdReadiness(
    packages.map(({ asset, adPackage, score }) => ({
      channel: adPackage.channel,
      status: asset.status ?? "draft",
      score: score.total,
    })),
  );
  const actionHref =
    readiness.nextAction.href === "/ad-studio"
      ? `/ad-studio?campaignId=${encodeURIComponent(campaignId)}`
      : readiness.nextAction.href;

  return (
    <div className="mx-auto max-w-[1480px] px-[34px] pb-[68px] pl-[40px] max-md:px-4">
      <div id="ads" className="scroll-mt-24">
        <WebsiteSection
          eyebrow="Campaign Advertising"
          title="Search and Paid Social readiness"
          description="Advertising packages inherit this campaign's approved Marketing Spine, Strategy Foundation, Market Intelligence, destinations, review history, and attribution settings."
        >
          <div className={websiteStyles.metricsGrid}>
            <WebsiteMetric
              label="Ad packages"
              value={readiness.packageCount}
              description="Search, Meta, and LinkedIn packages connected to this campaign."
              dot="blue"
            />
            <WebsiteMetric
              label="Needs review"
              value={readiness.needsReviewCount}
              description="Advertising packages awaiting approval or revision."
              href="/approvals"
              dot="gold"
            />
            <WebsiteMetric
              label="Approved"
              value={readiness.approvedCount}
              description="Packages approved through the existing asset workflow."
              dot="green"
            />
            <WebsiteMetric
              label="Average score"
              value={readiness.averageScore === null ? "—" : `${readiness.averageScore}/100`}
              description="Completeness, platform fit, traceability, attribution, and variant diversity."
              dot="purple"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border border-slate-200 bg-slate-50 p-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-950">
                {readiness.nextAction.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {readiness.nextAction.description}
              </p>
            </div>
            <Link
              href={actionHref}
              className="inline-flex bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              {readiness.nextAction.label} →
            </Link>
          </div>

          {packages.length ? (
            <div className={`${websiteStyles.cardGrid} mt-6`}>
              {packages.slice(0, 6).map(({ asset, adPackage, score }) => (
                <article key={asset.id} className={websiteStyles.card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={websiteStyles.sectionEyebrow}>
                        {channelLabel(adPackage)} • {score.total}/100
                      </p>
                      <h3 className={websiteStyles.cardTitle}>{asset.title}</h3>
                    </div>
                    <WebsiteBadge status={asset.status} />
                  </div>
                  <p className={websiteStyles.cardMeta}>
                    Generated {formatDate(asset.created_at)} • {score.rating.replaceAll("_", " ")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="inline-flex bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
                    >
                      Open Package →
                    </Link>
                    {asset.status === "approved" ? (
                      <>
                        <a
                          href={`/api/ad-studio/assets/${asset.id}/export?format=csv`}
                          className="inline-flex border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50"
                        >
                          CSV
                        </a>
                        <a
                          href={`/api/ad-studio/assets/${asset.id}/export?format=json`}
                          className="inline-flex border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50"
                        >
                          JSON
                        </a>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
              This campaign does not have an Ad Studio package yet. Use the approved Marketing Spine to create Google Search, Meta, or LinkedIn concepts.
            </div>
          )}
        </WebsiteSection>
      </div>
    </div>
  );
}
