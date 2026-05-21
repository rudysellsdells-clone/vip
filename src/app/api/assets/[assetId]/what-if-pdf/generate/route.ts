import { NextResponse } from "next/server";
import {
  buildWhatIfPdf,
  inferBusinessNameFromTitle,
} from "@/lib/what-if-stories/pdf-template";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

function safeFileName(value: string) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "what-if-story";
}

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
      { error: "Only What-If Success Story assets can use this PDF export." },
      { status: 400 }
    );
  }

  const businessName = inferBusinessNameFromTitle(asset.title ?? "");
  const pdfBuffer = buildWhatIfPdf({
    assetTitle: asset.title ?? "What-If Success Story",
    assetContent: asset.content ?? "",
    businessName,
  });

  const fileName = `${safeFileName(asset.title ?? "what-if-story")}-${Date.now()}.pdf`;
  const filePath = `${user.id}/${asset.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("what-if-pdfs")
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: publicUrlData } = supabase.storage
    .from("what-if-pdfs")
    .getPublicUrl(filePath);

  const fileUrl = publicUrlData?.publicUrl;

  if (!fileUrl) {
    return NextResponse.json(
      { error: "PDF was created, but no public URL was returned." },
      { status: 400 }
    );
  }

  const { data: exportRow, error: exportError } = await supabase
    .from("asset_exports")
    .insert({
      user_id: user.id,
      asset_id: asset.id,
      export_type: "what_if_pdf",
      status: "created",
      file_url: fileUrl,
      file_path: filePath,
      file_name: fileName,
      mime_type: "application/pdf",
      metadata: {
        businessName,
        assetTitle: asset.title,
      },
    })
    .select("*")
    .single();

  if (exportError) {
    return NextResponse.json({ error: exportError.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "what_if_story_pdf_generated",
    title: "What-If Story PDF generated",
    description: asset.title,
    metadata: {
      assetId: asset.id,
      exportId: exportRow.id,
      fileUrl,
      filePath,
      businessName,
    },
  });

  return NextResponse.json({
    ok: true,
    export: exportRow,
    fileUrl,
  });
}
