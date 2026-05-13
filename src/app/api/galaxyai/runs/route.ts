import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startGalaxyAiWorkflowRun } from "@/lib/galaxyai/client";
import { logActivity } from "@/lib/security/auditLog";
import type { Json } from "@/types/database.types";

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function buildGalaxyAiValues(input: {
  prompt: string;
  campaignId: string | null;
  assetId: string;
}) {
  return {
    prompt: {
      value: input.prompt,
      type: "text",
      label: "Prompt",
    },
    campaignId: {
      value: input.campaignId,
      type: "text",
      label: "Campaign ID",
    },
    assetId: {
      value: input.assetId,
      type: "text",
      label: "Asset ID",
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

    if (asset.asset_type !== "galaxyai_prompt") {
      return NextResponse.json(
        { error: "Only GalaxyAI prompt assets can be sent to GalaxyAI." },
        { status: 400 }
      );
    }

    if (asset.status !== "approved") {
      return NextResponse.json(
        { error: "GalaxyAI prompt must be approved before running." },
        { status: 403 }
      );
    }

    const values = buildGalaxyAiValues({
      prompt: asset.content,
      campaignId: campaignId ?? asset.campaign_id ?? null,
      assetId: asset.id,
    });

    const run = await startGalaxyAiWorkflowRun({
      workflowId,
      values,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/galaxyai`,
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
      activityType: "galaxyai_run_started",
      title: "GalaxyAI workflow run started",
      description: `Started GalaxyAI workflow ${workflowId}.`,
      metadata: {
        workflowId,
        runId: galaxyRunId,
        assetId: asset.id,
        campaignId: campaignId ?? asset.campaign_id ?? null,
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
