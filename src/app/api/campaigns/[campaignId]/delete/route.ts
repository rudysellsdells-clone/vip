import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/security/auditLog";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id,name,status")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 }
      );
    }

    const { count: assetCount } = await supabase
      .from("generated_assets")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id);

    const { error: deleteError } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "campaign_deleted",
      title: "Campaign deleted",
      description: campaign.name,
      metadata: {
        campaignId,
        campaignStatus: campaign.status,
        deletedGeneratedAssetCount: assetCount ?? 0,
      },
    });

    return NextResponse.json({
      ok: true,
      deletedCampaignId: campaignId,
      deletedGeneratedAssetCount: assetCount ?? 0,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error deleting campaign." },
      { status: 500 }
    );
  }
}
