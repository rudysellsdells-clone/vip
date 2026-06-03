import { createAdminClient } from "@/lib/supabase/admin";
import { untypedSupabase } from "@/lib/supabase/untyped";

export type AccountRole = "owner" | "admin" | "editor" | "reviewer" | "viewer";

export const ACCOUNT_ROLES: AccountRole[] = ["owner", "admin", "editor", "reviewer", "viewer"];

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function textValue(value: unknown) {
  return String(value ?? "").trim();
}

export function nullableTextValue(value: unknown) {
  const text = textValue(value);
  return text || null;
}

export function slugifyAccountName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const safeBase = base || "account";
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? String(Date.now()).slice(-8);

  return `${safeBase}-${suffix}`;
}

export function isAccountRole(value: unknown): value is AccountRole {
  return ACCOUNT_ROLES.includes(value as AccountRole);
}

export function getAccountWriteClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return untypedSupabase(createAdminClient());
}

export async function userCanManageAccount({
  supabase,
  accountId,
  userId,
}: {
  supabase: any;
  accountId: string;
  userId: string;
}) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,platform_role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.platform_role === "owner" || profile?.platform_role === "admin") {
    return true;
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id,owner_user_id,status")
    .eq("id", accountId)
    .maybeSingle();

  if (accountError || !account || account.status === "archived") {
    return false;
  }

  if (account.owner_user_id === userId) {
    return true;
  }

  const { data: membership } = await supabase
    .from("account_memberships")
    .select("id")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .eq("status", "active")
    .is("removed_at", null)
    .limit(1)
    .maybeSingle();

  return Boolean(membership?.id);
}

export async function userCanViewAccount({
  supabase,
  accountId,
  userId,
}: {
  supabase: any;
  accountId: string;
  userId: string;
}) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,platform_role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.platform_role === "owner" || profile?.platform_role === "admin") {
    return true;
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id,owner_user_id,status")
    .eq("id", accountId)
    .maybeSingle();

  if (accountError || !account || account.status === "archived") {
    return false;
  }

  if (account.owner_user_id === userId) {
    return true;
  }

  const { data: membership } = await supabase
    .from("account_memberships")
    .select("id")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .eq("status", "active")
    .is("removed_at", null)
    .limit(1)
    .maybeSingle();

  return Boolean(membership?.id);
}

export async function maybeInviteUserByEmail({
  email,
  fullName,
  accountId,
  role,
}: {
  email: string;
  fullName?: string | null;
  accountId: string;
  role: AccountRole;
}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      attempted: false,
      sent: false,
      message: "SUPABASE_SERVICE_ROLE_KEY is not configured, so VIP recorded a pending membership but did not send a Supabase invite.",
    };
  }

  try {
    const admin = untypedSupabase(createAdminClient());
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName ?? undefined,
        vip_account_id: accountId,
        vip_account_role: role,
      },
    });

    if (error) {
      return {
        attempted: true,
        sent: false,
        message: error.message,
      };
    }

    return {
      attempted: true,
      sent: true,
      message: "Invite sent.",
    };
  } catch (error) {
    return {
      attempted: true,
      sent: false,
      message: error instanceof Error ? error.message : "Unable to send invite.",
    };
  }
}
