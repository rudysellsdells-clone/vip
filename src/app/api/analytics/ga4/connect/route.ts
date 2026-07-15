import { NextResponse } from "next/server";
import { createAnalyticsOAuthState } from "@/lib/analytics/crypto";
import { buildGoogleAnalyticsAuthorizationUrl } from "@/lib/analytics/google";
import {
  AnalyticsHttpError,
  assertRequestedAnalyticsAccount,
  errorMessage,
  errorStatus,
  requireAnalyticsAccountManager,
} from "@/lib/analytics/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const replacingExistingConnection = requestUrl.searchParams.get("replace") === "1";
    const requestedAccountId = requestUrl.searchParams.get("account_id");
    const { admin, user, accountId, accountContext } =
      await requireAnalyticsAccountManager();
    assertRequestedAnalyticsAccount(requestedAccountId, accountId);

    const { data: existingSource, error: existingSourceError } = await admin
      .from("analytics_data_sources")
      .select("id,external_property_id,name,status")
      .eq("account_id", accountId)
      .eq("source_type", "ga4")
      .maybeSingle();

    if (existingSourceError) {
      throw new AnalyticsHttpError(existingSourceError.message);
    }

    if (existingSource?.external_property_id && !replacingExistingConnection) {
      throw new AnalyticsHttpError(
        `Google Analytics is already connected for ${
          accountContext.activeAccountName ?? "the active account"
        }. Use the account-scoped reconnect control to replace that authorization.`,
        409,
      );
    }

    const state = createAnalyticsOAuthState({
      accountId,
      userId: user.id,
      returnTo: "/analytics",
    });
    const authorizationUrl = buildGoogleAnalyticsAuthorizationUrl(state);
    const response = NextResponse.redirect(authorizationUrl);

    response.cookies.set("mvip_ga4_oauth_state", state, {
      httpOnly: true,
      secure: requestUrl.protocol === "https:",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/analytics/ga4",
    });

    return response;
  } catch (error) {
    const url = new URL("/analytics", request.url);
    url.searchParams.set(
      "ga4_error",
      errorMessage(error, "Google Analytics connection could not start."),
    );
    return NextResponse.redirect(url, {
      status: errorStatus(error) === 401 ? 307 : 302,
    });
  }
}
