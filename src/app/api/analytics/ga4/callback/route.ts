import { NextResponse } from "next/server";
import {
  encryptAnalyticsSecret,
  verifyAnalyticsOAuthState,
} from "@/lib/analytics/crypto";
import {
  exchangeGoogleAuthorizationCode,
  listGoogleAnalyticsProperties,
} from "@/lib/analytics/google";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export const runtime = "nodejs";

function analyticsRedirect(request: Request, key: string, value: string) {
  const url = new URL("/analytics", request.url);
  url.searchParams.set(key, value.slice(0, 500));
  return url;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const oauthError = requestUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      analyticsRedirect(request, "ga4_error", `Google authorization returned: ${oauthError}`),
    );
  }

  try {
    const code = requestUrl.searchParams.get("code")?.trim() ?? "";
    const state = requestUrl.searchParams.get("state")?.trim() ?? "";
    const cookieState = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("mvip_ga4_oauth_state="))
      ?.slice("mvip_ga4_oauth_state=".length);

    if (!code || !state || !cookieState || decodeURIComponent(cookieState) !== state) {
      throw new Error("Google Analytics authorization state was missing or did not match.");
    }

    const statePayload = verifyAnalyticsOAuthState(state);
    const supabase = untypedSupabase(await createClient());
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== statePayload.userId) {
      throw new Error("Your Marketing VIP session expired during Google authorization.");
    }

    const access = await getAccountAccessForUser({
      supabase,
      accountId: statePayload.accountId,
      userId: user.id,
    });

    if (!access.canManage) {
      throw new Error("You no longer have permission to manage this account's analytics.");
    }

    const tokens = await exchangeGoogleAuthorizationCode(code);
    if (!tokens.access_token) {
      throw new Error("Google did not return an analytics access token.");
    }

    const availableProperties = await listGoogleAnalyticsProperties(tokens.access_token);
    const admin = untypedSupabase(createAdminClient());
    const { data: currentSourceData, error: currentSourceError } = await admin
      .from("analytics_data_sources")
      .select("id,settings,external_property_id,status")
      .eq("account_id", statePayload.accountId)
      .eq("source_type", "ga4")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (currentSourceError) throw new Error(currentSourceError.message);
    const currentSource = currentSourceData as Record<string, unknown> | null;
    const currentSettings =
      currentSource?.settings && typeof currentSource.settings === "object"
        ? (currentSource.settings as Record<string, unknown>)
        : {};
    const now = new Date().toISOString();
    const sourcePayload = {
      account_id: statePayload.accountId,
      source_type: "ga4",
      status: currentSource?.external_property_id ? "active" : "connecting",
      name: "Google Analytics 4",
      settings: {
        ...currentSettings,
        available_properties: availableProperties,
        connected_at: now,
        oauth_scope: tokens.scope ?? null,
      },
      last_error: availableProperties.length
        ? null
        : "Google connected successfully, but no accessible GA4 properties were returned.",
      created_by: user.id,
      updated_at: now,
    };

    let sourceId: string;
    if (currentSource?.id) {
      const { data, error } = await admin
        .from("analytics_data_sources")
        .update(sourcePayload)
        .eq("id", String(currentSource.id))
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      sourceId = String(data.id);
    } else {
      const { data, error } = await admin
        .from("analytics_data_sources")
        .insert(sourcePayload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      sourceId = String(data.id);
    }

    const { data: existingCredential, error: credentialReadError } = await admin
      .from("analytics_oauth_credentials")
      .select("refresh_token_encrypted")
      .eq("source_id", sourceId)
      .eq("provider", "ga4")
      .maybeSingle();

    if (credentialReadError) throw new Error(credentialReadError.message);

    const expiresAt = new Date(
      Date.now() + (tokens.expires_in ?? 3600) * 1000,
    ).toISOString();
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptAnalyticsSecret(tokens.refresh_token)
      : existingCredential?.refresh_token_encrypted ?? null;

    const { error: credentialError } = await admin
      .from("analytics_oauth_credentials")
      .upsert(
        {
          account_id: statePayload.accountId,
          source_id: sourceId,
          provider: "ga4",
          access_token_encrypted: encryptAnalyticsSecret(tokens.access_token),
          refresh_token_encrypted: encryptedRefreshToken,
          token_type: tokens.token_type ?? "Bearer",
          scope: tokens.scope ?? null,
          expires_at: expiresAt,
          created_by: user.id,
          updated_at: now,
        },
        { onConflict: "source_id,provider" },
      );

    if (credentialError) throw new Error(credentialError.message);

    const response = NextResponse.redirect(
      analyticsRedirect(
        request,
        "ga4_connected",
        availableProperties.length
          ? "true"
          : "no-properties",
      ),
    );
    response.cookies.set("mvip_ga4_oauth_state", "", {
      httpOnly: true,
      secure: requestUrl.protocol === "https:",
      sameSite: "lax",
      maxAge: 0,
      path: "/api/analytics/ga4",
    });
    return response;
  } catch (error) {
    const response = NextResponse.redirect(
      analyticsRedirect(
        request,
        "ga4_error",
        error instanceof Error ? error.message : "Google Analytics connection failed.",
      ),
    );
    response.cookies.set("mvip_ga4_oauth_state", "", {
      httpOnly: true,
      secure: requestUrl.protocol === "https:",
      sameSite: "lax",
      maxAge: 0,
      path: "/api/analytics/ga4",
    });
    return response;
  }
}
