import { getAccountAccessForUser } from "@/lib/accounts/account-context";

type SupabaseLike = {
  from: (table: string) => any;
};

export type AssetAccessResult = {
  asset: Record<string, any> | null;
  accountId: string | null;
  canView: boolean;
  canManage: boolean;
};

export async function getAssetAccessForUser({
  supabase,
  assetId,
  userId,
}: {
  supabase: SupabaseLike;
  assetId: string;
  userId: string;
}): Promise<AssetAccessResult> {
  const { data: asset } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("id", assetId)
    .maybeSingle();

  const assetRow = asset as Record<string, any> | null;

  if (!assetRow) {
    return { asset: null, accountId: null, canView: false, canManage: false };
  }

  const accountId = assetRow.account_id ? String(assetRow.account_id) : null;

  if (accountId) {
    const accountAccess = await getAccountAccessForUser({ supabase, accountId, userId });

    return {
      asset: assetRow,
      accountId,
      canView: accountAccess.canView,
      canManage: accountAccess.canManage,
    };
  }

  const legacyUserCanAccess = String(assetRow.user_id ?? "") === userId;

  return {
    asset: assetRow,
    accountId: null,
    canView: legacyUserCanAccess,
    canManage: legacyUserCanAccess,
  };
}

export function scopeAssetQueryForAccess({
  query,
  asset,
  accountId,
  userId,
}: {
  query: any;
  asset: Record<string, any>;
  accountId: string | null;
  userId: string;
}) {
  const scoped = query.eq("id", asset.id);
  return accountId ? scoped.eq("account_id", accountId) : scoped.eq("user_id", userId);
}

export function scopeRelatedAssetQueryForAccess({
  query,
  accountId,
  userId,
}: {
  query: any;
  accountId: string | null;
  userId: string;
}) {
  return accountId ? query.eq("account_id", accountId) : query.eq("user_id", userId);
}
