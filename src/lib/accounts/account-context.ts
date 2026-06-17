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
  activeAccountRole: string | null;
  canManageActiveAccount: boolean;
  platformRole: string;
  isMaster: boolean;
};

export type AccountAccess = {
  account: AccountContextAccount | null;
  canView: boolean;
  canManage: boolean;
  platformRole: string;
  isMaster: boolean;
};

type SupabaseLike = {
  from: (table: string) => any;
};

const MASTER_PLATFORM_ROLES = new Set([
  "master",
  "owner",
  "admin",
  "platform_owner",
  "platform_admin",
]);

const MANAGE_ACCOUNT_ROLES = new Set(["master", "owner", "admin"]);

function normalizeRole(value: unknown) {
  return String(value ?? "user").trim().toLowerCase();
}

export function isMasterPlatformRole(value: unknown) {
  return MASTER_PLATFORM_ROLES.has(normalizeRole(value));
}

export function canManageAccountRole(value: unknown) {
  return MANAGE_ACCOUNT_ROLES.has(normalizeRole(value));
}

function normalizeAccountRows(rows: unknown[], ownedAccountIds: Set<string>, forcedRole?: string) {
  return rows
    .map((row) => {
      const account = row as Record<string, any>;
      return {
        id: String(account.id),
        name: String(account.name ?? "Untitled Account"),
        slug: String(account.slug ?? ""),
        role: forcedRole ?? (ownedAccountIds.has(String(account.id)) ? "owner" : String(account.role ?? "member")),
        status: String(account.status ?? "active"),
        websiteUrl: account.website_url ? String(account.website_url) : null,
        primaryCta: account.primary_cta ? String(account.primary_cta) : null,
      };
    })
    .filter((account) => account.status !== "archived");
}

function preferredAccountIdFromProfile(profile: Record<string, any> | null) {
  return (
    (profile?.last_active_account_id as string | null | undefined) ??
    (profile?.default_account_id as string | null | undefined) ??
    null
  );
}

function buildContextResponse({
  accounts,
  profile,
  platformRole,
  isMaster,
}: {
  accounts: AccountContextAccount[];
  profile: Record<string, any> | null;
  platformRole: string;
  isMaster: boolean;
}): AccountContext {
  const preferredAccountId = preferredAccountIdFromProfile(profile);
  const activeAccount =
    accounts.find((account) => account.id === preferredAccountId) ??
    accounts[0] ??
    null;
  const activeAccountRole = activeAccount?.role ?? null;

  return {
    accounts,
    activeAccountId: activeAccount?.id ?? null,
    activeAccountName: activeAccount?.name ?? null,
    activeAccountSlug: activeAccount?.slug ?? null,
    activeAccountRole,
    canManageActiveAccount: isMaster || canManageAccountRole(activeAccountRole),
    platformRole,
    isMaster,
  };
}

export async function getUserAccountContext({
  supabase,
  userId,
}: {
  supabase: SupabaseLike;
  userId: string;
}): Promise<AccountContext> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,default_account_id,last_active_account_id,platform_role")
    .eq("id", userId)
    .maybeSingle();

  const profileRow = profile as Record<string, any> | null;
  const platformRole = normalizeRole(profileRow?.platform_role);
  const isMaster = isMasterPlatformRole(platformRole);

  if (isMaster) {
    const { data: allAccounts } = await supabase
      .from("accounts")
      .select("id,name,slug,status,website_url,primary_cta,owner_user_id")
      .neq("status", "archived")
      .order("created_at", { ascending: true });

    const accounts = normalizeAccountRows((allAccounts ?? []) as Record<string, any>[], new Set(), "master")
      .sort((a, b) => a.name.localeCompare(b.name));

    return buildContextResponse({ accounts, profile: profileRow, platformRole, isMaster });
  }

  const [{ data: ownedAccounts }, { data: memberships }] = await Promise.all([
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

  return buildContextResponse({ accounts, profile: profileRow, platformRole, isMaster });
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

export async function getAccountAccessForUser({
  supabase,
  accountId,
  userId,
}: {
  supabase: SupabaseLike;
  accountId: string | null | undefined;
  userId: string;
}): Promise<AccountAccess> {
  const safeAccountId = String(accountId ?? "").trim();

  const context = await getUserAccountContext({ supabase, userId });

  if (!safeAccountId) {
    return {
      account: null,
      canView: false,
      canManage: false,
      platformRole: context.platformRole,
      isMaster: context.isMaster,
    };
  }

  const account = context.accounts.find((item) => item.id === safeAccountId) ?? null;

  return {
    account,
    canView: Boolean(account),
    canManage: Boolean(account && (context.isMaster || canManageAccountRole(account.role))),
    platformRole: context.platformRole,
    isMaster: context.isMaster,
  };
}

export async function userCanViewAccount({
  supabase,
  accountId,
  userId,
}: {
  supabase: SupabaseLike;
  accountId: string;
  userId: string;
}) {
  const access = await getAccountAccessForUser({ supabase, accountId, userId });
  return access.canView;
}

export async function userCanManageAccount({
  supabase,
  accountId,
  userId,
}: {
  supabase: SupabaseLike;
  accountId: string;
  userId: string;
}) {
  const access = await getAccountAccessForUser({ supabase, accountId, userId });
  return access.canManage;
}
