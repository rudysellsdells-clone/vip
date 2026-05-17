"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { productConfig } from "@/lib/config/product";
import styles from "./SidebarNav.module.css";

type NavGroup = {
  label: string;
  items: Array<{ label: string; href: string }>;
};

const navGroups: NavGroup[] = [
  {
    label: "Start",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Campaigns", href: "/campaigns" },
      { label: "Approvals", href: "/approvals" },
    ],
  },
  {
    label: "Execution",
    items: [
      { label: "Actions", href: "/actions" },
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
      { label: "Settings", href: "/settings" },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return (
    <Link href="/dashboard" className={styles.logoLink}>
      <span className={styles.logoMark}>VIP</span>
      <span>
        <p className={styles.logoTitle}>{productConfig.appName}</p>
        <p className={styles.logoSub}>{productConfig.brandName}</p>
      </span>
    </Link>
  );
}

export function SidebarNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allItems = navGroups.flatMap((group) => group.items);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.topRow}>
          <Logo />

          <nav className={styles.desktopNav} aria-label="Main navigation">
            {allItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    styles.navItem,
                    active ? styles.navItemActive : "",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className={styles.account}>
            <p className={styles.accountLabel}>Signed in</p>
            <p className={styles.accountEmail}>{userEmail}</p>
          </div>

          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
          >
            Menu
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className={styles.mobilePanel}>
          <div className={styles.mobileGroups}>
            {navGroups.map((group) => (
              <section key={group.label}>
                <p className={styles.mobileGroupLabel}>{group.label}</p>
                <div className={styles.mobileLinks}>
                  {group.items.map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={[
                          styles.mobileLink,
                          active ? styles.mobileLinkActive : "",
                        ].join(" ")}
                        aria-current={active ? "page" : undefined}
                      >
                        <span>{item.label}</span>
                        <span>→</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
