import { NextResponse } from "next/server";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import {
  defaultUtmTaxonomySettings,
  mergeUtmTaxonomySettings,
  normalizeUtmToken,
} from "@/lib/analytics/utm-taxonomy";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function recordValue(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function sanitizedOverrides(value: unknown) {
  const source = recordValue(value);
  const result: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(source)) {
    const safeKey = normalizeUtmToken(key, "", 60);
    const safeValue = normalizeUtmToken(rawValue, "", 60);
    if (safeKey && safeValue) result[safeKey] = safeValue;
  }

  return result;
}

export async function GET(request: Request) {
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = new URL(request.url).searchParams.get("accountId")?.trim() || "";
  const access = await getAccountAccessForUser({ supabase, accountId, userId: user.id });

  if (!access.canView) {
    return NextResponse.json({ error: "Account access denied." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("analytics_utm_settings")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    settings: mergeUtmTaxonomySettings(
      data ?? defaultUtmTaxonomySettings(accountId),
      accountId,
    ),
    canManage: access.canManage,
  });
}

export async function PUT(request: Request) {
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = recordValue(await request.json());
  const accountId = String(body.accountId ?? "").trim();
  const access = await getAccountAccessForUser({ supabase, accountId, userId: user.id });

  if (!access.canManage) {
    return NextResponse.json(
      { error: "Only an account owner or administrator can change UTM taxonomy settings." },
      { status: 403 },
    );
  }

  const settings = mergeUtmTaxonomySettings(
    {
      account_id: accountId,
      default_email_source: normalizeUtmToken(body.defaultEmailSource, "email", 60),
      default_website_source: normalizeUtmToken(body.defaultWebsiteSource, "website", 60),
      default_sms_source: normalizeUtmToken(body.defaultSmsSource, "sms", 60),
      include_audience_term: body.includeAudienceTerm !== false,
      append_link_to_social: body.appendLinkToSocial !== false,
      append_link_to_email: body.appendLinkToEmail !== false,
      source_overrides: sanitizedOverrides(body.sourceOverrides),
      medium_overrides: sanitizedOverrides(body.mediumOverrides),
    },
    accountId,
  );

  const { data, error } = await supabase
    .from("analytics_utm_settings")
    .upsert(
      {
        account_id: accountId,
        taxonomy_version: settings.taxonomy_version,
        default_email_source: settings.default_email_source,
        default_website_source: settings.default_website_source,
        default_sms_source: settings.default_sms_source,
        include_audience_term: settings.include_audience_term,
        append_link_to_social: settings.append_link_to_social,
        append_link_to_email: settings.append_link_to_email,
        source_overrides: settings.source_overrides,
        medium_overrides: settings.medium_overrides,
        created_by: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" },
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ settings: data });
}
