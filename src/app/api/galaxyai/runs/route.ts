import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startGalaxyAiWorkflowRun } from "@/lib/galaxyai/client";
import { logActivity } from "@/lib/security/auditLog";
import type { Json } from "@/types/database.types";

type GalaxyAiInputMapping = {
  nodeRequestKey: string;
  promptFieldName: string;
};

const GALAXYAI_WORKFLOW_INPUT_MAPPINGS: Record<string, GalaxyAiInputMapping> = {
  cmp4j5u8o0001jm049rtesgiw: {
    nodeRequestKey: "node_1772800705319_request",
    promptFieldName: "Car prompt",
  },
};

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
  workflowId: string;
  prompt: string;
}) {
  const mapping = GALAXYAI_WORKFLOW_INPUT_MAPPINGS[input.workflowId];

  if (mapping) {
    return {
      [mapping.nodeRequestKey]: {
        [mapping.promptFieldName]: input.prompt,
      },
    };
  }

  // Fallback for future workflows that expose a simple prompt node.
  // If a workflow rejects this shape, add its workflowId to GALAXYAI_WORKFLOW_INPUT_MAPPINGS.
  return {
    prompt: {
      prompt: input.prompt,
    },
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const workflowId =
      typeof body.workflowId === "string" ? body.workflowId : null;
    const assetId = typeof body.assetId === "string" ? body.assetId : null;
    const campaignId =
      typeof body.campaignId === "string" ? body.campaignId : null;

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

    const { data: asset, error: assetError } = await supabase
      .from("generated_assets")
      .select("*")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

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

    const values = buildGalaxyAiValues({
      workflowId,
      prompt: asset.content,
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
        campaign_id: campaignId ?? asset.campaign_id ?? null,
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
            GALAXYAI_WORKFLOW_INPUT_MAPPINGS[workflowId] ?? "fallback_prompt_mapping",
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
        assetType: asset.asset_type,
        parentAssetId: asset.parent_asset_id ?? null,
        campaignId: campaignId ?? asset.campaign_id ?? null,
        inputMapping:
          GALAXYAI_WORKFLOW_INPUT_MAPPINGS[workflowId] ?? "fallback_prompt_mapping",
      },
    });

    return NextResponse.json({ run: savedRun });
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
