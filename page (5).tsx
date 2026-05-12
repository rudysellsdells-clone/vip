import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/approvals", label: "Approvals" },
  { href: "/brand-voice", label: "Brand Voice" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/galaxyai", label: "GalaxyAI" },
  { href: "/settings", label: "Settings" }
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-white p-6 md:block">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Rudys VIP</p>
          <h1 className="mt-2 text-xl font-bold">Marketing Twin</h1>
        </div>
        <nav className="mt-8 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-sm font-semibold">Sprint 1</p>
          <p className="mt-1 text-xs text-slate-300">App foundation and first saved campaign.</p>
        </div>
      </aside>
      <div className="md:pl-64">{children}</div>
    </div>
  );
}
