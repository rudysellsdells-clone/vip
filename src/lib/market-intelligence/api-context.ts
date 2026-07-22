import "server-only";

import { getActiveWorkspaceForUser } from "@/lib/accounts/active-workspace";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { isMarketIntelligenceEnabled } from "./feature";

export class MarketIntelligenceApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MarketIntelligenceApiError";
    this.status = status;
  }
}

export async function requireMarketIntelligenceApiContext() {
  if (!isMarketIntelligenceEnabled()) {
    throw new MarketIntelligenceApiError("Market Intelligence is not enabled.", 404);
  }

  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new MarketIntelligenceApiError("Unauthorized", 401);
  }

  const workspace = await getActiveWorkspaceForUser({
    supabase,
    userId: user.id,
  });

  if (!workspace) {
    throw new MarketIntelligenceApiError("Select an active workspace first.", 400);
  }

  if (!workspace.canManageActiveAccount) {
    throw new MarketIntelligenceApiError(
      "Only account owners and admins can manage market intelligence.",
      403,
    );
  }

  return {
    supabase,
    user,
    accountId: workspace.activeAccountId,
    accountName: workspace.activeAccountName,
  };
}
