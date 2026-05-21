import { NextResponse } from "next/server";
import {
  buildWhatIfEmailDraft,
  inferBusinessNameFromTitle,
} from "@/lib/what-if-stories/pdf-template";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());

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

  if (asset.asset_type !== "prospect_what_if_story") {
    return NextResponse.json(
      { error: "Only What-If Success Story assets can create this PDF email draft." },
      { status: 400 }
    );
  }

  const { data: latestPdf, error: pdfError } = await supabase
    .from("asset_exports")
    .select("*")
    .eq("user_id", user.id)
    .eq("asset_id", asset.id)
    .eq("export_type", "what_if_pdf")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pdfError) {
    return NextResponse.json({ error: pdfError.message }, { status: 400 });
  }

  if (!latestPdf?.file_url) {
    return NextResponse.json(
      { error: "Generate the branded PDF before preparing the Gmail draft." },
      { status: 400 }
    );
  }

  const businessName = inferBusinessNameFromTitle(asset.title ?? "");
  const draft = buildWhatIfEmailDraft({
    assetTitle: asset.title ?? "What-If Success Story",
    businessName,
    pdfUrl: latestPdf.file_url,
  });

  const { data: exportRow, error: exportError } = await supabase
    .from("asset_exports")
    .insert({
      user_id: user.id,
      asset_id: asset.id,
      export_type: "gmail_draft_with_pdf",
      status: "prepared",
      file_url: latestPdf.file_url,
      file_path: latestPdf.file_path,
      file_name: latestPdf.file_name,
      mime_type: "application/pdf",
      subject: draft.subject,
      body: draft.body,
      metadata: {
        businessName,
        pdfExportId: latestPdf.id,
        attachmentUrl: latestPdf.file_url,
        note:
          "Prepared Gmail draft content with PDF attachment URL. Wire this record into the Gmail/Zapier execution route to create the actual draft with attachment.",
      },
    })
    .select("*")
    .single();

  if (exportError) {
    return NextResponse.json({ error: exportError.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "what_if_story_gmail_draft_prepared",
    title: "What-If Story Gmail draft prepared",
    description: asset.title,
    metadata: {
      assetId: asset.id,
      exportId: exportRow.id,
      pdfUrl: latestPdf.file_url,
      subject: draft.subject,
      attachmentUrl: latestPdf.file_url,
    },
  });

  return NextResponse.json({
    ok: true,
    draft,
    export: exportRow,
    attachmentUrl: latestPdf.file_url,
  });
}
