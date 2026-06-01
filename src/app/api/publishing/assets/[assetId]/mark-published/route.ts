import { NextResponse } from "next/server";
import { markAssetPublished } from "@/lib/assets/asset-lifecycle";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

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

  const body = await request.json().catch(() => ({}));

  try {
    const asset = await markAssetPublished({
      supabase,
      userId: user.id,
      assetId,
      provider: String(body.provider ?? "zapier"),
      reference: body.reference ? String(body.reference) : null,
    });

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "asset_published",
      title: "Asset published",
      description: asset.title,
      metadata: {
        assetId,
        provider: body.provider ?? "zapier",
        reference: body.reference ?? null,
      },
    });

    return NextResponse.json({ ok: true, asset });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to mark asset as published." },
      { status: 400 }
    );
  }
}
