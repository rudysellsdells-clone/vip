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
