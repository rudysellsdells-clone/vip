export type MonthlyReviewCounts = {
  total: number;
  needsReview: number;
  approved: number;
  rejected: number;
  published: number;
  scheduled: number;
  unscheduled: number;
  linkedin: number;
  facebook: number;
  blog: number;
  email: number;
  video: number;
};

export function monthValueFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function parseMonthValue(value?: string | null) {
  const now = new Date();
  const fallback = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    value: monthValueFromDate(now),
  };

  if (!value || !/^\d{4}-\d{2}$/.test(value)) return fallback;

  const [yearString, monthString] = value.split("-");
  const year = Number(yearString);
  const month = Number(monthString);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return fallback;
  }

  return {
    year,
    month,
    value,
  };
}

export function monthLabel(value: string) {
  const { year, month } = parseMonthValue(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function dateLabel(value: string | null | undefined) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function assetTypeLabel(value: string | null | undefined) {
  return String(value ?? "content").replaceAll("_", " ");
}

export function statusLabel(value: string | null | undefined) {
  return String(value ?? "needs_review").replaceAll("_", " ");
}

export function monthCandidate(row: Record<string, any>) {
  const direct =
    row.campaign_month ??
    row.intended_publish_month ??
    row.metadata?.month ??
    row.metadata?.campaignMonth ??
    row.metadata?.intendedPublishMonth;

  if (direct && /^\d{4}-\d{2}$/.test(String(direct))) {
    return String(direct);
  }

  const dateValue =
    row.planned_publish_date ??
    row.scheduled_publish_at ??
    row.campaign_week_start_date ??
    row.planned_start_date ??
    row.created_at;

  if (!dateValue) return null;

  const text = String(dateValue);

  if (/^\d{4}-\d{2}/.test(text)) return text.slice(0, 7);

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return null;

  return monthValueFromDate(date);
}

export function buildMonthOptions(rows: Array<Record<string, any>>) {
  const values = new Set<string>();

  for (const row of rows) {
    const value = monthCandidate(row);

    if (value) values.add(value);
  }

  const now = new Date();

  for (let offset = -2; offset <= 6; offset += 1) {
    values.add(monthValueFromDate(new Date(now.getFullYear(), now.getMonth() + offset, 1)));
  }

  return Array.from(values)
    .sort()
    .map((value) => ({
      value,
      label: monthLabel(value),
    }));
}

export function calculateCounts(assets: Array<Record<string, any>>): MonthlyReviewCounts {
  const counts: MonthlyReviewCounts = {
    total: assets.length,
    needsReview: 0,
    approved: 0,
    rejected: 0,
    published: 0,
    scheduled: 0,
    unscheduled: 0,
    linkedin: 0,
    facebook: 0,
    blog: 0,
    email: 0,
    video: 0,
  };

  for (const asset of assets) {
    const status = String(asset.status ?? "needs_review");
    const schedulingStatus = String(asset.scheduling_status ?? "");
    const type = String(asset.asset_type ?? "");

    if (status === "needs_review") counts.needsReview += 1;
    if (status === "approved") counts.approved += 1;
    if (status === "rejected") counts.rejected += 1;
    if (schedulingStatus === "published") counts.published += 1;
    if (asset.scheduled_publish_at || asset.planned_publish_date) counts.scheduled += 1;
    else counts.unscheduled += 1;

    if (type === "linkedin_post") counts.linkedin += 1;
    if (type === "facebook_post") counts.facebook += 1;
    if (type === "blog_post") counts.blog += 1;
    if (type === "email") counts.email += 1;
    if (type === "video_script") counts.video += 1;
  }

  return counts;
}

export function groupAssetsByCampaign({
  assets,
  campaigns,
}: {
  assets: Array<Record<string, any>>;
  campaigns: Array<Record<string, any>>;
}) {
  const campaignById = new Map<string, Record<string, any>>(
    campaigns.map((campaign) => [String(campaign.id), campaign])
  );

  const groups = new Map<
    string,
    {
      campaign: Record<string, any> | null;
      campaignId: string;
      label: string;
      weekNumber: number;
      assets: Array<Record<string, any>>;
      counts: MonthlyReviewCounts;
    }
  >();

  for (const asset of assets) {
    const campaignId = String(asset.campaign_id ?? "uncampaignized");
    const campaign = campaignId !== "uncampaignized" ? campaignById.get(campaignId) ?? null : null;
    const weekNumber = Number(asset.campaign_week_number ?? campaign?.campaign_week_number ?? 99);
    const label =
      campaign?.name ??
      campaign?.title ??
      asset.campaign_name ??
      (campaignId === "uncampaignized" ? "No campaign assigned" : `Campaign ${campaignId}`);

    if (!groups.has(campaignId)) {
      groups.set(campaignId, {
        campaign,
        campaignId,
        label,
        weekNumber,
        assets: [],
        counts: calculateCounts([]),
      });
    }

    groups.get(campaignId)?.assets.push(asset);
  }

  const result = Array.from(groups.values()).map((group) => ({
    ...group,
    assets: group.assets.sort((a, b) => {
      const orderA = Number(a.calendar_sort_order ?? 999);
      const orderB = Number(b.calendar_sort_order ?? 999);

      if (orderA !== orderB) return orderA - orderB;

      return String(a.scheduled_publish_at ?? "").localeCompare(String(b.scheduled_publish_at ?? ""));
    }),
    counts: calculateCounts(group.assets),
  }));

  return result.sort((a, b) => {
    if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
    return a.label.localeCompare(b.label);
  });
}
