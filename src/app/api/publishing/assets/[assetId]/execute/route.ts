import { NextResponse } from "next/server";
import {
  buildPublishingInstructions,
  buildPublishingParams,
  getPublishingRoute,
  getZapierAppForChannel,
} from "@/lib/publishing/asset-routing";
import { canExecuteBySchedule, scheduleBlockReason } from "@/lib/publishing/schedule-status";
import { executeZapierMcpWriteAction } from "@/lib/zapier/mcp-write-client";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

function readForm(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

async function existingCompletedRun({
  supabase,
  userId,
  assetId,
  channel,
}: {
  supabase: any;
  userId: string;
  assetId: string;
  channel: string;
}) {
  const { data } = await supabase
    .from("publishing_execution_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("asset_id", assetId)
    .eq("channel", channel)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

async function createRun({
  supabase,
  userId,
  asset,
  route,
  instructions,
  params,
  recipientEmail,
}: {
  supabase: any;
  userId: string;
  asset: Record<string, any>;
  route: NonNullable<ReturnType<typeof getPublishingRoute>>;
  instructions: string;
  params: Record<string, unknown>;
  recipientEmail?: string;
}) {
  const { data, error } = await supabase
    .from("publishing_execution_runs")
    .insert({
      user_id: userId,
      asset_id: asset.id,
      provider: route.provider,
      channel: route.channel,
      action_key: route.actionKey,
      status: "prepared",
      destination: route.destinationLabel,
      instructions,
      params,
      metadata: {
        assetType: asset.asset_type,
        assetTitle: asset.title,
        recipientEmail: recipientEmail || null,
        scheduled_publish_at: asset.scheduled_publish_at ?? null,
        publish_timezone: asset.publish_timezone ?? null,
        scheduleAwareExecution: true,
        wordpressPostStatus:
          route.channel === "wordpress"
            ? process.env.WORDPRESS_DEFAULT_POST_STATUS?.trim() || "draft"
            : null,
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create publishing execution run.");
  }

  return data;
}

export async function POST(request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const recipientEmail = readForm(formData, "recipient_email");

  const { data: asset, error: assetError } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .single();

  if (assetError || !asset) {
    return NextResponse.json(
      { error: "Asset not found or has been archived." },
      { status: 404 }
    );
  }

  if (asset.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved assets can be executed." },
      { status: 400 }
    );
  }

  if (!canExecuteBySchedule(asset)) {
    return NextResponse.json(
      {
        error: scheduleBlockReason(asset),
        scheduled_publish_at: asset.scheduled_publish_at ?? null,
        publish_timezone: asset.publish_timezone ?? null,
        scheduling_status: asset.scheduling_status ?? null,
      },
      { status: 400 }
    );
  }

  const route = getPublishingRoute(asset.asset_type);

  if (!route) {
    return NextResponse.json(
      { error: "This asset type is not supported by the publishing readiness workflow." },
      { status: 400 }
    );
  }

  if (route.requiresConfiguredAction && !route.actionKey) {
    return NextResponse.json(
      {
        error: `${route.destinationLabel} execution is not configured yet. Add the matching Zapier action key in Vercel.`,
        missingEnv: route.channel === "wordpress" ? "ZAPIER_WORDPRESS_CREATE_POST_ACTION_KEY" : undefined,
      },
      { status: 400 }
    );
  }

  const duplicate = await existingCompletedRun({
    supabase,
    userId: user.id,
    assetId: asset.id,
    channel: route.channel,
  });

  if (duplicate) {
    return NextResponse.json({
      ok: true,
      duplicatePrevented: true,
      message: "This approved asset already has a completed execution run for this channel.",
      run: duplicate,
    });
  }

  const instructions = buildPublishingInstructions({
    asset,
    route,
    recipientEmail,
  });

  const params = buildPublishingParams({
    asset,
    route,
    recipientEmail,
  });

  try {
    const run = await createRun({
      supabase,
      userId: user.id,
      asset,
      route,
      instructions,
      params,
      recipientEmail,
    });

    if (route.provider === "galaxyai") {
      const { data: preparedRun, error: preparedError } = await supabase
        .from("publishing_execution_runs")
        .update({
          status: "prepared",
          provider_result: {
            message:
              "GalaxyAI media request prepared. Wire this run into the existing GalaxyAI media route when ready.",
          },
        })
        .eq("id", run.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (preparedError) {
        return NextResponse.json({ error: preparedError.message }, { status: 400 });
      }

      await supabase.from("activity_log").insert({
        user_id: user.id,
        activity_type: "publishing_execution_prepared",
        title: "GalaxyAI media request prepared",
        description: asset.title,
        metadata: {
          runId: run.id,
          assetId: asset.id,
          channel: route.channel,
          provider: route.provider,
          scheduled_publish_at: asset.scheduled_publish_at ?? null,
        },
      });

      return NextResponse.json({
        ok: true,
        preparedOnly: true,
        run: preparedRun,
      });
    }

    const app = getZapierAppForChannel(route.channel);

    await supabase
      .from("publishing_execution_runs")
      .update({ status: "sent_to_provider" })
      .eq("id", run.id)
      .eq("user_id", user.id);

    const result = await executeZapierMcpWriteAction({
      app,
      action: route.actionKey,
      instructions,
      params,
      output:
        "Return the created record ID, URL if available, draft/post status, and any useful execution details.",
    });

    const { data: completedRun, error: completedError } = await supabase
      .from("publishing_execution_runs")
      .update({
        status: "completed",
        provider_result: result,
        error: null,
        metadata: {
          ...(run.metadata ?? {}),
          zapierApp: app,
          zapierAction: route.actionKey,
          completedAt: new Date().toISOString(),
        },
      })
      .eq("id", run.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (completedError) {
      return NextResponse.json({ error: completedError.message }, { status: 400 });
    }

    if (route.channel !== "wordpress") {
      await supabase
        .from("generated_assets")
        .update({
          scheduling_status: "published",
        })
        .eq("id", asset.id)
        .eq("user_id", user.id)
        .is("archived_at", null);
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type:
        route.channel === "wordpress"
          ? "wordpress_draft_created"
          : "publishing_execution_completed",
      title:
        route.channel === "wordpress"
          ? "WordPress draft request completed"
          : `${route.destinationLabel} execution completed`,
      description: asset.title,
      metadata: {
        runId: run.id,
        assetId: asset.id,
        channel: route.channel,
        provider: route.provider,
        actionKey: route.actionKey,
        scheduled_publish_at: asset.scheduled_publish_at ?? null,
        result,
      },
    });

    return NextResponse.json({
      ok: true,
      run: completedRun,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected publishing execution error.";

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "publishing_execution_failed",
      title: "Publishing execution failed",
      description: message,
      metadata: {
        assetId: asset.id,
        assetTitle: asset.title,
        assetType: asset.asset_type,
        route,
        scheduled_publish_at: asset.scheduled_publish_at ?? null,
      },
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
