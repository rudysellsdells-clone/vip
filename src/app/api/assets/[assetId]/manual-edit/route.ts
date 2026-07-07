import { NextResponse } from "next/server";
import {
  getAssetAccessForUser,
  scopeAssetQueryForAccess,
} from "@/lib/accounts/asset-access";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { logActivity } from "@/lib/security/auditLog";
import type { Json } from "@/types/database.types";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { assetId } = await context.params;
    const supabase = untypedSupabase(await createClient());
    const body = await request.json().catch(() => ({}));
    const editedTitle = cleanString(body.title);
    const editedContent = cleanString(body.content);
    const editNotes = cleanString(body.notes);

    if (!editedTitle) {
      return NextResponse.json(
        { error: "A title is required before saving an edited version." },
        { status: 400 },
      );
    }

    if (!editedContent) {
      return NextResponse.json(
        { error: "Asset content is required before saving an edited version." },
        { status: 400 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assetAccess = await getAssetAccessForUser({
      supabase,
      assetId,
      userId: user.id,
    });

    if (!assetAccess.asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    if (!assetAccess.canManage) {
      return NextResponse.json(
        { error: "You do not have permission to edit this asset." },
        { status: 403 },
      );
    }

    const asset = assetAccess.asset;
    const accountId = assetAccess.accountId;

    if (asset.status === "published" || asset.status === "sent") {
      return NextResponse.json(
        {
          error:
            "Published or sent assets cannot be edited directly. Create a new version before publishing changes.",
        },
        { status: 403 },
      );
    }

    const normalizedExistingTitle = cleanString(asset.title);
    const normalizedExistingContent = cleanString(asset.content);

    if (
      normalizedExistingTitle === editedTitle &&
      normalizedExistingContent === editedContent
    ) {
      return NextResponse.json(
        { error: "No changes were detected. Edit the title or content before saving." },
        { status: 400 },
      );
    }

    const nextVersion = (Number(asset.version) || 1) + 1;
    const now = new Date().toISOString();
    const parentMetadata = metadataRecord(asset.metadata);

    const { data: editedAsset, error: editedAssetError } = await supabase
      .from("generated_assets")
      .insert({
        account_id: accountId,
        user_id: user.id,
        campaign_id: asset.campaign_id,
        asset_type: asset.asset_type,
        title: editedTitle,
        content: editedContent,
        status: "needs_review",
        version: nextVersion,
        parent_asset_id: asset.id,
        metadata: toJson({
          ...parentMetadata,
          generatedBy: "manual_asset_finalization",
          sprint: "H1.6C1",
          manualEdit: {
            parentAssetId: asset.id,
            parentVersion: asset.version,
            editedAt: now,
            notes: editNotes || null,
            previousTitle: normalizedExistingTitle || null,
          },
        }),
      })
      .select("*")
      .single();

    if (editedAssetError) {
      return NextResponse.json({ error: editedAssetError.message }, { status: 400 });
    }

    await scopeAssetQueryForAccess({
      query: supabase
        .from("generated_assets")
        .update({
          status: "revision_requested",
          metadata: toJson({
            ...parentMetadata,
            latestManualEditAssetId: editedAsset.id,
            latestManualEditAt: now,
            latestManualEditNotes: editNotes || null,
          }),
        }),
      asset,
      accountId,
      userId: user.id,
    });

    await supabase.from("approvals").insert({
      user_id: user.id,
      asset_id: asset.id,
      status: "revision_requested",
      notes: editNotes || "Manual edited version saved for review.",
    });

    await supabase.from("approvals").insert({
      user_id: user.id,
      asset_id: editedAsset.id,
      status: "pending",
      notes: "Manual edited version saved for review.",
    });

    await logActivity(supabase, {
      userId: user.id,
      activityType: "asset_manual_edit_saved",
      title: "Manual asset edit saved",
      description: `Created manually edited version ${nextVersion} of ${asset.title ?? asset.asset_type}.`,
      metadata: toJson({
        accountId,
        parentAssetId: asset.id,
        editedAssetId: editedAsset.id,
        campaignId: asset.campaign_id,
        assetType: asset.asset_type,
        parentVersion: asset.version,
        editedVersion: nextVersion,
        notes: editNotes || null,
      }),
    });

    return NextResponse.json({
      success: true,
      parentAsset: {
        id: asset.id,
        status: "revision_requested",
      },
      editedAsset,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error saving manual asset edit." },
      { status: 500 },
    );
  }
}
