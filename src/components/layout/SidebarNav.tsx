"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./SidebarNav.module.css";

type NavGroup = {
  label: string;
  items: Array<{ label: string; href: string }>;
};

const navGroups: NavGroup[] = [
  {
    label: "Start Here",
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

function Logo() {
  return (
    <Link href="/dashboard" className={styles.logoLink}>
      <span className={styles.logoMark}>VIP</span>
      <span>
        <p className={styles.logoTitle}>Rudy&apos;s VIP</p>
        <p className={styles.logoSub}>Web Search Pros OS</p>
      </span>
    </Link>
  );
}

function NavContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {navGroups.map((group) => (
        <section key={group.label}>
          <p className={styles.groupLabel}>{group.label}</p>
          <div className={styles.itemList}>
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={[
                    styles.navItem,
                    active ? styles.navItemActive : "",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  <span>{item.label}</span>
                  {active ? <span className={styles.activeDot} /> : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function SidebarNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Logo />
        </div>

        <div className={styles.sidebarBody}>
          <NavContent pathname={pathname} />
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.accountCard}>
            <p className={styles.accountLabel}>Signed in</p>
            <p className={styles.accountEmail}>{userEmail}</p>
            <p className={styles.accountHelp}>
              Build campaigns, approve assets, execute safely, and track revenue.
            </p>
          </div>
        </div>
      </aside>

      <div className={styles.mobileBar}>
        <div className={styles.mobileInner}>
          <Logo />
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
          >
            Menu
          </button>
        </div>

        {mobileOpen ? (
          <div className={styles.mobilePanel}>
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
