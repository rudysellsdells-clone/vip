import { NextResponse } from "next/server";
import {
  getAnalyticsEventDefinition,
  isAnalyticsEventName,
} from "@/lib/analytics/event-taxonomy";
import {
  optionalUuid,
  textValue,
} from "@/lib/analytics/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { untypedSupabase } from "@/lib/supabase/untyped";

export const runtime = "nodejs";


const ALLOWED_LANDING_QUERY_PARAMETERS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "vip_campaign",
  "vip_asset",
  "vip_channel",
]);

const SAFE_PROPERTY_NAMES = new Set([
  "page_title",
  "link_url",
  "link_type",
  "form_id",
  "form_name",
  "element_id",
  "element_type",
  "content_type",
  "engagement_seconds",
  "scroll_percent",
  "path",
  "tracker_version",
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Cache-Control": "no-store",
  };
}

function responseJson(
  payload: Record<string, unknown>,
  status: number,
  origin: string | null,
) {
  return NextResponse.json(payload, {
    status,
    headers: corsHeaders(origin),
  });
}

function hostnameFromHeader(value: string | null) {
  if (!value || value === "null") return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeAllowedHosts(source: Record<string, unknown>) {
  const hosts = new Set<string>();
  const websiteUrl = textValue(source.website_url, 2048);

  if (websiteUrl) {
    try {
      const host = new URL(websiteUrl).hostname.toLowerCase();
      hosts.add(host);
      hosts.add(host.startsWith("www.") ? host.slice(4) : `www.${host}`);
    } catch {
      // Ignore malformed historical website URLs.
    }
  }

  const settings =
    source.settings && typeof source.settings === "object"
      ? (source.settings as Record<string, unknown>)
      : {};
  const configuredHosts = Array.isArray(settings.allowed_hosts)
    ? settings.allowed_hosts
    : [];

  configuredHosts.forEach((host) => {
    const safeHost = textValue(host, 255).toLowerCase();
    if (safeHost) hosts.add(safeHost);
  });

  return hosts;
}

function sanitizeProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, propertyValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (!SAFE_PROPERTY_NAMES.has(key)) continue;

    if (typeof propertyValue === "string") {
      safe[key] = propertyValue.slice(0, 500);
    } else if (
      typeof propertyValue === "number" ||
      typeof propertyValue === "boolean" ||
      propertyValue === null
    ) {
      safe[key] = propertyValue;
    }
  }

  return safe;
}

function safeOccurredAt(value: unknown) {
  if (typeof value !== "string") return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();

  const now = Date.now();
  const earliest = now - 24 * 60 * 60 * 1000;
  const latest = now + 5 * 60 * 1000;

  if (parsed.getTime() < earliest || parsed.getTime() > latest) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function sanitizeLandingUrl(value: unknown) {
  const text = textValue(value, 2048);
  if (!text) return "";

  try {
    const parsed = new URL(text);
    parsed.hash = "";
    Array.from(parsed.searchParams.keys()).forEach((key) => {
      if (!ALLOWED_LANDING_QUERY_PARAMETERS.has(key)) {
        parsed.searchParams.delete(key);
      }
    });
    return parsed.toString();
  } catch {
    return "";
  }
}

function hostFromUrl(value: string) {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function deriveChannel({
  requested,
  source,
  medium,
  referrerHost,
}: {
  requested: string;
  source: string;
  medium: string;
  referrerHost: string;
}) {
  if (requested) return requested;
  const normalizedMedium = medium.toLowerCase();
  const normalizedSource = source.toLowerCase();

  if (!source && !medium && !referrerHost) return "Direct";
  if (normalizedMedium.includes("email")) return "Email";
  if (["cpc", "ppc", "paidsearch"].includes(normalizedMedium)) {
    return "Paid Search";
  }
  if (
    normalizedMedium.includes("social") ||
    ["facebook", "instagram", "linkedin", "x", "twitter", "tiktok"].some(
      (network) => normalizedSource.includes(network),
    )
  ) {
    return normalizedMedium.includes("paid") ? "Paid Social" : "Organic Social";
  }
  if (normalizedMedium === "organic") return "Organic Search";
  if (normalizedMedium === "referral" || referrerHost) return "Referral";
  return "Unattributed";
}

async function requestPayload(request: Request) {
  const raw = await request.text();
  if (!raw || raw.length > 64_000) {
    throw new Error("Analytics event payload was empty or too large.");
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  try {
    const payload = await requestPayload(request);
    const url = new URL(request.url);
    const collectionKey =
      textValue(url.searchParams.get("key"), 255) ||
      textValue(payload.key, 255);

    if (!collectionKey) {
      return responseJson({ error: "Missing analytics site key." }, 400, origin);
    }

    const admin = untypedSupabase(createAdminClient());
    const { data: sourceData, error: sourceError } = await admin
      .from("analytics_data_sources")
      .select("id,account_id,website_url,settings,status,source_type")
      .eq("collection_key", collectionKey)
      .eq("source_type", "native")
      .eq("status", "active")
      .maybeSingle();

    if (sourceError) {
      return responseJson({ error: sourceError.message }, 400, origin);
    }

    const source = sourceData as Record<string, unknown> | null;
    if (!source) {
      return responseJson({ error: "Analytics site key is invalid." }, 404, origin);
    }

    const allowedHosts = normalizeAllowedHosts(source);
    const requestHost =
      hostnameFromHeader(origin) ||
      hostnameFromHeader(request.headers.get("referer"));
    const landingUrl = sanitizeLandingUrl(payload.landingUrl);
    const landingHost = hostFromUrl(landingUrl);

    if (!requestHost || !allowedHosts.has(requestHost)) {
      return responseJson(
        { error: "This website origin is not allowed for the analytics site key." },
        403,
        origin,
      );
    }

    if (landingHost && !allowedHosts.has(landingHost)) {
      return responseJson(
        { error: "The tracked page is outside the configured website." },
        403,
        origin,
      );
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentEventCount, error: rateError } = await admin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("source_id", String(source.id))
      .gte("created_at", oneMinuteAgo);

    if (rateError) {
      return responseJson({ error: rateError.message }, 400, origin);
    }

    if ((recentEventCount ?? 0) >= 1000) {
      return responseJson(
        { error: "Analytics collection rate limit exceeded." },
        429,
        origin,
      );
    }

    const eventName = payload.eventName;
    if (!isAnalyticsEventName(eventName)) {
      return responseJson({ error: "Unsupported analytics event name." }, 400, origin);
    }

    const accountId = String(source.account_id);
    const sourceId = String(source.id);
    let campaignId = optionalUuid(payload.campaignId);
    let assetId = optionalUuid(payload.assetId);

    if (campaignId) {
      const { data } = await admin
        .from("campaigns")
        .select("id")
        .eq("id", campaignId)
        .eq("account_id", accountId)
        .maybeSingle();
      if (!data) campaignId = null;
    }

    if (assetId) {
      const { data } = await admin
        .from("generated_assets")
        .select("id")
        .eq("id", assetId)
        .eq("account_id", accountId)
        .maybeSingle();
      if (!data) assetId = null;
    }

    const trafficSource = textValue(payload.trafficSource, 255);
    const trafficMedium = textValue(payload.trafficMedium, 255);
    const referrerHost = textValue(payload.referrerHost, 255).toLowerCase();
    const channel = deriveChannel({
      requested: textValue(payload.channel, 255),
      source: trafficSource,
      medium: trafficMedium,
      referrerHost,
    });
    const definition = getAnalyticsEventDefinition(eventName);
    const safeProperties = sanitizeProperties(payload.properties);
    if (eventName === "phone_click" || eventName === "email_click") {
      delete safeProperties.link_url;
    }
    const value = definition?.acceptsValue ? Number(payload.value ?? 0) : null;
    const safeValue =
      value !== null && Number.isFinite(value) && Math.abs(value) <= 1_000_000_000
        ? value
        : null;
    const eventId = textValue(payload.eventId, 255);

    const { error: insertError } = await admin.from("analytics_events").insert({
      account_id: accountId,
      source_id: sourceId,
      event_name: eventName,
      occurred_at: safeOccurredAt(payload.occurredAt),
      visitor_id: textValue(payload.visitorId, 255) || null,
      session_id: textValue(payload.sessionId, 255) || null,
      campaign_id: campaignId,
      asset_id: assetId,
      channel,
      traffic_source: trafficSource || null,
      traffic_medium: trafficMedium || null,
      campaign_name: textValue(payload.campaignName, 255) || null,
      landing_url: landingUrl || null,
      referrer_host: referrerHost || null,
      value: safeValue,
      currency_code: safeValue !== null ? textValue(payload.currencyCode, 3) || "USD" : null,
      dedupe_key: eventId ? `${sourceId}:${eventId}` : null,
      properties: safeProperties,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return responseJson({ accepted: true, duplicate: true }, 202, origin);
      }
      return responseJson({ error: insertError.message }, 400, origin);
    }

    return responseJson({ accepted: true }, 202, origin);
  } catch (error) {
    return responseJson(
      {
        error:
          error instanceof Error
            ? error.message
            : "Analytics event could not be accepted.",
      },
      400,
      origin,
    );
  }
}
