import { NextResponse } from "next/server";
import {
  AnalyticsHttpError,
  assertRequestedAnalyticsAccount,
  createAnalyticsCollectionKey,
  errorMessage,
  errorStatus,
  normalizeWebsiteUrl,
  requireAnalyticsAccountManager,
  textValue,
  websiteAllowedHosts,
} from "@/lib/analytics/server";

export const runtime = "nodejs";

const DEFAULT_GOALS = [
  {
    event_name: "form_submit",
    name: "Form submission",
    goal_type: "lead",
    is_primary: false,
  },
  {
    event_name: "consultation_scheduled",
    name: "Consultation scheduled",
    goal_type: "conversion",
    is_primary: true,
  },
  {
    event_name: "purchase",
    name: "Purchase",
    goal_type: "revenue",
    is_primary: false,
  },
];

export async function POST(request: Request) {
  try {
    const { admin, user, accountId } = await requireAnalyticsAccountManager();
    const body = (await request.json()) as Record<string, unknown>;
    assertRequestedAnalyticsAccount(body.accountId, accountId);
    const websiteUrl = normalizeWebsiteUrl(body.websiteUrl);
    const requestedName = textValue(body.name, 120) || "Marketing VIP Native";
    const rotateKey = body.rotateKey === true;

    const { data: currentData, error: currentError } = await admin
      .from("analytics_data_sources")
      .select("id,collection_key,settings")
      .eq("account_id", accountId)
      .eq("source_type", "native")
      .maybeSingle();

    if (currentError) {
      throw new AnalyticsHttpError(currentError.message);
    }

    const current = currentData as
      | { id: string; collection_key: string | null; settings: unknown }
      | null;
    const collectionKey =
      !current?.collection_key || rotateKey
        ? createAnalyticsCollectionKey()
        : current.collection_key;
    const settings =
      current?.settings && typeof current.settings === "object"
        ? (current.settings as Record<string, unknown>)
        : {};
    const now = new Date().toISOString();

    const sourcePayload = {
      account_id: accountId,
      source_type: "native",
      status: "active",
      name: requestedName,
      website_url: websiteUrl,
      collection_key: collectionKey,
      key_rotated_at:
        rotateKey || !current?.collection_key ? now : undefined,
      settings: {
        ...settings,
        allowed_hosts: websiteAllowedHosts(websiteUrl),
        collector_version: "h1.7b",
        respect_global_privacy_control: true,
      },
      last_error: null,
      created_by: user.id,
      updated_at: now,
    };

    let source: Record<string, unknown>;

    if (current) {
      const { data, error } = await admin
        .from("analytics_data_sources")
        .update(sourcePayload)
        .eq("id", current.id)
        .select("id,status,name,website_url,collection_key,key_rotated_at,settings")
        .single();
      if (error) throw new AnalyticsHttpError(error.message);
      source = data as Record<string, unknown>;
    } else {
      const { data, error } = await admin
        .from("analytics_data_sources")
        .insert(sourcePayload)
        .select("id,status,name,website_url,collection_key,key_rotated_at,settings")
        .single();
      if (error) throw new AnalyticsHttpError(error.message);
      source = data as Record<string, unknown>;
    }

    const goals = DEFAULT_GOALS.map((goal) => ({
      account_id: accountId,
      ...goal,
      is_active: true,
      currency_code: "USD",
      created_by: user.id,
      updated_at: now,
    }));

    const { error: goalsError } = await admin
      .from("analytics_goals")
      .upsert(goals, { onConflict: "account_id,event_name" });

    if (goalsError) {
      throw new AnalyticsHttpError(goalsError.message);
    }

    const trackerOrigin = new URL(request.url).origin;
    const snippet = `<script async src="${trackerOrigin}/api/analytics/tracker.js?key=${collectionKey}"></script>`;

    return NextResponse.json({ source, snippet });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Native analytics setup failed.") },
      { status: errorStatus(error) },
    );
  }
}
