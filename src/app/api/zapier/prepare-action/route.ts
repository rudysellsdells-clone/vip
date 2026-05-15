import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildZapierPreparedAction } from "@/lib/zapier/planner";
import { logActivity } from "@/lib/security/auditLog";
import type { Json } from "@/types/database.types";

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const assetId = typeof body.assetId === "string" ? body.assetId : null;

    if (!assetId) {
      return NextResponse.json(
        { error: "assetId is required." },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: asset, error: assetError } = await supabase
      .from("generated_assets")
      .select("*")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    if (asset.status !== "approved") {
      return NextResponse.json(
        { error: "Only approved assets can be prepared for Zapier." },
        { status: 403 }
      );
    }

    const { data: latestApproval } = await supabase
      .from("approvals")
      .select("*")
      .eq("asset_id", asset.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const preparedAction = buildZapierPreparedAction({
      id: asset.id,
      campaign_id: asset.campaign_id,
      asset_type: asset.asset_type,
      title: asset.title,
      content: asset.content,
      status: asset.status,
    });

    const sourceAssetSnapshot = {
      id: asset.id,
      campaignId: asset.campaign_id,
      assetType: asset.asset_type,
      title: asset.title,
      content: asset.content,
      status: asset.status,
      version: asset.version,
      metadata: asset.metadata,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
    };

    const approvalSnapshot = latestApproval
      ? {
          id: latestApproval.id,
          status: latestApproval.status,
          notes: latestApproval.notes,
          approvedAt: latestApproval.approved_at,
          createdAt: latestApproval.created_at,
        }
      : null;

    const toolRunInput = {
      assetId: asset.id,
      campaignId: asset.campaign_id,
      sourceAsset: sourceAssetSnapshot,
      approval: approvalSnapshot,
      preparedAction,
      preparedAt: new Date().toISOString(),
      safety: {
        requiresApprovedAsset: true,
        assetStatusAtPreparation: asset.status,
        externalExecutionRequiresFinalClick: true,
      },
    };

    const { data: toolRun, error: toolRunError } = await supabase
      .from("tool_runs")
      .insert({
        user_id: user.id,
        provider: "zapier_mcp",
        action_name: `${preparedAction.app}:${preparedAction.action}`,
        status: "waiting_approval",
        input: toJson(toolRunInput),
        output: {},
        requires_approval: true,
        approved_by_user: false,
      })
      .select("*")
      .single();

    if (toolRunError) {
      return NextResponse.json({ error: toolRunError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "zapier_action_prepared",
      title: "Zapier action prepared",
      description: `${preparedAction.app} ${preparedAction.actionName} prepared from approved asset.`,
      metadata: toJson({
        toolRunId: toolRun.id,
        assetId: asset.id,
        campaignId: asset.campaign_id,
        app: preparedAction.app,
        action: preparedAction.action,
        policyKey: preparedAction.policyKey,
        assetType: asset.asset_type,
        assetStatus: asset.status,
        approvalId: latestApproval?.id ?? null,
      }),
    });

    return NextResponse.json({
      success: true,
      toolRun,
      preparedAction,
      sourceAsset: sourceAssetSnapshot,
      approval: approvalSnapshot,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error preparing Zapier action." },
      { status: 500 }
    );
  }
}
