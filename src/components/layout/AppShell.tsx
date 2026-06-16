import { SidebarNav } from "@/components/layout/SidebarNav";
import type { AccountContextAccount } from "@/lib/accounts/account-context";

export function AppShell({
  children,
  userEmail,
  accounts,
  activeAccountId,
  activeAccountName,
  activeAccountRole,
  canManageActiveAccount,
  platformRole,
  isMaster,
}: {
  children: React.ReactNode;
  userEmail: string;
  accounts: AccountContextAccount[];
  activeAccountId: string | null;
  activeAccountName: string | null;
  activeAccountRole: string | null;
  canManageActiveAccount: boolean;
  platformRole: string;
  isMaster: boolean;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(11,74,122,0.07),transparent_32rem),linear-gradient(180deg,#f8fbff,#eef4f8)]">
      <SidebarNav
        userEmail={userEmail}
        accounts={accounts}
        activeAccountId={activeAccountId}
        activeAccountName={activeAccountName}
        activeAccountRole={activeAccountRole}
        canManageActiveAccount={canManageActiveAccount}
        platformRole={platformRole}
        isMaster={isMaster}
      />
      <main className="mx-auto min-h-screen w-full max-w-[1540px] px-3 pb-12 pt-4 sm:px-5 lg:px-6">
        {children}
      </main>
    </div>
  );
}
