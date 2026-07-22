import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export const requireStrategyWorkspace = cache(async () => {
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const accountContext = await getUserAccountContext({
    supabase,
    userId: user.id,
  });

  if (!accountContext.activeAccountId) redirect("/accounts");

  return {
    supabase,
    user,
    accountId: accountContext.activeAccountId,
    accountName: accountContext.activeAccountName ?? "Active workspace",
    canManage: accountContext.canManageActiveAccount,
    isMaster: accountContext.isMaster,
  };
});
