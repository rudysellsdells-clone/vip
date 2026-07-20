import { NextResponse } from "next/server";
import { getAssetAccessForUser } from "@/lib/accounts/asset-access";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { startGalaxyAiWorkflowRun } from "@/lib/galaxyai/client";
import { compactMagicaPrompt } from "@/lib/galaxyai/prompt-compactor";
import { getVipManagedGalaxyWorkflowMetadata } from "@/lib/galaxyai/workflow-metadata";
import { logActivity } from "@/lib/security/auditLog";
import type { Json } from "@/types/database.types";

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}


function buildGalaxyAiValues(input: {
  prompt: string;
  workflowMetadata: unknown;
}) {
  const vipWorkflowMetadata = getVipManagedGalaxyWorkflowMetadata(input.workflowMetadata);

  if (vipWorkflowMetadata?.inputMapping) {
    return {
      [vipWorkflowMetadata.inputMapping.nodeRequestKey]: {
        [vipWorkflowMetadata.inputMapping.promptFieldName]: input.prompt,
      },
    };
  }

  return {
    prompt: {
      prompt: input.prompt,
    },
  };
}

export async function POST(request: Request) {
  try {
    const supabase = untypedSupabase(await createClient());
    const body = await request.json();

    const workflowId =
      typeof body.workflowId === "string" ? body.workflowId : null;
    const assetId = typeof body.assetId === "string" ? body.assetId : null;
    
    if (!workflowId || !assetId) {
      return NextResponse.json(
        { error: "workflowId and assetId are required." },
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

    const assetAccess = await getAssetAccessForUser({
      supabase,
      assetId,
      userId: user.id,
    });

    if (!assetAccess.asset || !assetAccess.canView) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    if (!assetAccess.accountId) {
      return NextResponse.json(
        { error: "This GalaxyAI asset must be assigned to a workspace before it can be run." },
        { status: 400 }
      );
    }

    if (!assetAccess.canManage) {
      return NextResponse.json(
        { error: "You do not have permission to run GalaxyAI workflows for this workspace." },
        { status: 403 }
      );
    }

    const asset = assetAccess.asset;

    const supportedGalaxyPromptTypes = ["galaxyai_prompt", "galaxyai_image_prompt"];

    if (!supportedGalaxyPromptTypes.includes(String(asset.asset_type))) {
      return NextResponse.json(
        {
          error:
            "Only approved GalaxyAI prompt assets can be sent to GalaxyAI. Supported types: galaxyai_prompt and galaxyai_image_prompt.",
        },
        { status: 400 }
      );
    }

    if (asset.status !== "approved") {
      return NextResponse.json(
        { error: "GalaxyAI prompt must be approved before running." },
        { status: 403 }
      );
    }

    const assetMetadata = jsonRecord(asset.metadata);

    const { data: workflowRecord, error: workflowError } = await supabase
      .from("galaxyai_workflows")
      .select("metadata")
      .eq("account_id", assetAccess.accountId)
      .eq("galaxy_workflow_id", workflowId)
      .maybeSingle();

    if (workflowError) {
      return NextResponse.json({ error: workflowError.message }, { status: 400 });
    }

    const promptCompaction = compactMagicaPrompt(asset.content);
    const values = buildGalaxyAiValues({
      prompt: promptCompaction.prompt,
      workflowMetadata: workflowRecord?.metadata ?? null,
    });

    const run = await startGalaxyAiWorkflowRun({
      workflowId,
      values,
    });

    const galaxyRunId = run.runId;

    const { data: savedRun, error: saveError } = await supabase
      .from("galaxyai_runs")
      .insert({
        user_id: user.id,
        account_id: assetAccess.accountId,
        campaign_id: asset.campaign_id ?? null,
        asset_id: asset.id,
        galaxy_run_id: galaxyRunId,
        galaxy_workflow_id: workflowId,
        status: "queued",
        input: toJson({
          workflowId,
          values,
          assetType: asset.asset_type,
          promptPurpose:
            asset.asset_type === "galaxyai_image_prompt"
              ? "social_image_generation"
              : "video_or_media_generation",
          parentAssetId: asset.parent_asset_id ?? null,
          sourceSocialAssetType: stringOrNull(assetMetadata.sourceSocialAssetType),
          sourceSocialAssetSortOrder: numberOrNull(assetMetadata.sourceSocialAssetSortOrder),
          imagePlatform: stringOrNull(assetMetadata.imagePlatform),
          imageFormat: stringOrNull(assetMetadata.imageFormat),
          inputMapping:
            getVipManagedGalaxyWorkflowMetadata(workflowRecord?.metadata ?? null)?.inputMapping ??
            "fallback_prompt_mapping",
          promptCompaction: {
            originalLength: promptCompaction.originalLength,
            sentLength: promptCompaction.sentLength,
            wasCompacted: promptCompaction.wasCompacted,
            limit: promptCompaction.limit,
          },
        }),
        output: {},
        started_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType:
        asset.asset_type === "galaxyai_image_prompt"
          ? "galaxyai_image_run_started"
          : "galaxyai_run_started",
      title:
        asset.asset_type === "galaxyai_image_prompt"
          ? "GalaxyAI image workflow run started"
          : "GalaxyAI workflow run started",
      description: `Started GalaxyAI workflow ${workflowId} for ${asset.asset_type}.`,
      metadata: {
        workflowId,
        runId: galaxyRunId,
        assetId: asset.id,
        accountId: assetAccess.accountId,
        assetType: asset.asset_type,
        parentAssetId: asset.parent_asset_id ?? null,
        campaignId: asset.campaign_id ?? null,
        inputMapping:
          getVipManagedGalaxyWorkflowMetadata(workflowRecord?.metadata ?? null)?.inputMapping ??
          "fallback_prompt_mapping",
        promptCompaction: {
          originalLength: promptCompaction.originalLength,
          sentLength: promptCompaction.sentLength,
          wasCompacted: promptCompaction.wasCompacted,
          limit: promptCompaction.limit,
        },
      },
    });

    return NextResponse.json({
      run: savedRun,
      promptCompaction: {
        originalLength: promptCompaction.originalLength,
        sentLength: promptCompaction.sentLength,
        wasCompacted: promptCompaction.wasCompacted,
        limit: promptCompaction.limit,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error starting GalaxyAI run." },
      { status: 500 }
    );
  }
}
