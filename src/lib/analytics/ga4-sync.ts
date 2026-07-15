import {
  decryptAnalyticsSecret,
  encryptAnalyticsSecret,
} from "@/lib/analytics/crypto";
import {
  refreshGoogleAccessToken,
  runGoogleAnalyticsReport,
} from "@/lib/analytics/google";
import { createAdminClient } from "@/lib/supabase/admin";
import { untypedSupabase } from "@/lib/supabase/untyped";

type AnalyticsSourceRow = {
  id: string;
  account_id: string;
  external_property_id: string | null;
  status: string;
};

type OAuthCredentialRow = {
  id: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
};

function numericValue(value: string | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function ga4Date(value: string | undefined) {
  const safe = String(value ?? "");
  if (!/^\d{8}$/.test(safe)) return null;
  return `${safe.slice(0, 4)}-${safe.slice(4, 6)}-${safe.slice(6, 8)}`;
}

async function getValidAccessToken(
  admin: any,
  source: AnalyticsSourceRow,
) {
  const { data, error } = await admin
    .from("analytics_oauth_credentials")
    .select(
      "id,access_token_encrypted,refresh_token_encrypted,expires_at",
    )
    .eq("source_id", source.id)
    .eq("provider", "ga4")
    .maybeSingle();

  if (error) throw new Error(error.message);
  const credential = data as OAuthCredentialRow | null;

  if (!credential) {
    throw new Error("The GA4 OAuth credential is missing. Reconnect Google Analytics.");
  }

  const expiresAt = credential.expires_at
    ? new Date(credential.expires_at).getTime()
    : 0;

  if (
    credential.access_token_encrypted &&
    expiresAt > Date.now() + 90 * 1000
  ) {
    return decryptAnalyticsSecret(credential.access_token_encrypted);
  }

  if (!credential.refresh_token_encrypted) {
    throw new Error(
      "The GA4 refresh token is missing. Reconnect Google Analytics and approve offline access.",
    );
  }

  const refreshed = await refreshGoogleAccessToken(
    decryptAnalyticsSecret(credential.refresh_token_encrypted),
  );

  const nextExpiresAt = new Date(
    Date.now() + (refreshed.expires_in ?? 3600) * 1000,
  ).toISOString();

  const { error: updateError } = await admin
    .from("analytics_oauth_credentials")
    .update({
      access_token_encrypted: encryptAnalyticsSecret(refreshed.access_token),
      token_type: refreshed.token_type ?? "Bearer",
      scope: refreshed.scope ?? null,
      expires_at: nextExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credential.id);

  if (updateError) throw new Error(updateError.message);
  return refreshed.access_token;
}

export async function syncGa4AnalyticsSource({
  sourceId,
  startDate,
  endDate,
}: {
  sourceId: string;
  startDate: string;
  endDate: string;
}) {
  const admin = untypedSupabase(createAdminClient());

  const { data: sourceData, error: sourceError } = await admin
    .from("analytics_data_sources")
    .select("id,account_id,external_property_id,status")
    .eq("id", sourceId)
    .eq("source_type", "ga4")
    .maybeSingle();

  if (sourceError) throw new Error(sourceError.message);
  const source = sourceData as AnalyticsSourceRow | null;

  if (!source) throw new Error("GA4 analytics source was not found.");
  if (!source.external_property_id) {
    throw new Error("Select a GA4 property before synchronizing data.");
  }

  try {
    const accessToken = await getValidAccessToken(admin, source);
    const report = await runGoogleAnalyticsReport({
      accessToken,
      propertyId: source.external_property_id,
      startDate,
      endDate,
    });

    const dimensionNames = (report.dimensionHeaders ?? []).map(
      (header) => header.name ?? "",
    );
    const metricNames = (report.metricHeaders ?? []).map(
      (header) => header.name ?? "",
    );

    const records = (report.rows ?? [])
      .map((row) => {
        const dimensions = new Map<string, string>();
        const metrics = new Map<string, string>();

        dimensionNames.forEach((name, index) => {
          dimensions.set(name, row.dimensionValues?.[index]?.value ?? "");
        });
        metricNames.forEach((name, index) => {
          metrics.set(name, row.metricValues?.[index]?.value ?? "0");
        });

        const metricDate = ga4Date(dimensions.get("date"));
        if (!metricDate) return null;

        const channel =
          dimensions.get("sessionDefaultChannelGroup") || "Unattributed";
        const trafficSource = dimensions.get("sessionSource") || "(direct)";
        const trafficMedium = dimensions.get("sessionMedium") || "(none)";

        return {
          account_id: source.account_id,
          source_id: source.id,
          metric_date: metricDate,
          dimension_key: [
            "ga4",
            channel,
            trafficSource,
            trafficMedium,
          ].join("|"),
          campaign_id: null,
          asset_id: null,
          channel,
          traffic_source: trafficSource,
          traffic_medium: trafficMedium,
          users_count: Math.round(numericValue(metrics.get("totalUsers"))),
          sessions_count: Math.round(numericValue(metrics.get("sessions"))),
          engaged_sessions_count: Math.round(
            numericValue(metrics.get("engagedSessions")),
          ),
          page_views_count: Math.round(
            numericValue(metrics.get("screenPageViews")),
          ),
          leads_count: 0,
          conversions_count: Math.round(numericValue(metrics.get("keyEvents"))),
          revenue: numericValue(metrics.get("totalRevenue")),
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    const { error: deleteError } = await admin
      .from("analytics_daily_metrics")
      .delete()
      .eq("source_id", source.id)
      .gte("metric_date", startDate)
      .lte("metric_date", endDate);

    if (deleteError) throw new Error(deleteError.message);

    for (let index = 0; index < records.length; index += 500) {
      const chunk = records.slice(index, index + 500);
      const { error: insertError } = await admin
        .from("analytics_daily_metrics")
        .insert(chunk);
      if (insertError) throw new Error(insertError.message);
    }

    const syncedAt = new Date().toISOString();
    const { error: sourceUpdateError } = await admin
      .from("analytics_data_sources")
      .update({
        status: "active",
        last_synced_at: syncedAt,
        last_error: null,
        sync_cursor: {
          last_start_date: startDate,
          last_end_date: endDate,
          row_count: records.length,
        },
        updated_at: syncedAt,
      })
      .eq("id", source.id);

    if (sourceUpdateError) throw new Error(sourceUpdateError.message);

    return {
      sourceId: source.id,
      propertyId: source.external_property_id,
      startDate,
      endDate,
      rows: records.length,
      syncedAt,
    };
  } catch (error) {
    await admin
      .from("analytics_data_sources")
      .update({
        status: "error",
        last_error:
          error instanceof Error ? error.message.slice(0, 1000) : "GA4 sync failed.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.id);

    throw error;
  }
}
