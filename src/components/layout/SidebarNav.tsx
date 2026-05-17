"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavGroup = {
  label: string;
  items: Array<{ label: string; href: string }>;
};

const navGroups: NavGroup[] = [
  {
    label: "Command",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Actions", href: "/actions" },
    ],
  },
  {
    label: "Campaign Workflow",
    items: [
      { label: "Campaigns", href: "/campaigns" },
      { label: "Approvals", href: "/approvals" },
      { label: "GalaxyAI", href: "/galaxyai" },
      { label: "Zapier", href: "/zapier" },
    ],
  },
  {
    label: "Revenue",
    items: [
      { label: "Prospects", href: "/prospects" },
      { label: "Opportunities", href: "/opportunities" },
    ],
  },
  {
    label: "Memory",
    items: [
      { label: "Brand Voice", href: "/brand-voice" },
      { label: "Knowledge", href: "/knowledge" },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-7">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            {group.label}
          </p>

          <div className="mt-2 space-y-1">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={[
                    "flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-bold transition",
                    active
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
                  {active ? <span className="h-2 w-2 rounded-full bg-sky-300" /> : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function SidebarNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white/95 backdrop-blur lg:flex lg:flex-col">
        <div className="border-b border-slate-200 p-5">
          <Link href="/dashboard" className="block">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-gradient-to-br from-slate-950 to-sky-900 text-sm font-black text-white shadow-sm">
                VIP
              </div>
              <div>
                <p className="font-black tracking-tight text-slate-950">Rudy&apos;s VIP</p>
                <p className="text-xs font-medium text-slate-500">Marketing Twin OS</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4 vip-subtle-scrollbar">
          <NavContent pathname={pathname} />
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="vip-gradient-dark rounded-3xl p-4 text-white shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-200">
              Signed in
            </p>
            <p className="mt-1 truncate text-sm font-bold">{userEmail}</p>
            <p className="mt-3 text-xs leading-5 text-slate-300">
              Generate, approve, execute, and track revenue workflows.
            </p>
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-xs font-black text-white">
              VIP
            </div>
            <div>
              <p className="text-sm font-black text-slate-950">Rudy&apos;s VIP</p>
              <p className="text-xs text-slate-500">Marketing Twin OS</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800"
          >
            Menu
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-slate-200 bg-white p-4 shadow-sm">
            <NavContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
        ) : null}
      </div>
    </>
  );
}
