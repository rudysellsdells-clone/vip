"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
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
    label: "Revenue Pipeline",
    items: [
      { label: "Prospects", href: "/prospects" },
      { label: "Opportunities", href: "/opportunities" },
    ],
  },
  {
    label: "Business Memory",
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
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-200 p-5">
          <Link href="/dashboard" className="block">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-lg font-black text-white">
                VIP
              </div>
              <div>
                <p className="font-bold text-slate-950">Rudy&apos;s VIP</p>
                <p className="text-xs text-slate-500">Marketing Twin</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <NavContent pathname={pathname} />
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Signed in
            </p>
            <p className="mt-1 truncate text-sm font-medium text-slate-900">
              {userEmail}
            </p>
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">
              VIP
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">Rudy&apos;s VIP</p>
              <p className="text-xs text-slate-500">Marketing Twin</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800"
            aria-label="Toggle navigation"
          >
            Menu
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-slate-200 bg-white p-4 shadow-sm">
            <NavContent
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
