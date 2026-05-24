import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function normalizeMonth(value: unknown) {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}$/.test(text)) {
    return text;
  }

  return "";
}

function monthRange(month: string) {
  const [yearString, monthString] = month.split("-");
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));

  return {
    startDate: `${yearString}-${monthString}-01`,
    nextMonthDate: `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-01`,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function uniqueIds(rows: Array<Record<string, any>>) {
  return Array.from(
    new Set(
      rows
        .map((row) => row.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );
}

function mergeRows(...groups: Array<Array<Record<string, any>>>) {
  const map = new Map<string, Record<string, any>>();

  for (const group of groups) {
    for (const row of group) {
      if (row?.id) {
        map.set(row.id, row);
      }
    }
  }

  return Array.from(map.values());
}

async function safeSelect(query: PromiseLike<{ data: any; error: any }>) {
  const { data, error } = await query;

  if (error) {
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function POST(request: Request) {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const month = normalizeMonth(body.month);
  const confirmText = String(body.confirmText ?? "").trim();
  const includeExecuted = Boolean(body.includeExecuted);

  if (!month) {
    return NextResponse.json(
      { error: "A valid month is required. Expected format: YYYY-MM." },
      { status: 400 }
    );
  }

  if (confirmText !== month) {
    return NextResponse.json(
      { error: `Type ${month} to confirm deleting this monthly campaign package.` },
      { status: 400 }
    );
  }

  const range = monthRange(month);

  const campaignRows = mergeRows(
    await safeSelect(
      supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .eq("campaign_month", month)
    ),
    await safeSelect(
      supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .gte("campaign_week_start_date", range.startDate)
        .lt("campaign_week_start_date", range.nextMonthDate)
    ),
    await safeSelect(
      supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .gte("planned_start_date", range.startDate)
        .lt("planned_start_date", range.nextMonthDate)
    )
  );

  const campaignIds = uniqueIds(campaignRows);

  const assetGroups: Array<Array<Record<string, any>>> = [
    await safeSelect(
      supabase
        .from("generated_assets")
        .select("*")
        .eq("user_id", user.id)
        .eq("intended_publish_month", month)
    ),
    await safeSelect(
      supabase
        .from("generated_assets")
        .select("*")
        .eq("user_id", user.id)
        .gte("planned_publish_date", range.startDate)
        .lt("planned_publish_date", range.nextMonthDate)
    ),
    await safeSelect(
      supabase
        .from("generated_assets")
        .select("*")
        .eq("user_id", user.id)
        .gte("scheduled_publish_at", range.startIso)
        .lt("scheduled_publish_at", range.endIso)
    ),
  ];

  if (campaignIds.length) {
    assetGroups.push(
      await safeSelect(
        supabase
          .from("generated_assets")
          .select("*")
          .eq("user_id", user.id)
          .in("campaign_id", campaignIds)
      )
    );
  }

  const assetRows = mergeRows(...assetGroups);
  const assetIds = uniqueIds(assetRows);

  const calendarGroups: Array<Array<Record<string, any>>> = [
    await safeSelect(
      supabase
        .from("content_calendar_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("intended_publish_month", month)
    ),
    await safeSelect(
      supabase
        .from("content_calendar_items")
        .select("*")
        .eq("user_id", user.id)
        .gte("planned_publish_date", range.startDate)
        .lt("planned_publish_date", range.nextMonthDate)
    ),
    await safeSelect(
      supabase
        .from("content_calendar_items")
        .select("*")
        .eq("user_id", user.id)
        .gte("scheduled_publish_at", range.startIso)
        .lt("scheduled_publish_at", range.endIso)
    ),
  ];

  if (campaignIds.length) {
    calendarGroups.push(
      await safeSelect(
        supabase
          .from("content_calendar_items")
          .select("*")
          .eq("user_id", user.id)
          .in("campaign_id", campaignIds)
      )
    );
  }

  const calendarRows = mergeRows(...calendarGroups);
  const calendarItemIds = uniqueIds(calendarRows);

  let executionRuns: Array<Record<string, any>> = [];

  if (assetIds.length) {
    executionRuns = await safeSelect(
      supabase
        .from("publishing_execution_runs")
        .select("*")
        .eq("user_id", user.id)
        .in("asset_id", assetIds)
    );
  }

  const completedRuns = executionRuns.filter((run) =>
    ["completed", "sent_to_provider", "published"].includes(String(run.status ?? ""))
  );

  if (completedRuns.length && !includeExecuted) {
    return NextResponse.json(
      {
        error:
          "This month has assets with completed/sent publishing execution runs. Deletion was blocked to prevent removing content that may already have gone out.",
        completedRunCount: completedRuns.length,
        assetCount: assetIds.length,
        campaignCount: campaignIds.length,
        calendarItemCount: calendarItemIds.length,
      },
      { status: 409 }
    );
  }

  let qualityReviewIds: string[] = [];

  if (assetIds.length) {
    const qualityReviews = await safeSelect(
      supabase
        .from("asset_quality_reviews")
        .select("id")
        .in("asset_id", assetIds)
    );

    qualityReviewIds = uniqueIds(qualityReviews);
  }

  const deleted = {
    qualityGateDecisions: 0,
    qualityReviews: 0,
    publishingExecutionRuns: 0,
    contentCalendarItems: 0,
    generatedAssets: 0,
    campaigns: 0,
    activityLogs: 0,
  };

  if (assetIds.length || qualityReviewIds.length) {
    const byAsset =
      assetIds.length > 0
        ? await supabase
            .from("quality_gate_decisions")
            .delete({ count: "exact" })
            .in("asset_id", assetIds)
        : { count: 0 };

    const byReview =
      qualityReviewIds.length > 0
        ? await supabase
            .from("quality_gate_decisions")
            .delete({ count: "exact" })
            .in("review_id", qualityReviewIds)
        : { count: 0 };

    deleted.qualityGateDecisions = (byAsset.count ?? 0) + (byReview.count ?? 0);
  }

  if (qualityReviewIds.length) {
    const result = await supabase
      .from("asset_quality_reviews")
      .delete({ count: "exact" })
      .in("id", qualityReviewIds);

    deleted.qualityReviews = result.count ?? 0;
  }

  if (executionRuns.length) {
    const runIds = uniqueIds(executionRuns);

    if (runIds.length) {
      const result = await supabase
        .from("publishing_execution_runs")
        .delete({ count: "exact" })
        .in("id", runIds);

      deleted.publishingExecutionRuns = result.count ?? 0;
    }
  }

  if (calendarItemIds.length) {
    const result = await supabase
      .from("content_calendar_items")
      .delete({ count: "exact" })
      .in("id", calendarItemIds);

    deleted.contentCalendarItems = result.count ?? 0;
  }

  if (assetIds.length) {
    const result = await supabase
      .from("generated_assets")
      .delete({ count: "exact" })
      .in("id", assetIds);

    deleted.generatedAssets = result.count ?? 0;
  }

  if (campaignIds.length) {
    const result = await supabase
      .from("campaigns")
      .delete({ count: "exact" })
      .in("id", campaignIds);

    deleted.campaigns = result.count ?? 0;
  }

  const activityResult = await supabase
    .from("activity_log")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .in("activity_type", [
      "monthly_campaign_package_generated",
      "monthly_publish_schedule_assigned",
    ])
    .or(`metadata->>month.eq.${month},metadata->>intended_publish_month.eq.${month}`);

  deleted.activityLogs = activityResult.count ?? 0;

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "monthly_campaign_package_deleted",
    title: "Monthly campaign package deleted",
    description: `Deleted monthly campaign package for ${month}.`,
    metadata: {
      month,
      includeExecuted,
      deleted,
      campaignIds,
      assetIds,
      calendarItemIds,
    },
  });

  return NextResponse.json({
    ok: true,
    month,
    deleted,
    campaignCount: campaignIds.length,
    assetCount: assetIds.length,
    calendarItemCount: calendarItemIds.length,
  });
}
