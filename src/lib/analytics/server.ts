import { randomBytes } from "node:crypto";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export class AnalyticsHttpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AnalyticsHttpError";
    this.status = status;
  }
}

export function textValue(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function optionalUuid(value: unknown) {
  const text = textValue(value, 64);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    text,
  )
    ? text
    : null;
}

export function normalizeWebsiteUrl(value: unknown) {
  const text = textValue(value, 2048);
  if (!text) {
    throw new AnalyticsHttpError("Website URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(text.includes("://") ? text : `https://${text}`);
  } catch {
    throw new AnalyticsHttpError("Enter a valid website URL.");
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AnalyticsHttpError("Website URL must use HTTP or HTTPS.");
  }

  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

export function websiteAllowedHosts(websiteUrl: string) {
  const hostname = new URL(websiteUrl).hostname.toLowerCase();
  const hosts = new Set([hostname]);

  if (hostname.startsWith("www.")) {
    hosts.add(hostname.slice(4));
  } else {
    hosts.add(`www.${hostname}`);
  }

  return Array.from(hosts);
}

export function createAnalyticsCollectionKey() {
  return `vip_${randomBytes(24).toString("base64url")}`;
}

export async function requireAnalyticsAccountManager() {
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AnalyticsHttpError("Unauthorized", 401);
  }

  const accountContext = await getUserAccountContext({
    supabase,
    userId: user.id,
  });

  if (!accountContext.activeAccountId) {
    throw new AnalyticsHttpError("Select an active account first.", 400);
  }

  if (!accountContext.canManageActiveAccount) {
    throw new AnalyticsHttpError(
      "Only an account owner or administrator can change analytics connections.",
      403,
    );
  }

  return {
    supabase,
    admin: untypedSupabase(createAdminClient()),
    user,
    accountContext,
    accountId: accountContext.activeAccountId,
  };
}


export function assertRequestedAnalyticsAccount(
  requestedAccountId: unknown,
  activeAccountId: string,
) {
  const requested = optionalUuid(requestedAccountId);

  if (!requested) {
    throw new AnalyticsHttpError(
      "The analytics request did not identify the active Marketing VIP account.",
      400,
    );
  }

  if (requested !== activeAccountId) {
    throw new AnalyticsHttpError(
      "The active Marketing VIP account changed before this analytics action completed. Refresh the page and try again.",
      409,
    );
  }

  return requested;
}

export function errorStatus(error: unknown) {
  return error instanceof AnalyticsHttpError ? error.status : 500;
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
