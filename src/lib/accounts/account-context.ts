import { createAdminClient } from "@/lib/supabase/admin";
import { untypedSupabase } from "@/lib/supabase/untyped";

export type AccountContextAccount = {
  id: string;
  name: string;
  slug: string;
  role: string;
  status: string;
  websiteUrl: string | null;
  primaryCta: string | null;
};

export type AccountContext = {
  accounts: AccountContextAccount[];
  activeAccountId: string | null;
  activeAccountName: string | null;
  activeAccountSlug: string | null;
};

type SupabaseLike = {
  from: (table: string) => any;
};

function normalizeAccountRows(rows: unknown[], ownedAccountIds: Set<string>) {
  return rows
    .map((row) => {
      const account = row as Record<string, any>;
      return {
        id: String(account.id),
        name: String(account.name ?? "Untitled Account"),
        slug: String(account.slug ?? ""),
        role: ownedAccountIds.has(String(account.id)) ? "owner" : String(account.role ?? "member"),
        status: String(account.status ?? "active"),
        websiteUrl: account.website_url ? String(account.website_url) : null,
        primaryCta: account.primary_cta ? String(account.primary_cta) : null,
      };
    })
    .filter((account) => account.status !== "archived");
}

export async function getUserAccountContext({
  supabase,
  userId,
}: {
  supabase: SupabaseLike;
  userId: string;
}): Promise<AccountContext> {
  const [{ data: profile }, { data: ownedAccounts }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,default_account_id,last_active_account_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("id,name,slug,status,website_url,primary_cta,owner_user_id")
      .eq("owner_user_id", userId)
      .neq("status", "archived")
      .order("created_at", { ascending: true }),
    supabase
      .from("account_memberships")
      .select("role,status,removed_at,accounts(id,name,slug,status,website_url,primary_cta)")
      .eq("user_id", userId)
      .eq("status", "active")
      .is("removed_at", null),
  ]);

  const ownedRows = (ownedAccounts ?? []) as Record<string, any>[];
  const ownedAccountIds = new Set(ownedRows.map((account) => String(account.id)));
  const normalizedOwned = normalizeAccountRows(ownedRows, ownedAccountIds);

  const membershipRows = ((memberships ?? []) as Record<string, any>[])
    .map((membership) => {
      const account = membership.accounts as Record<string, any> | null;
      if (!account) return null;
      return {
        ...account,
        role: String(membership.role ?? "member"),
      };
    })
    .filter(Boolean) as Record<string, any>[];

  const normalizedMemberships = normalizeAccountRows(membershipRows, ownedAccountIds);
  const accountMap = new Map<string, AccountContextAccount>();

  [...normalizedOwned, ...normalizedMemberships].forEach((account) => {
    accountMap.set(account.id, account);
  });

  const accounts = Array.from(accountMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const profileRow = profile as Record<string, any> | null;
  const preferredAccountId =
    (profileRow?.last_active_account_id as string | null | undefined) ??
    (profileRow?.default_account_id as string | null | undefined) ??
    null;

  const activeAccount =
    accounts.find((account) => account.id === preferredAccountId) ??
    accounts[0] ??
    null;

  return {
    accounts,
    activeAccountId: activeAccount?.id ?? null,
    activeAccountName: activeAccount?.name ?? null,
    activeAccountSlug: activeAccount?.slug ?? null,
  };
}

export async function setActiveAccountForUser({
  accountId,
  userId,
}: {
  accountId: string;
  userId: string;
}) {
  const admin = untypedSupabase(createAdminClient());

  const { error } = await admin
    .from("profiles")
    .update({
      last_active_account_id: accountId,
      default_account_id: accountId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
