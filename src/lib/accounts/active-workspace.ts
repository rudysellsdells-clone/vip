import { getUserAccountContext } from "@/lib/accounts/account-context";

export type ActiveWorkspaceContext = Awaited<ReturnType<typeof getUserAccountContext>> & {
  activeAccountId: string;
  activeAccountName: string;
};

type SupabaseLike = {
  from: (table: string) => any;
};

export async function getActiveWorkspaceForUser({
  supabase,
  userId,
}: {
  supabase: SupabaseLike;
  userId: string;
}): Promise<ActiveWorkspaceContext | null> {
  const context = await getUserAccountContext({ supabase, userId });

  if (!context.activeAccountId || !context.activeAccountName) {
    return null;
  }

  return {
    ...context,
    activeAccountId: context.activeAccountId,
    activeAccountName: context.activeAccountName,
  };
}

export function activeWorkspaceRequiredMessage() {
  return "Select an active workspace before using this feature.";
}

export function activeWorkspaceManageRequiredMessage() {
  return "You do not have permission to manage this workspace.";
}
