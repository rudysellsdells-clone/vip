import { NextResponse } from "next/server";
import { createAnalyticsOAuthState } from "@/lib/analytics/crypto";
import { buildGoogleAnalyticsAuthorizationUrl } from "@/lib/analytics/google";
import {
  errorMessage,
  errorStatus,
  requireAnalyticsAccountManager,
} from "@/lib/analytics/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user, accountId } = await requireAnalyticsAccountManager();
    const state = createAnalyticsOAuthState({
      accountId,
      userId: user.id,
      returnTo: "/analytics",
    });
    const authorizationUrl = buildGoogleAnalyticsAuthorizationUrl(state);
    const response = NextResponse.redirect(authorizationUrl);

    response.cookies.set("mvip_ga4_oauth_state", state, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
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
    return NextResponse.redirect(url, { status: errorStatus(error) === 401 ? 307 : 302 });
  }
}
