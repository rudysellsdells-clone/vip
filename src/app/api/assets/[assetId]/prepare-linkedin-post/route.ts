import { NextResponse } from "next/server";
import { loadGalaxyMediaForAsset } from "@/lib/galaxyai/media";
import {
  attachAccountPublishingSettingsToAsset,
  isLikelyLinkedInOrganizationId,
  publishingSettingsFromAsset,
} from "@/lib/accounts/account-publishing-settings";
import { createClient } from "@/lib/supabase/server";
import {
  LINKEDIN_ACTION_NAME,
  LINKEDIN_APP_NAME,
  LINKEDIN_POLICY_KEY,
  buildLinkedInMcpInput,
  getLinkedInCompanyPageName,
  getLinkedInOrganizationId,
  isLinkedInAsset,
} from "@/lib/zapier/linkedin";

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

    const assetForPublishing = await attachAccountPublishingSettingsToAsset({
      supabase,
      asset,
    });
    const publishingSettings = publishingSettingsFromAsset(assetForPublishing);
    const pageName =
      publishingSettings?.linkedin_page_name?.trim() || getLinkedInCompanyPageName();
    const organizationId =
      publishingSettings?.linkedin_company_id?.trim() || getLinkedInOrganizationId();

    if (!isLikelyLinkedInOrganizationId(organizationId)) {
      return NextResponse.json(
        {
          error:
            "LinkedIn Company ID is missing or is not an actual organization ID. Add the numeric LinkedIn organization ID or urn:li:organization:<id> in account Publishing settings before preparing a LinkedIn post.",
          pageName,
          organizationId: organizationId ?? null,
        },
        { status: 400 },
      );
    }

    if (assetForPublishing.status !== "approved") {
      return NextResponse.json(
        { error: "Only approved LinkedIn post assets can be prepared." },
        { status: 400 }
      );
    }

    if (!isLinkedInAsset(assetForPublishing.asset_type, assetForPublishing.title)) {
      return NextResponse.json(
        { error: "This asset does not appear to be a LinkedIn post." },
        { status: 400 }
      );
    }

    const mediaAttachments = await loadGalaxyMediaForAsset({
      supabase,
      userId: user.id,
      assetId: assetForPublishing.id,
      campaignId: assetForPublishing.campaign_id ?? null,
    });

    const mcpInput = buildLinkedInMcpInput({
      assetId: assetForPublishing.id,
      campaignId: assetForPublishing.campaign_id ?? null,
      assetTitle: assetForPublishing.title ?? null,
      content: assetForPublishing.content,
      pageName,
      organizationId,
      mediaAttachments,
    });

    const { data: existingPolicy } = await supabase
      .from("zapier_action_policies")
      .select("id")
      .eq("user_id", user.id)
      .eq("app_name", LINKEDIN_APP_NAME)
      .eq("action_name", LINKEDIN_ACTION_NAME)
      .eq("active", true)
      .maybeSingle();

    if (!existingPolicy) {
      const { error: policyError } = await supabase
        .from("zapier_action_policies")
        .insert({
          user_id: user.id,
          app_name: LINKEDIN_APP_NAME,
          action_name: LINKEDIN_ACTION_NAME,
          risk_level: "medium",
          approval_required: true,
          notes:
            "Publishes approved LinkedIn post assets to the configured company page. Uploads GalaxyAI image URLs through the native image field when available. Does not publish to a personal profile.",
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
        action_name: "LinkedIn company page post",
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
        { error: toolRunError?.message ?? "Unable to prepare LinkedIn action." },
        { status: 400 }
      );
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "zapier_action_prepared",
      title: "LinkedIn post prepared",
      description: `Prepared LinkedIn company page post for ${pageName}.`,
      metadata: {
        app: LINKEDIN_APP_NAME,
        action: LINKEDIN_ACTION_NAME,
        policyKey: LINKEDIN_POLICY_KEY,
        assetId: assetForPublishing.id,
        campaignId: assetForPublishing.campaign_id ?? null,
        toolRunId: toolRun.id,
        pageName,
        mediaUploadMode: mcpInput.mediaUploadMode,
        mediaAttachmentCount: mediaAttachments.length,
        primaryMediaUrl: mcpInput.primaryMediaUrl,
        unsupportedMediaUrl: mcpInput.unsupportedMediaUrl,
      },
    });

    return NextResponse.json({
      ok: true,
      toolRunId: toolRun.id,
      pageName,
      mediaUploadMode: mcpInput.mediaUploadMode,
      mediaAttachmentCount: mediaAttachments.length,
      primaryMediaUrl: mcpInput.primaryMediaUrl,
      unsupportedMediaUrl: mcpInput.unsupportedMediaUrl,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error preparing LinkedIn post." },
      { status: 500 }
    );
  }
}
