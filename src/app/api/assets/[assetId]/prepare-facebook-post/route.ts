import { NextResponse } from "next/server";
import { loadGalaxyMediaForAsset } from "@/lib/galaxyai/media";
import { createClient } from "@/lib/supabase/server";
import {
  FACEBOOK_APP_NAME,
  buildFacebookMcpInput,
  getFacebookPageName,
  isFacebookAsset,
} from "@/lib/zapier/facebook";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { assetId } = await context.params;
    const supabase = await createClient();

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
        { error: "Only approved Facebook post assets can be prepared." },
        { status: 400 }
      );
    }

    if (!isFacebookAsset(asset.asset_type, asset.title)) {
      return NextResponse.json(
        { error: "This asset does not appear to be a Facebook post." },
        { status: 400 }
      );
    }

    const mediaAttachments = await loadGalaxyMediaForAsset({
      supabase,
      userId: user.id,
      assetId: asset.id,
      campaignId: asset.campaign_id ?? null,
    });

    const mcpInput = buildFacebookMcpInput({
      assetId: asset.id,
      campaignId: asset.campaign_id ?? null,
      assetTitle: asset.title ?? null,
      content: asset.content,
      mediaAttachments,
    });

    const { data: existingPolicy } = await supabase
      .from("zapier_action_policies")
      .select("id")
      .eq("user_id", user.id)
      .eq("app_name", FACEBOOK_APP_NAME)
      .eq("action_name", mcpInput.action)
      .eq("active", true)
      .maybeSingle();

    if (!existingPolicy) {
      const { error: policyError } = await supabase
        .from("zapier_action_policies")
        .insert({
          user_id: user.id,
          app_name: FACEBOOK_APP_NAME,
          action_name: mcpInput.action,
          risk_level: "medium",
          approval_required: true,
          notes:
            "Publishes approved Facebook assets to the configured Facebook Page. Uses native media upload actions when GalaxyAI image/video URLs are available. Never publish to a personal profile.",
          active: true,
        });

      if (policyError) {
        return NextResponse.json({ error: policyError.message }, { status: 400 });
      }
    }

    const { data: toolRun, error: toolRunError } = await supabase
      .from("tool_runs")
      .insert({
        user_id: user.id,
        provider: "zapier_mcp",
        action_name: mcpInput.actionLabel,
        status: "waiting_approval",
        input: mcpInput,
        output: {},
        requires_approval: true,
        approved_by_user: false,
      })
      .select("id")
      .single();

    if (toolRunError || !toolRun) {
      return NextResponse.json(
        { error: toolRunError?.message ?? "Unable to prepare Facebook action." },
        { status: 400 }
      );
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "zapier_action_prepared",
      title: "Facebook post prepared",
      description: `Prepared ${mcpInput.actionLabel} for ${getFacebookPageName()}.`,
      metadata: {
        app: FACEBOOK_APP_NAME,
        action: mcpInput.action,
        policyKey: mcpInput.policyKey,
        assetId: asset.id,
        campaignId: asset.campaign_id ?? null,
        toolRunId: toolRun.id,
        pageName: getFacebookPageName(),
        mediaUploadMode: mcpInput.mediaUploadMode,
        mediaAttachmentCount: mediaAttachments.length,
        primaryMediaUrl: mcpInput.primaryMediaUrl,
      },
    });

    return NextResponse.json({
      ok: true,
      toolRunId: toolRun.id,
      pageName: getFacebookPageName(),
      action: mcpInput.action,
      mediaUploadMode: mcpInput.mediaUploadMode,
      mediaAttachmentCount: mediaAttachments.length,
      primaryMediaUrl: mcpInput.primaryMediaUrl,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error preparing Facebook post." },
      { status: 500 }
    );
  }
}
