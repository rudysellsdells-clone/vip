export const GOOGLE_ANALYTICS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/analytics.readonly";

export type GoogleOAuthTokens = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export type GoogleAnalyticsPropertySummary = {
  accountResourceName: string;
  accountId: string;
  accountDisplayName: string;
  propertyResourceName: string;
  propertyId: string;
  propertyDisplayName: string;
  propertyType: string | null;
  canEdit: boolean;
};

export type Ga4ReportResponse = {
  dimensionHeaders?: Array<{ name?: string }>;
  metricHeaders?: Array<{ name?: string; type?: string }>;
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
  rowCount?: number;
};

type GoogleApiErrorPayload = {
  error?: {
    message?: string;
    status?: string;
  };
  error_description?: string;
};

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

export function getGoogleAnalyticsOAuthConfig() {
  return {
    clientId: requiredEnvironmentValue("GOOGLE_ANALYTICS_CLIENT_ID"),
    clientSecret: requiredEnvironmentValue("GOOGLE_ANALYTICS_CLIENT_SECRET"),
    redirectUri: requiredEnvironmentValue("GOOGLE_ANALYTICS_REDIRECT_URI"),
  };
}

export function googleAnalyticsOAuthIsConfigured() {
  return Boolean(
    process.env.GOOGLE_ANALYTICS_CLIENT_ID?.trim() &&
      process.env.GOOGLE_ANALYTICS_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_ANALYTICS_REDIRECT_URI?.trim() &&
      process.env.ANALYTICS_ENCRYPTION_KEY?.trim(),
  );
}

export function buildGoogleAnalyticsAuthorizationUrl(state: string) {
  const config = getGoogleAnalyticsOAuthConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_ANALYTICS_READONLY_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

async function responseError(response: Response, fallback: string) {
  let payload: GoogleApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as GoogleApiErrorPayload;
  } catch {
    payload = null;
  }

  return new Error(
    payload?.error?.message || payload?.error_description || fallback,
  );
}

export async function exchangeGoogleAuthorizationCode(code: string) {
  const config = getGoogleAnalyticsOAuthConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw await responseError(
      response,
      "Google did not exchange the analytics authorization code.",
    );
  }

  return (await response.json()) as GoogleOAuthTokens;
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const config = getGoogleAnalyticsOAuthConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw await responseError(
      response,
      "Google did not refresh the analytics access token.",
    );
  }

  return (await response.json()) as GoogleOAuthTokens;
}

export async function listGoogleAnalyticsProperties(accessToken: string) {
  const properties: GoogleAnalyticsPropertySummary[] = [];
  let pageToken = "";

  do {
    const url = new URL(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    );
    url.searchParams.set("pageSize", "200");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw await responseError(
        response,
        "Google Analytics account summaries could not be loaded.",
      );
    }

    const payload = (await response.json()) as {
      accountSummaries?: Array<{
        account?: string;
        displayName?: string;
        propertySummaries?: Array<{
          property?: string;
          displayName?: string;
          propertyType?: string;
          canEdit?: boolean;
        }>;
      }>;
      nextPageToken?: string;
    };

    for (const account of payload.accountSummaries ?? []) {
      const accountResourceName = account.account ?? "";
      const accountId = accountResourceName.replace(/^accounts\//, "");

      for (const property of account.propertySummaries ?? []) {
        const propertyResourceName = property.property ?? "";
        const propertyId = propertyResourceName.replace(/^properties\//, "");
        if (!propertyId) continue;

        properties.push({
          accountResourceName,
          accountId,
          accountDisplayName: account.displayName ?? "Google Analytics account",
          propertyResourceName,
          propertyId,
          propertyDisplayName:
            property.displayName ?? `GA4 property ${propertyId}`,
          propertyType: property.propertyType ?? null,
          canEdit: Boolean(property.canEdit),
        });
      }
    }

    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return properties.sort((a, b) =>
    `${a.accountDisplayName} ${a.propertyDisplayName}`.localeCompare(
      `${b.accountDisplayName} ${b.propertyDisplayName}`,
    ),
  );
}

export async function runGoogleAnalyticsReport({
  accessToken,
  propertyId,
  startDate,
  endDate,
}: {
  accessToken: string;
  propertyId: string;
  startDate: string;
  endDate: string;
}) {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
      propertyId,
    )}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: "date" },
          { name: "sessionDefaultChannelGroup" },
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "sessionManualCampaignName" },
          { name: "sessionManualAdContent" },
          { name: "sessionManualTerm" },
        ],
        metrics: [
          { name: "totalUsers" },
          { name: "sessions" },
          { name: "engagedSessions" },
          { name: "screenPageViews" },
          { name: "keyEvents" },
          { name: "totalRevenue" },
        ],
        limit: "100000",
        keepEmptyRows: false,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw await responseError(
      response,
      "Google Analytics reporting data could not be loaded.",
    );
  }

  return (await response.json()) as Ga4ReportResponse;
}
