import { NextResponse } from "next/server";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function normalizeMonth(value: unknown) {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}$/.test(text)) return text;

  return "";
}

function monthFromDateLike(value: unknown) {
  if (!value) return null;

  const text = String(value);

  if (/^\d{4}-\d{2}/.test(text)) return text.slice(0, 7);

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function assetBelongsToMonth(asset: Record<string, any>, month: string) {
  return (
    asset.intended_publish_month === month ||
    monthFromDateLike(asset.planned_publish_date) === month ||
    monthFromDateLike(asset.scheduled_publish_at) === month ||
    monthFromDateLike(asset.campaign_week_start_date) === month
  );
}

function uniqueRowsById(rows: Array<Record<string, any>>) {
  const map = new Map<string, Record<string, any>>();

  for (const row of rows) {
    const id = String(row.id ?? "");

    if (id && !map.has(id)) {
      map.set(id, row);
    }
  }

  return Array.from(map.values());
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

  if (!month) {
    return NextResponse.json(
      { error: "A valid month is required. Expected format: YYYY-MM." },
      { status: 400 }
    );
  }

  if (confirmText !== month) {
    return NextResponse.json(
      { error: `Type ${month} to confirm approving this month’s quality-passed assets.` },
      { status: 400 }
    );
  }

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const activeAccountId = accountContext.activeAccountId;

  if (!activeAccountId) {
    return NextResponse.json({ error: "No active workspace selected." }, { status: 400 });
  }

  const baseSelect = "id,title,asset_type,status,quality_workflow_status,intended_publish_month,planned_publish_date,scheduled_publish_at,campaign_week_start_date,is_active_version,account_id";

  const [accountAssetsResult, legacyAssetsResult] = await Promise.all([
    supabase
      .from("generated_assets")
      .select(baseSelect)
      .eq("account_id", activeAccountId)
      .is("archived_at", null)
      .neq("status", "approved")
      .eq("quality_workflow_status", "review_ready")
      .order("created_at", { ascending: true })
      .limit(1000),
    accountContext.isMaster
      ? supabase
          .from("generated_assets")
          .select(baseSelect)
          .eq("user_id", user.id)
          .is("account_id", null)
          .is("archived_at", null)
          .neq("status", "approved")
          .eq("quality_workflow_status", "review_ready")
          .order("created_at", { ascending: true })
          .limit(1000)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const assetsError = accountAssetsResult.error ?? legacyAssetsResult.error;

  if (assetsError) {
    return NextResponse.json({ error: assetsError.message }, { status: 400 });
  }

  const assets = uniqueRowsById([
    ...(Array.isArray(accountAssetsResult.data) ? accountAssetsResult.data : []),
    ...(Array.isArray(legacyAssetsResult.data) ? legacyAssetsResult.data : []),
  ])
    .filter((asset) => asset.is_active_version !== false)
    .filter((asset) => assetBelongsToMonth(asset, month));

  const assetIds = assets.map((asset) => asset.id).filter(Boolean);

  if (!assetIds.length) {
    return NextResponse.json({
      ok: true,
      month,
      approvedCount: 0,
      message: "No quality-passed assets needed approval for this month.",
    });
  }

  const { error: updateError } = await supabase
    .from("generated_assets")
    .update({
      status: "approved",
      account_id: activeAccountId,
    })
    .in("id", assetIds);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    account_id: activeAccountId,
    activity_type: "monthly_review_ready_assets_bulk_approved",
    title: "Monthly quality-passed assets bulk approved",
    description: `${assetIds.length} quality-passed asset(s) approved for ${month}.`,
    metadata: {
      month,
      approvedCount: assetIds.length,
      accountId: activeAccountId,
      assetIds,
      assets: assets.map((asset) => ({
        id: asset.id,
        title: asset.title,
        assetType: asset.asset_type,
      })),
    },
  });

  return NextResponse.json({
    ok: true,
    month,
    approvedCount: assetIds.length,
    accountId: activeAccountId,
    assetIds,
  });
}