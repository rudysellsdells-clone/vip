import Link from "next/link";
import {
  WebsiteBadge,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getActiveWorkspaceForUser } from "@/lib/accounts/active-workspace";
import { loadRecentWhatIfGmailActions } from "@/lib/actions/what-if-gmail-action-records";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function RecentWhatIfGmailActions() {
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

  const actions = await loadRecentWhatIfGmailActions({
    supabase,
    userId: user.id,
    accountId: workspace.activeAccountId,
    limit: 10,
  });

  if (!actions.length) {
    return null;
  }

  return (
    <WebsiteSection
      eyebrow="What-If Outreach"
      title="Recent What-If Gmail actions"
      description="Completed What-If PDF Gmail draft actions are shown here so you have a visible record and do not accidentally duplicate outreach."
    >
      <div className={websiteStyles.cardGrid}>
        {actions.map((action) => (
          <article key={action.id} className={websiteStyles.card}>
            <div className="flex flex-wrap gap-2">
              <WebsiteBadge status={action.status} />
              <span className={websiteStyles.badge}>gmail.draft_v2</span>
              {action.draftId ? (
                <span className={websiteStyles.badge}>Draft {action.draftId}</span>
              ) : null}
            </div>

            <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
              {action.title}
            </h3>

            <p className={websiteStyles.cardMeta}>
              {formatDate(action.createdAt)}
            </p>

            <p className={websiteStyles.cardText}>
              {action.description}
            </p>

            {action.subject ? (
              <p className={websiteStyles.cardText}>
                <strong>Subject:</strong> {action.subject}
              </p>
            ) : null}

            <div className={websiteStyles.actionRow}>
              {action.draftUrl ? (
                <Link href={action.draftUrl} className={websiteStyles.link} target="_blank">
                  Open Gmail draft →
                </Link>
              ) : null}

              {action.attachmentUrl ? (
                <Link href={action.attachmentUrl} className={websiteStyles.link} target="_blank">
                  Open PDF →
                </Link>
              ) : null}

              {action.assetId ? (
                <Link href={`/assets/${action.assetId}`} className={websiteStyles.link}>
                  Open asset →
                </Link>
              ) : null}

              {action.feedbackUrl ? (
                <Link href={action.feedbackUrl} className={websiteStyles.link} target="_blank">
                  Zapier history →
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </WebsiteSection>
  );
}
