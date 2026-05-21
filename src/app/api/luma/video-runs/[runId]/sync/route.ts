import { NextResponse } from "next/server";
import { isLumaYoutubeLaneEnabled } from "@/lib/config/media-providers";
import {
  createLumaGeneration,
  getLumaGeneration,
  getLumaVideoUrl,
} from "@/lib/luma/client";
import { getLumaStatusForScene } from "@/lib/luma/youtube-video-plan";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

type GenerationEntry = {
  sceneIndex: number;
  label?: string;
  generationId: string;
  state?: string;
  prompt: string;
  videoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  failureReason?: string | null;
};

function readEnv(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export async function POST(_request: Request, context: RouteContext) {
  if (!isLumaYoutubeLaneEnabled()) {
    return NextResponse.json(
      {
        error:
          "Luma YouTube lane is disabled. GalaxyAI remains the active media provider.",
      },
      { status: 403 }
    );
  }

  const { runId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: run, error: runError } = await supabase
    .from("luma_video_runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", user.id)
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: "Luma video run not found." }, { status: 404 });
  }

  if (["completed", "failed", "cancelled"].includes(run.status)) {
    return NextResponse.json({
      ok: true,
      run,
      message: `Run is already ${run.status}.`,
    });
  }

  const scenePlan = asArray(run.scene_plan) as Array<Record<string, any>>;
  const generations = asArray(run.generations) as GenerationEntry[];
  const currentSceneIndex = Number(run.current_scene_index ?? 0);
  const currentEntry = generations.find(
    (entry) => Number(entry.sceneIndex) === currentSceneIndex
  );

  if (!currentEntry?.generationId) {
    return NextResponse.json(
      { error: "Current Luma generation is missing. Start a new video run." },
      { status: 400 }
    );
  }

  try {
    const generation = await getLumaGeneration(currentEntry.generationId);
    const videoUrl = getLumaVideoUrl(generation);

    const updatedGenerations = generations.map((entry) =>
      entry.generationId === currentEntry.generationId
        ? {
            ...entry,
            state: generation.state ?? entry.state,
            videoUrl: videoUrl ?? entry.videoUrl ?? null,
            failureReason: generation.failure_reason ?? null,
            updatedAt: new Date().toISOString(),
          }
        : entry
    );

    if (generation.state === "failed") {
      const message = generation.failure_reason || "Luma generation failed.";

      const { data: failedRun } = await supabase
        .from("luma_video_runs")
        .update({
          status: "failed",
          error: message,
          generations: updatedGenerations,
        })
        .eq("id", run.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      return NextResponse.json({
        ok: false,
        error: message,
        run: failedRun,
      }, { status: 400 });
    }

    if (generation.state !== "completed") {
      const { data: updatedRun, error: updateError } = await supabase
        .from("luma_video_runs")
        .update({
          generations: updatedGenerations,
        })
        .eq("id", run.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        run: updatedRun,
        generation,
        message: `Scene ${currentSceneIndex + 1} is still ${generation.state ?? "processing"}.`,
      });
    }

    const nextSceneIndex = currentSceneIndex + 1;
    const isFinalScene = nextSceneIndex >= scenePlan.length;

    if (isFinalScene) {
      const finalVideoUrl = videoUrl ?? currentEntry.videoUrl ?? null;

      const { data: completedRun, error: completedError } = await supabase
        .from("luma_video_runs")
        .update({
          status: "completed",
          generations: updatedGenerations,
          final_video_url: finalVideoUrl,
          error: null,
        })
        .eq("id", run.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (completedError) {
        return NextResponse.json({ error: completedError.message }, { status: 400 });
      }

      await supabase.from("activity_log").insert({
        user_id: user.id,
        activity_type: "luma_youtube_video_completed",
        title: "Luma YouTube video completed",
        description: finalVideoUrl ?? "Final Luma video URL unavailable.",
        metadata: {
          campaignId: run.campaign_id,
          runId: run.id,
          finalVideoUrl,
        },
      });

      return NextResponse.json({
        ok: true,
        run: completedRun,
        generation,
        message: "Luma 20-second YouTube video is complete.",
      });
    }

    const nextScene = scenePlan[nextSceneIndex];

    if (!nextScene?.prompt) {
      return NextResponse.json(
        { error: `Scene ${nextSceneIndex + 1} prompt is missing.` },
        { status: 400 }
      );
    }

    const model = run.model || readEnv("LUMA_MODEL", "ray-2");
    const resolution = run.resolution || readEnv("LUMA_RESOLUTION", "720p");
    const aspectRatio = run.aspect_ratio || readEnv("LUMA_ASPECT_RATIO", "16:9");

    const nextGeneration = await createLumaGeneration({
      prompt: String(nextScene.prompt),
      model,
      resolution,
      duration: "5s",
      aspect_ratio: aspectRatio,
      loop: false,
      keyframes: {
        frame0: {
          type: "generation",
          id: currentEntry.generationId,
        },
      },
    });

    const nextEntry: GenerationEntry = {
      sceneIndex: nextSceneIndex,
      label: String(nextScene.label ?? `Scene ${nextSceneIndex + 1}`),
      generationId: nextGeneration.id,
      state: nextGeneration.state ?? "queued",
      prompt: String(nextScene.prompt),
      videoUrl: nextGeneration.assets?.video ?? null,
      createdAt: new Date().toISOString(),
    };

    const { data: advancedRun, error: advancedError } = await supabase
      .from("luma_video_runs")
      .update({
        status: getLumaStatusForScene(nextSceneIndex),
        current_scene_index: nextSceneIndex,
        generations: [...updatedGenerations, nextEntry],
        error: null,
      })
      .eq("id", run.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (advancedError) {
      return NextResponse.json({ error: advancedError.message }, { status: 400 });
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "luma_youtube_video_scene_started",
      title: "Luma YouTube video scene started",
      description: `Scene ${nextSceneIndex + 1}`,
      metadata: {
        campaignId: run.campaign_id,
        runId: run.id,
        previousGenerationId: currentEntry.generationId,
        nextGenerationId: nextGeneration.id,
        sceneIndex: nextSceneIndex,
      },
    });

    return NextResponse.json({
      ok: true,
      run: advancedRun,
      generation,
      nextGeneration,
      message: `Scene ${currentSceneIndex + 1} completed. Scene ${nextSceneIndex + 1} started.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Luma sync error.";

    const { data: failedRun } = await supabase
      .from("luma_video_runs")
      .update({
        status: "failed",
        error: message,
      })
      .eq("id", run.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    return NextResponse.json({ error: message, run: failedRun }, { status: 400 });
  }
}
