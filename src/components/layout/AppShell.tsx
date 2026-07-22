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
      <main className="min-h-screen w-full px-3 pb-12 pt-4 sm:px-5 lg:ml-[276px] lg:w-[calc(100%-276px)] lg:px-6">
        <div className="mx-auto w-full max-w-[1540px]">{children}</div>
      </main>
    </div>
  );
}
