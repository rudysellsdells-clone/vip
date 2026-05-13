import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGalaxyAiRun,
  getGalaxyAiWorkflowMedia,
} from "@/lib/galaxyai/client";
import { logActivity } from "@/lib/security/auditLog";
import type { GalaxyAiMediaItem } from "@/lib/galaxyai/types";
import type { Json } from "@/types/database.types";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function normalizeGalaxyAiStatus(status: unknown) {
  if (typeof status !== "string") {
    return "running";
  }

  const normalized = status.toLowerCase();

  if (
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "completed" ||
    normalized === "failed" ||
    normalized === "canceled"
  ) {
    return normalized;
  }

  return "running";
}

function getFinishedAt(galaxyRun: Record<string, unknown>) {
  const possibleValues = [
    galaxyRun.finishedAt,
    galaxyRun.finished_at,
    galaxyRun.completedAt,
    galaxyRun.completed_at,
  ];

  const match = possibleValues.find((value) => typeof value === "string");

  return typeof match === "string" ? match : new Date().toISOString();
}

function isJsonObject(value: Json | null | undefined): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getMediaUrls(mediaItems: GalaxyAiMediaItem[]) {
  return mediaItems
    .map((item) => item.url)
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0);
}

function filterMediaForRun(mediaItems: GalaxyAiMediaItem[], galaxyRunId: string) {
  return mediaItems.filter((item) => item.runId === galaxyRunId);
}

async function createGalaxyAiMediaAssetIfNeeded(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  campaignId: string | null;
  localRunId: string;
  galaxyRunId: string;
  workflowId: string;
  mediaItems: GalaxyAiMediaItem[];
  galaxyRun: unknown;
}) {
  if (!input.campaignId || input.mediaItems.length === 0) {
    return null;
  }

  const { data: existingAssets, error: existingError } = await input.supabase
    .from("generated_assets")
    .select("id, metadata")
    .eq("user_id", input.userId)
    .eq("campaign_id", input.campaignId)
    .eq("asset_type", "galaxyai_media");

  if (existingError) {
    throw new Error(existingError.message);
  }

  const alreadySaved = existingAssets?.some((asset) => {
    const metadata = isJsonObject(asset.metadata) ? asset.metadata : null;

    return metadata?.provider === "galaxyai" && metadata?.runId === input.galaxyRunId;
  });

  if (alreadySaved) {
    return null;
  }

  const urls = getMediaUrls(input.mediaItems);
  const content = urls.length
    ? urls.join("\n")
    : "GalaxyAI completed the run, but no media URLs were returned.";

  const { data: createdAsset, error: insertError } = await input.supabase
    .from("generated_assets")
    .insert({
      user_id: input.userId,
      campaign_id: input.campaignId,
      asset_type: "galaxyai_media",
      title: "GalaxyAI Generated Media",
      content,
      metadata: toJson({
        provider: "galaxyai",
        workflowId: input.workflowId,
        runId: input.galaxyRunId,
        localRunId: input.localRunId,
        media: input.mediaItems,
        galaxyRun: input.galaxyRun,
      }),
      status: "needs_review",
    })
    .select("*")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return createdAsset;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { runId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { data: localRun, error: localRunError } = await supabase
      .from("galaxyai_runs")
      .select("*")
      .eq("id", runId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!localRun && !localRunError) {
      const fallbackResult = await supabase
        .from("galaxyai_runs")
        .select("*")
        .eq("galaxy_run_id", runId)
        .eq("user_id", user.id)
        .maybeSingle();

      localRun = fallbackResult.data;
      localRunError = fallbackResult.error;
    }

    if (localRunError) {
      return NextResponse.json({ error: localRunError.message }, { status: 400 });
    }

    if (!localRun || !localRun.galaxy_run_id || !localRun.galaxy_workflow_id) {
      return NextResponse.json({ error: "GalaxyAI run not found." }, { status: 404 });
    }

    const galaxyRun = await getGalaxyAiRun(localRun.galaxy_run_id);
    const galaxyRunRecord = galaxyRun as Record<string, unknown>;
    const status = normalizeGalaxyAiStatus(galaxyRunRecord.status);
    const isFinished =
      status === "completed" || status === "failed" || status === "canceled";

    let matchedMedia: GalaxyAiMediaItem[] = [];
    let createdMediaAsset = null;

    if (status === "completed") {
      const workflowMedia = await getGalaxyAiWorkflowMedia(localRun.galaxy_workflow_id);
      matchedMedia = filterMediaForRun(workflowMedia.items ?? [], localRun.galaxy_run_id);

      createdMediaAsset = await createGalaxyAiMediaAssetIfNeeded({
        supabase,
        userId: user.id,
        campaignId: localRun.campaign_id,
        localRunId: localRun.id,
        galaxyRunId: localRun.galaxy_run_id,
        workflowId: localRun.galaxy_workflow_id,
        mediaItems: matchedMedia,
        galaxyRun,
      });
    }

    const { data: updatedRun, error: updateError } = await supabase
      .from("galaxyai_runs")
      .update({
        status,
        output: toJson({
          galaxyRun,
          media: matchedMedia,
          mediaAssetCreated: Boolean(createdMediaAsset),
          mediaAssetId: createdMediaAsset?.id ?? null,
        }),
        error:
          typeof galaxyRunRecord.error === "string"
            ? galaxyRunRecord.error
            : null,
        completed_at: isFinished ? getFinishedAt(galaxyRunRecord) : null,
      })
      .eq("id", localRun.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "galaxyai_run_status_checked",
      title: "GalaxyAI run status checked",
      description:
        status === "completed"
          ? `GalaxyAI run completed with ${matchedMedia.length} media item(s).`
          : `GalaxyAI run is ${status}.`,
      metadata: {
        localRunId: localRun.id,
        galaxyRunId: localRun.galaxy_run_id,
        status,
        mediaCount: matchedMedia.length,
        mediaAssetCreated: Boolean(createdMediaAsset),
        mediaAssetId: createdMediaAsset?.id ?? null,
      },
    });

    return NextResponse.json({
      run: updatedRun,
      galaxyRun,
      media: matchedMedia,
      createdMediaAsset,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error checking GalaxyAI run." },
      { status: 500 }
    );
  }
}
