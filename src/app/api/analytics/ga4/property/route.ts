import { NextResponse } from "next/server";
import { syncGa4AnalyticsSource } from "@/lib/analytics/ga4-sync";
import {
  AnalyticsHttpError,
  assertRequestedAnalyticsAccount,
  errorMessage,
  errorStatus,
  requireAnalyticsAccountManager,
  textValue,
} from "@/lib/analytics/server";
import type { GoogleAnalyticsPropertySummary } from "@/lib/analytics/google";

export const runtime = "nodejs";

function thirtyDayRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export async function POST(request: Request) {
  try {
    const { admin, accountId, user } = await requireAnalyticsAccountManager();
    const body = (await request.json()) as Record<string, unknown>;
    assertRequestedAnalyticsAccount(body.accountId, accountId);
    const propertyId = textValue(body.propertyId, 50).replace(/^properties\//, "");

    if (!propertyId) {
      throw new AnalyticsHttpError("Select a Google Analytics property.");
    }

    const { data: sourceData, error: sourceError } = await admin
      .from("analytics_data_sources")
      .select("id,settings")
      .eq("account_id", accountId)
      .eq("source_type", "ga4")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (sourceError) throw new AnalyticsHttpError(sourceError.message);
    if (!sourceData) {
      throw new AnalyticsHttpError("Connect Google Analytics before selecting a property.");
    }

    const settings =
      sourceData.settings && typeof sourceData.settings === "object"
        ? (sourceData.settings as Record<string, unknown>)
        : {};
    const availableProperties = Array.isArray(settings.available_properties)
      ? (settings.available_properties as GoogleAnalyticsPropertySummary[])
      : [];
    const selected = availableProperties.find(
      (property) => property.propertyId === propertyId,
    );

    if (!selected) {
      throw new AnalyticsHttpError(
        "That GA4 property was not included in the connected Google account.",
      );
    }

    const { error: updateError } = await admin
      .from("analytics_data_sources")
      .update({
        external_account_id: selected.accountId,
        external_property_id: selected.propertyId,
        name: selected.propertyDisplayName,
        status: "active",
        auto_sync_enabled: true,
        sync_frequency: "daily",
        next_sync_at: new Date().toISOString(),
        last_error: null,
        settings: {
          ...settings,
          selected_property: selected,
          property_selected_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceData.id);

    if (updateError) throw new AnalyticsHttpError(updateError.message);

    const range = thirtyDayRange();
    let sync: unknown = null;
    let syncWarning: string | null = null;

    try {
      sync = await syncGa4AnalyticsSource({
        sourceId: String(sourceData.id),
        ...range,
        triggerType: "initial",
        createdBy: user.id,
      });
    } catch (error) {
      syncWarning =
        error instanceof Error
          ? error.message
          : "The property was saved, but the initial GA4 sync failed.";
    }

    return NextResponse.json({
      selectedProperty: selected,
      sync,
      warning: syncWarning,
    });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "GA4 property selection failed.") },
      { status: errorStatus(error) },
    );
  }
}
