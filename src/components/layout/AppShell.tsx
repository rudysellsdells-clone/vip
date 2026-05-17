import { SidebarNav } from "@/components/layout/SidebarNav";

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#e0f2fe,transparent_28%),linear-gradient(180deg,#f8fafc,#eef2f7)]">
      <SidebarNav userEmail={userEmail} />

      <div className="lg:pl-72">
        <div className="min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
