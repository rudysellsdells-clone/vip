import { NextResponse } from "next/server";
import { createLumaGeneration } from "@/lib/luma/client";
import {
  buildLumaYoutubeScenePlan,
  getLumaStatusForScene,
  summarizeScenePlan,
} from "@/lib/luma/youtube-video-plan";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

function readEnv(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

export async function POST(_request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const model = readEnv("LUMA_MODEL", "ray-2");
  const resolution = readEnv("LUMA_RESOLUTION", "720p");
  const aspectRatio = readEnv("LUMA_ASPECT_RATIO", "16:9");
  const scenePlan = buildLumaYoutubeScenePlan(campaign);

  const { data: run, error: runError } = await supabase
    .from("luma_video_runs")
    .insert({
      user_id: user.id,
      campaign_id: campaign.id,
      status: "draft",
      target_seconds: 20,
      scene_count: scenePlan.length,
      current_scene_index: 0,
      model,
      resolution,
      aspect_ratio: aspectRatio,
      scene_plan: scenePlan,
      generations: [],
      notes: "Luma 20-second YouTube video run. Scene 1 starts from text; scenes 2-4 extend the prior completed generation.",
    })
    .select("*")
    .single();

  if (runError || !run) {
    return NextResponse.json(
      { error: runError?.message ?? "Unable to create Luma video run." },
      { status: 400 }
    );
  }

  try {
    const firstScene = scenePlan[0];

    const generation = await createLumaGeneration({
      prompt: firstScene.prompt,
      model,
      resolution,
      duration: "5s",
      aspect_ratio: aspectRatio,
      loop: false,
    });

    const generations = [
      {
        sceneIndex: 0,
        label: firstScene.label,
        generationId: generation.id,
        state: generation.state ?? "queued",
        prompt: firstScene.prompt,
        videoUrl: generation.assets?.video ?? null,
        createdAt: new Date().toISOString(),
      },
    ];

    const { data: updatedRun, error: updateError } = await supabase
      .from("luma_video_runs")
      .update({
        status: getLumaStatusForScene(0),
        current_scene_index: 0,
        generations,
      })
      .eq("id", run.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "luma_youtube_video_started",
      title: "Luma YouTube video started",
      description: campaign.name,
      metadata: {
        campaignId: campaign.id,
        runId: run.id,
        model,
        resolution,
        aspectRatio,
        scenePlan: summarizeScenePlan(scenePlan),
        firstGenerationId: generation.id,
      },
    });

    return NextResponse.json({
      ok: true,
      run: updatedRun,
      firstGeneration: generation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Luma error.";

    await supabase
      .from("luma_video_runs")
      .update({
        status: "failed",
        error: message,
      })
      .eq("id", run.id)
      .eq("user_id", user.id);

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
