import { NextResponse } from "next/server";
import {
  AnalyticsHttpError,
  assertRequestedAnalyticsAccount,
  errorMessage,
  errorStatus,
  requireAnalyticsAccountManager,
} from "@/lib/analytics/server";

export const runtime = "nodejs";

function recordValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function DELETE(request: Request) {
  try {
    const { admin, user, accountId, accountContext } =
      await requireAnalyticsAccountManager();
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    assertRequestedAnalyticsAccount(body.accountId, accountId);

    const { data: sourceData, error: sourceError } = await admin
      .from("analytics_data_sources")
      .select(
        "id,name,status,external_account_id,external_property_id,settings,last_synced_at",
      )
      .eq("account_id", accountId)
      .eq("source_type", "ga4")
      .maybeSingle();

    if (sourceError) {
      throw new AnalyticsHttpError(sourceError.message);
    }

    if (!sourceData) {
      return NextResponse.json({
        disconnected: true,
        message: "This account does not have a Google Analytics connection.",
      });
    }

    const source = sourceData as Record<string, unknown>;
    const existingSettings = recordValue(source.settings);
    const previousConnection = {
      account_id: source.external_account_id ?? null,
      property_id: source.external_property_id ?? null,
      property:
        existingSettings.selected_property &&
        typeof existingSettings.selected_property === "object"
          ? existingSettings.selected_property
          : null,
      disconnected_at: new Date().toISOString(),
      disconnected_by: user.id,
    };

    const retainedSettings = { ...existingSettings };
    delete retainedSettings.available_properties;
    delete retainedSettings.selected_property;
    delete retainedSettings.oauth_scope;
    delete retainedSettings.property_selected_at;

    const { error: credentialError } = await admin
      .from("analytics_oauth_credentials")
      .delete()
      .eq("account_id", accountId)
      .eq("source_id", String(source.id))
      .eq("provider", "ga4");

    if (credentialError) {
      throw new AnalyticsHttpError(credentialError.message);
    }

    const now = new Date().toISOString();
    const { data: disconnectedSource, error: updateError } = await admin
      .from("analytics_data_sources")
      .update({
        status: "paused",
        name: "Google Analytics 4",
        external_account_id: null,
        external_property_id: null,
        external_stream_id: null,
        auto_sync_enabled: false,
        next_sync_at: null,
        sync_cursor: {},
        last_error: null,
        settings: {
          ...retainedSettings,
          disconnected_connection: previousConnection,
        },
        updated_at: now,
      })
      .eq("id", String(source.id))
      .eq("account_id", accountId)
      .select("id,status,name,last_synced_at")
      .single();

    if (updateError) {
      throw new AnalyticsHttpError(updateError.message);
    }

    await admin.from("activity_log").insert({
      user_id: user.id,
      account_id: accountId,
      activity_type: "analytics_ga4_disconnected",
      title: "Google Analytics disconnected",
      description: `GA4 credentials were removed for ${
        accountContext.activeAccountName ?? "the active account"
      }. Cached reporting data was retained.`,
      metadata: {
        source_id: source.id,
        previous_connection: previousConnection,
        historical_metrics_retained: true,
      },
    });

    return NextResponse.json({
      disconnected: true,
      source: disconnectedSource,
      historicalMetricsRetained: true,
      message: `Google Analytics was disconnected from ${
        accountContext.activeAccountName ?? "the active account"
      }. Existing imported reporting remains available, but future synchronization is stopped.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Google Analytics disconnect failed.") },
      { status: errorStatus(error) },
    );
  }
}
