import { SidebarNav } from "@/components/layout/SidebarNav";

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <SidebarNav userEmail={userEmail} />

      <div className="lg:pl-72">
        <div className="min-h-screen">{children}</div>
      </div>
    </div>
  );
}
