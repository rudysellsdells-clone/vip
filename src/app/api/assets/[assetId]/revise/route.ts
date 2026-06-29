import { NextResponse } from "next/server";
import { getAssetAccessForUser, scopeAssetQueryForAccess, scopeRelatedAssetQueryForAccess } from "@/lib/accounts/asset-access";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { generateAssetRevision } from "@/lib/ai/revision-generator";
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

function getInstructions(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { assetId } = await context.params;
    const supabase = untypedSupabase(await createClient());
    const body = await request.json().catch(() => ({}));
    const instructions =
      getInstructions(body.instructions) ||
      getInstructions(body.revisionNotes) ||
      getInstructions(body.notes);

    if (!instructions) {
      return NextResponse.json(
        { error: "Revision instructions are required." },
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

    const assetAccess = await getAssetAccessForUser({ supabase, assetId, userId: user.id });

    if (!assetAccess.asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    if (!assetAccess.canManage) {
      return NextResponse.json(
        { error: "You do not have permission to revise this asset." },
        { status: 403 }
      );
    }

    const asset = assetAccess.asset;
    const accountId = assetAccess.accountId;

    if (asset.status === "published" || asset.status === "sent") {
      return NextResponse.json(
        { error: "Published or sent assets cannot be revised directly. Create a new campaign or duplicate the asset first." },
        { status: 403 }
      );
    }

    const { data: campaign } = asset.campaign_id
      ? await scopeRelatedAssetQueryForAccess({
          query: supabase
            .from("campaigns")
            .select("*")
            .eq("id", asset.campaign_id),
          accountId,
          userId: user.id,
        }).maybeSingle()
      : { data: null };

    const revision = await generateAssetRevision({
      userId: user.id,
      accountId,
      asset: {
        id: asset.id,
        asset_type: asset.asset_type,
        title: asset.title,
        content: asset.content,
        version: asset.version,
      },
      campaign: campaign
        ? {
            id: campaign.id,
            name: campaign.name,
            idea: campaign.idea,
            buyer_segment: campaign.buyer_segment,
            audience: campaign.audience,
            goal: campaign.goal,
            tone: campaign.tone,
            cta: campaign.cta,
            notes: campaign.notes,
          }
        : null,
      instructions,
    });

    const nextVersion = (asset.version ?? 1) + 1;

    const { data: revisedAsset, error: revisedAssetError } = await supabase
      .from("generated_assets")
      .insert({
        account_id: accountId,
        user_id: user.id,
        campaign_id: asset.campaign_id,
        asset_type: asset.asset_type,
        title: revision.revisedTitle,
        content: revision.revisedContent,
        status: "needs_review",
        version: nextVersion,
        parent_asset_id: asset.id,
        metadata: toJson({
          generatedBy: "asset_revision_engine",
          sprint: "5.8",
          cloneMemoryUsed: true,
          cloneMemorySnapshot: revision.cloneMemorySnapshot,
          revision: {
            parentAssetId: asset.id,
            parentVersion: asset.version,
            instructions,
            revisionSummary: revision.revisionSummary,
            requestedAt: new Date().toISOString(),
          },
        }),
      })
      .select("*")
      .single();

    if (revisedAssetError) {
      return NextResponse.json({ error: revisedAssetError.message }, { status: 400 });
    }

    await scopeAssetQueryForAccess({
      query: supabase
        .from("generated_assets")
        .update({
          status: "revision_requested",
          metadata: toJson({
            ...(asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata)
              ? asset.metadata
              : {}),
            latestRevisionAssetId: revisedAsset.id,
            latestRevisionRequestedAt: new Date().toISOString(),
            latestRevisionInstructions: instructions,
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
      notes: instructions,
    });

    await logActivity(supabase, {
      userId: user.id,
      activityType: "asset_revision_generated",
      title: "Asset revision generated",
      description: `Created version ${nextVersion} of ${asset.title ?? asset.asset_type}.`,
      metadata: toJson({
        accountId,
        parentAssetId: asset.id,
        revisedAssetId: revisedAsset.id,
        campaignId: asset.campaign_id,
        assetType: asset.asset_type,
        parentVersion: asset.version,
        revisedVersion: nextVersion,
        instructions,
        revisionSummary: revision.revisionSummary,
        cloneMemoryUsed: true,
      }),
    });

    return NextResponse.json({
      success: true,
      parentAsset: {
        id: asset.id,
        status: "revision_requested",
      },
      revisedAsset,
      revisionSummary: revision.revisionSummary,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error creating asset revision." },
      { status: 500 }
    );
  }
}
