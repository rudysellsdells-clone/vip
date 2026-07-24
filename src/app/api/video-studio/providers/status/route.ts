import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isVideoStudioEnabled } from "@/lib/video-studio/feature";
import { providerConfigurationStatus } from "@/lib/video-studio/provider-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isVideoStudioEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      providers: providerConfigurationStatus({
        lumaApiKey: process.env.LUMA_API_KEY,
        magicaApiKey: process.env.MAGICA_API_KEY,
        galaxyAiApiKey: process.env.GALAXYAI_API_KEY,
      }),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
