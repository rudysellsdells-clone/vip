import { NextResponse } from "next/server";
import { getAssetAccessForUser, scopeAssetQueryForAccess } from "@/lib/accounts/asset-access";
import { startGalaxyAiWorkflowRun } from "@/lib/galaxyai/client";
import { prepareGalaxyAiRunInput } from "@/lib/galaxyai/run-input";
import { createLumaGeneration } from "@/lib/luma/client";
import { logActivity } from "@/lib/security/auditLog";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { isVideoStudioEnabled } from "@/lib/video-studio/feature";
import {
  lumaScenePlanFromPackage,
  recordValue,
  videoPackageFromMetadata,
} from "@/lib/video-studio/video-asset";
import type { Json } from "@/types/database.types";

type RouteContext = { params: Promise<{ assetId: string }> };

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function text(value: unknown, maxLength = 500) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

async function updateAssetRenderMetadata({
  supabase,
  asset,
  accountId,
  userId,
  render,
}: {
  supabase: any;
  asset: Record<string, any>;
  accountId: string | null;
  userId: string;
  render: Record<string, unknown>;
}) {
  const metadata = { ...recordValue(asset.metadata), render };
  let query = supabase.from("generated_assets").update({ metadata: toJson(metadata) });
  query = scopeAssetQueryForAccess({ query, asset, accountId, userId });
  await query;
}

export async function POST(request: Request, context: RouteContext) {
  if (!isVideoStudioEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const { assetId } = await context.params;
    const supabase = untypedSupabase(await createClient());
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getAssetAccessForUser({ supabase, assetId, userId: user.id });
    if (!access.asset || !access.canManage) {
      return NextResponse.json({ error: "Video package not found." }, { status: 404 });
    }
    if (access.asset.status !== "approved") {
      return NextResponse.json(
        { error: "Approve the video package before starting a provider render." },
        { status: 409 },
      );
    }
    const videoPackage = videoPackageFromMetadata(access.asset.metadata);
    if (!videoPackage) {
      return NextResponse.json({ error: "This asset is not a Video Studio package." }, { status: 400 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const startedAt = new Date().toISOString();

    if (videoPackage.provider === "luma") {
      if (!videoPackage.campaignId) {
        return NextResponse.json(
          { error: "Luma rendering requires a campaign-linked video package." },
          { status: 400 },
        );
      }
      const scenePlan = lumaScenePlanFromPackage(videoPackage);
      if (scenePlan.length !== 4) {
        return NextResponse.json({ error: "Luma requires four video scenes." }, { status: 400 });
      }
      const model = process.env.LUMA_MODEL?.trim() || "ray-2";
      const resolution = process.env.LUMA_RESOLUTION?.trim() || "720p";
      const { data: run, error: runError } = await supabase
        .from("luma_video_runs")
        .insert({
          user_id: user.id,
          campaign_id: videoPackage.campaignId,
          status: "draft",
          target_seconds: 20,
          scene_count: 4,
          current_scene_index: 0,
          model,
          resolution,
          aspect_ratio: videoPackage.aspectRatio,
          scene_plan: toJson(scenePlan),
          generations: [],
          notes: `Video Studio asset ${access.asset.id}; source ${videoPackage.source.type}:${videoPackage.source.id}`,
        })
        .select("*")
        .single();
      if (runError || !run) throw new Error(runError?.message ?? "Unable to create Luma run.");

      try {
        const first = await createLumaGeneration({
          prompt: scenePlan[0].prompt,
          model,
          resolution,
          duration: "5s",
          aspect_ratio: videoPackage.aspectRatio,
          loop: false,
        });
        const generations = [{
          sceneIndex: 0,
          label: scenePlan[0].label,
          generationId: first.id,
          state: first.state ?? "queued",
          prompt: scenePlan[0].prompt,
          videoUrl: first.assets?.video ?? null,
          createdAt: startedAt,
        }];
        const { data: updatedRun, error: updateError } = await supabase
          .from("luma_video_runs")
          .update({
            status: "generating_scene_1",
            current_scene_index: 0,
            generations: toJson(generations),
          })
          .eq("id", run.id)
          .eq("user_id", user.id)
          .select("*")
          .single();
        if (updateError) throw new Error(updateError.message);
        await updateAssetRenderMetadata({
          supabase,
          asset: access.asset,
          accountId: access.accountId,
          userId: user.id,
          render: {
            provider: "luma",
            runId: run.id,
            providerRunId: first.id,
            startedAt,
          },
        });
        await logActivity(supabase, {
          userId: user.id,
          activityType: "video_studio_luma_render_started",
          title: "Luma render started",
          description: videoPackage.title,
          metadata: toJson({ assetId, runId: run.id, generationId: first.id }),
        });
        return NextResponse.json({ run: updatedRun, providerRun: first });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected Luma error.";
        await supabase.from("luma_video_runs").update({ status: "failed", error: message }).eq("id", run.id).eq("user_id", user.id);
        throw new Error(message);
      }
    }

    const workflowId = text(body.workflowId, 300);
    if (!workflowId || !access.accountId) {
      return NextResponse.json(
        { error: "Choose an active Magica video workflow before rendering." },
        { status: 400 },
      );
    }
    const { data: workflow, error: workflowError } = await supabase
      .from("galaxyai_workflows")
      .select("galaxy_workflow_id,metadata,active")
      .eq("account_id", access.accountId)
      .eq("galaxy_workflow_id", workflowId)
      .eq("active", true)
      .maybeSingle();
    if (workflowError || !workflow) {
      return NextResponse.json({ error: "Active Magica workflow not found." }, { status: 404 });
    }
    const prepared = prepareGalaxyAiRunInput({
      sourcePrompt: access.asset.content,
      workflowMetadata: workflow.metadata,
      assetType: "galaxyai_prompt",
    });
    const providerRun = await startGalaxyAiWorkflowRun({
      workflowId,
      values: prepared.values,
    });
    const { data: run, error: runError } = await supabase
      .from("galaxyai_runs")
      .insert({
        user_id: user.id,
        account_id: access.accountId,
        campaign_id: access.asset.campaign_id ?? null,
        asset_id: access.asset.id,
        galaxy_run_id: providerRun.runId,
        galaxy_workflow_id: workflowId,
        status: "queued",
        input: toJson({
          workflowId,
          values: prepared.values,
          source: "video_studio",
          videoPackage,
          promptCompaction: {
            imagePromptLength: prepared.imagePrompt.sentLength,
            videoPromptLength: prepared.videoPrompt?.sentLength ?? null,
            sharedPromptLength: prepared.sharedPrompt?.sentLength ?? null,
            sharedPromptMode: prepared.sharedPromptMode,
          },
        }),
        output: {},
        started_at: startedAt,
      })
      .select("*")
      .single();
    if (runError || !run) throw new Error(runError?.message ?? "Unable to save Magica run.");
    await updateAssetRenderMetadata({
      supabase,
      asset: access.asset,
      accountId: access.accountId,
      userId: user.id,
      render: {
        provider: "magica",
        runId: run.id,
        providerRunId: providerRun.runId,
        startedAt,
      },
    });
    await logActivity(supabase, {
      userId: user.id,
      activityType: "video_studio_magica_render_started",
      title: "Magica render started",
      description: videoPackage.title,
      metadata: toJson({ assetId, runId: run.id, providerRunId: providerRun.runId, workflowId }),
    });
    return NextResponse.json({ run, providerRun });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected video render error." },
      { status: 400 },
    );
  }
}
