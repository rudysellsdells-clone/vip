import { NextResponse } from "next/server";
import {
  getAccountWriteClient,
  nullableTextValue,
  userCanManageAccount,
} from "@/lib/accounts/account-utils";
import { normalizeBrandColors, storeBrandLogo } from "@/lib/brand-assets/brand-profile-assets";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export const runtime = "nodejs";

type BrandProfileBody = Record<string, unknown>;

function isMultipart(request: Request) {
  return request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data") ?? false;
}

async function readBrandProfileBody(request: Request) {
  if (!isMultipart(request)) {
    const body = await request.json().catch(() => ({}));

    return {
      body: body as BrandProfileBody,
      logo: null as File | null,
    };
  }

  const formData = await request.formData();
  const logoValue = formData.get("logo");
  const logo = logoValue instanceof File && logoValue.size > 0 ? logoValue : null;

  return {
    body: {
      companyName: formData.get("companyName"),
      websiteUrl: formData.get("websiteUrl"),
      primaryCta: formData.get("primaryCta"),
      phone: formData.get("phone"),
      targetAudience: formData.get("targetAudience"),
      tone: formData.get("tone"),
      serviceAreas: formData.get("serviceAreas"),
      coreOffers: formData.get("coreOffers"),
      approvedHashtags: formData.get("approvedHashtags"),
      brandColors: formData.get("brandColors"),
      notes: formData.get("notes"),
    },
    logo,
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const { accountId } = await params;
    const supabase = untypedSupabase(await createClient());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManage = await userCanManageAccount({ supabase, accountId, userId: user.id });

    if (!canManage) {
      return NextResponse.json(
        { error: "Only account owners and admins can update brand profiles." },
        { status: 403 },
      );
    }

    const writeSupabase = getAccountWriteClient();

    if (!writeSupabase) {
      return NextResponse.json(
        { error: "Saving account brand profiles requires SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 },
      );
    }

    const { body, logo } = await readBrandProfileBody(request);
    const logoAsset = logo ? await storeBrandLogo({ accountId, file: logo }) : null;

    const payload: Record<string, unknown> = {
      account_id: accountId,
      company_name: nullableTextValue(body.companyName),
      website_url: nullableTextValue(body.websiteUrl),
      primary_cta: nullableTextValue(body.primaryCta),
      phone: nullableTextValue(body.phone),
      target_audience: nullableTextValue(body.targetAudience),
      tone: nullableTextValue(body.tone),
      service_areas: nullableTextValue(body.serviceAreas),
      core_offers: nullableTextValue(body.coreOffers),
      approved_hashtags: nullableTextValue(body.approvedHashtags),
      brand_colors: normalizeBrandColors(body.brandColors),
      notes: nullableTextValue(body.notes),
      updated_at: new Date().toISOString(),
    };

    if (logoAsset) {
      payload.logo_url = logoAsset.publicUrl;
      payload.logo_storage_bucket = logoAsset.bucket;
      payload.logo_storage_path = logoAsset.storagePath;
      payload.logo_file_name = logoAsset.fileName;
      payload.logo_mime_type = logoAsset.contentType;
      payload.logo_size_bytes = logoAsset.fileSizeBytes;
    }

    const { data, error } = await writeSupabase
      .from("account_brand_profiles")
      .upsert(payload, { onConflict: "account_id" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await writeSupabase
      .from("accounts")
      .update({
        website_url: payload.website_url,
        primary_cta: payload.primary_cta,
      })
      .eq("id", accountId);

    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error saving brand profile." },
      { status: 500 },
    );
  }
}
