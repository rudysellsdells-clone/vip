"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { productConfig } from "@/lib/config/product";
import styles from "./SidebarNav.module.css";

type NavItem = {
  label: string;
  href: string;
  description?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Command",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        description: "Overview, status, and next actions.",
      },
      {
        label: "Phase Two",
        href: "/phase-two",
        description: "Authority, prospecting, repurposing, and execution hub.",
      },
      {
        label: "Reporting",
        href: "/phase-two-reporting",
        description: "Proof of work for planning, assets, drafts, and execution.",
      },
      {
        label: "Content Calendar",
        href: "/content-calendar",
        description: "Monthly strategy, weekly campaigns, and planned assets.",
      },
      {
        label: "Ready Queue",
        href: "/ready-for-publishing",
        description: "Assets that passed quality gates and are ready for next steps.",
      },
      {
        label: "Publishing Ready",
        href: "/publishing-ready",
        description: "Execute approved assets and track runs.",
      },
      {
        label: "Campaigns",
        href: "/campaigns",
        description: "Create and manage campaign asset packs.",
      },
      {
        label: "Approvals",
        href: "/approvals",
        description: "Review, revise, and approve assets.",
      },
      {
        label: "Actions",
        href: "/actions",
        description: "Execute approved external actions.",
      },
      {
        label: "Archive",
        href: "/archive",
        description: "Review archived campaigns and assets.",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Authority Content",
        href: "/authority-content",
        description: "Create blogs, white papers, and authority assets.",
      },
      {
        label: "Repurposing",
        href: "/content-repurposing",
        description: "Turn source assets into channel-ready content.",
      },
      {
        label: "Content Quality",
        href: "/content-quality",
        description: "Score brand fit, clarity, CTA strength, and SEO/AIO readiness.",
      },
      {
        label: "What-If Stories",
        href: "/what-if-stories",
        description: "Create personalized prospect growth scenarios.",
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        label: "Prospects",
        href: "/prospects",
        description: "Track target companies and contacts.",
      },
      {
        label: "Opportunities",
        href: "/opportunities",
        description: "Manage revenue pipeline opportunities.",
      },
      {
        label: "Link Builder",
        href: "/link-builder",
        description: "Find, prepare, and verify directory backlinks.",
      },
    ],
  },
  {
    label: "Automation",
    items: [
      {
        label: "Zapier",
        href: "/zapier",
        description: "Review Zapier MCP setup and action status.",
      },
      {
        label: "GalaxyAI",
        href: "/galaxyai",
        description: "Manage creative media generation workflows.",
      },
    ],
  },
  {
    label: "Memory",
    items: [
      {
        label: "Brand Voice",
        href: "/brand-voice",
        description: "Control voice, tone, and brand rules.",
      },
      {
        label: "Knowledge",
        href: "/knowledge",
        description: "Manage reusable business knowledge.",
      },
      {
        label: "Settings",
        href: "/settings",
        description: "Manage setup, quality thresholds, and product configuration.",
      },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupIsActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => isActivePath(pathname, item.href));
}

function Logo() {
  return (
    <Link href="/dashboard" className={styles.logoLink}>
      <span className={styles.logoMark}>VIP</span>
      <span className={styles.logoText}>
        <span className={styles.logoTitle}>{productConfig.appName}</span>
        <span className={styles.logoSub}>{productConfig.brandName}</span>
      </span>
    </Link>
  );
}

export function SidebarNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Logo />

        <nav className={styles.desktopNav} aria-label="Main navigation">
          {navGroups.map((group) => {
            const groupActive = groupIsActive(pathname, group);

            return (
              <div key={group.label} className={styles.navGroup}>
                <button
                  type="button"
                  className={[
                    styles.groupButton,
                    groupActive ? styles.groupButtonActive : "",
                  ].join(" ")}
                  aria-haspopup="true"
                >
                  <span>{group.label}</span>
                  <span className={styles.chevron}>⌄</span>
                </button>

                <div className={styles.dropdown}>
                  <div className={styles.dropdownInner}>
                    {group.items.map((item) => {
                      const active = isActivePath(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={[
                            styles.dropdownItem,
                            active ? styles.dropdownItemActive : "",
                          ].join(" ")}
                          aria-current={active ? "page" : undefined}
                        >
                          <span className={styles.dropdownTitle}>{item.label}</span>
                          {item.description ? (
                            <span className={styles.dropdownDescription}>
                              {item.description}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className={styles.rightSide}>
          <div className={styles.account}>
            <span className={styles.accountLabel}>Signed in</span>
            <span className={styles.accountEmail}>{userEmail}</span>
          </div>

          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div id="mobile-navigation" className={styles.mobilePanel}>
          <div className={styles.mobileInner}>
            {navGroups.map((group) => (
              <section key={group.label} className={styles.mobileGroup}>
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
                        <span>
                          <span className={styles.mobileLinkTitle}>{item.label}</span>
                          {item.description ? (
                            <span className={styles.mobileLinkDescription}>
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                        <span className={styles.mobileArrow}>→</span>
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
