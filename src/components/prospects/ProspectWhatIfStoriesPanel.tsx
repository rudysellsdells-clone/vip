import Link from "next/link";
import {
  WebsiteBadge,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getActiveWorkspaceForUser } from "@/lib/accounts/active-workspace";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export async function ProspectWhatIfStoriesPanel({
  prospectId,
}: {
  prospectId: string;
}) {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const workspace = await getActiveWorkspaceForUser({ supabase, userId: user.id });

  if (!workspace) {
    return null;
  }

  const { data: linksData } = await supabase
    .from("prospect_asset_links")
    .select("*")
    .eq("account_id", workspace.activeAccountId)
    .eq("prospect_id", prospectId)
    .eq("relationship_type", "what_if_story")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const links = (linksData ?? []) as Array<Record<string, any>>;
  const assetIds = links.map((link) => link.asset_id).filter(Boolean);

  const { data: assetsData } = assetIds.length
    ? await supabase
        .from("generated_assets")
        .select("*")
        .eq("account_id", workspace.activeAccountId)
        .in("id", assetIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const assets = (assetsData ?? []) as Array<Record<string, any>>;

  return (
    <WebsiteSection
      eyebrow="Prospect Sales Assets"
      title="What-If Success Stories"
      description="Personalized stories linked to this prospect. Review, revise, approve, create PDFs, and draft outreach from the story asset."
    >
      {assets.length ? (
        <div className={websiteStyles.cardGrid}>
          {assets.map((asset) => (
            <article key={asset.id} className={websiteStyles.card}>
              <div className="flex flex-wrap gap-2">
                <WebsiteBadge status={asset.status ?? "needs_review"} />
                <span className={websiteStyles.badge}>Version {asset.version}</span>
              </div>

              <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                  {asset.title}
                </Link>
              </h3>

              <p className={websiteStyles.cardMeta}>
                Created {formatDate(asset.created_at)}
              </p>

              <p className={websiteStyles.cardText}>
                {String(asset.content ?? "").slice(0, 240)}...
              </p>

              <div className={websiteStyles.actionRow}>
                <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                  Open story →
                </Link>
                <Link href="/approvals" className={websiteStyles.link}>
                  Review queue →
                </Link>
                <Link href="/what-if-stories" className={websiteStyles.link}>
                  PDF/email tools →
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={websiteStyles.empty}>
          No What-If Stories are linked to this prospect yet.
        </div>
      )}
    </WebsiteSection>
  );
}
