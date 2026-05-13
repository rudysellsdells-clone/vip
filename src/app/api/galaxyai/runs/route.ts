import { NextResponse } from "next/server";
import { startGalaxyAiWorkflowRun } from "@/lib/galaxyai/client";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/security/auditLog";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: runs, error } = await supabase
      .from("galaxyai_runs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ runs: runs ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error loading GalaxyAI runs." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const workflowId = typeof body.workflowId === "string" ? body.workflowId : null;
    const assetId = typeof body.assetId === "string" ? body.assetId : null;
    const campaignId = typeof body.campaignId === "string" ? body.campaignId : null;
    const values = body.values && typeof body.values === "object" ? body.values : {};

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

    if (asset.status !== "approved") {
      return NextResponse.json(
        { error: "This asset must be approved before a GalaxyAI workflow can run." },
        { status: 403 }
      );
    }

    if (asset.asset_type !== "galaxyai_prompt") {
      return NextResponse.json(
        { error: "Only approved GalaxyAI prompt assets can start GalaxyAI runs." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const webhookUrl = appUrl ? `${appUrl}/api/webhooks/galaxyai` : undefined;

    const runResponse = await startGalaxyAiWorkflowRun({
      workflowId,
      values: {
        prompt: asset.content,
        campaignId,
        assetId,
        ...values,
      },
      webhookUrl,
    });

    const { data: savedRun, error: saveError } = await supabase
      .from("galaxyai_runs")
      .insert({
        user_id: user.id,
        campaign_id: campaignId,
        asset_id: assetId,
        galaxy_run_id: runResponse.runId,
        galaxy_workflow_id: workflowId,
        status: "queued",
        input: {
          prompt: asset.content,
          campaignId,
          assetId,
          values,
        },
        output: {},
        started_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 400 });
    }

    await supabase.from("tool_runs").insert({
      user_id: user.id,
      provider: "galaxyai",
      action_name: "start_workflow_run",
      status: "running",
      input: { workflowId, assetId, campaignId },
      output: { runId: runResponse.runId },
      requires_approval: true,
      approved_by_user: true,
    });

    await logActivity(supabase, {
      userId: user.id,
      activityType: "galaxyai_run_started",
      title: "GalaxyAI run started",
      description: `Started GalaxyAI workflow run ${runResponse.runId}.`,
      metadata: { workflowId, runId: runResponse.runId, assetId, campaignId },
    });

    return NextResponse.json({ run: savedRun });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error starting GalaxyAI run." },
      { status: 400 }
    );
  }
}
