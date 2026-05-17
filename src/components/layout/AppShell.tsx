import { SidebarNav } from "@/components/layout/SidebarNav";

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  return (
    <div className="min-h-screen bg-[#f6f9fc]">
      <SidebarNav userEmail={userEmail} />
      <div className="min-h-screen lg:pl-72">
        {children}
      </div>
    </div>
  );
}
