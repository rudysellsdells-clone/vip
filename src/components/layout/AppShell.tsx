import type { ReactNode } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";

export function AppShell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string;
}) {
  return (
    <div className="vip-app-bg">
      <SidebarNav userEmail={userEmail} />
      <div className="vip-main lg:pl-72">
        {children}
      </div>
    </div>
  );
}
