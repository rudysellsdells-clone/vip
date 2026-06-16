import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });

  return (
    <AppShell
      userEmail={user.email ?? "Rudy"}
      accounts={accountContext.accounts}
      activeAccountId={accountContext.activeAccountId}
      activeAccountName={accountContext.activeAccountName}
      activeAccountRole={accountContext.activeAccountRole}
      canManageActiveAccount={accountContext.canManageActiveAccount}
      platformRole={accountContext.platformRole}
      isMaster={accountContext.isMaster}
    >
      {children}
    </AppShell>
  );
}
