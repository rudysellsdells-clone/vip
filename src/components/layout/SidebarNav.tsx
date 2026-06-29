"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { productConfig } from "@/lib/config/product";
import { AccountSwitcher } from "@/components/accounts/AccountSwitcher";
import { SignOutButton } from "@/components/layout/SignOutButton";
import type { AccountContextAccount } from "@/lib/accounts/account-context";
import styles from "./SidebarNav.module.css";

type NavItem = {
  label: string;
  href: string;
  description?: string;
  masterOnly?: boolean;
  requiresAccount?: boolean;
  manageAccountOnly?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
  masterOnly?: boolean;
  requiresAccount?: boolean;
};

type NavContext = {
  activeAccountId: string | null;
  canManageActiveAccount: boolean;
  isMaster: boolean;
};

function activeAccountWorkspaceHref(activeAccountId: string | null) {
  return activeAccountId ? `/accounts/${activeAccountId}` : "/accounts";
}

function buildNavGroups({
  activeAccountId,
  canManageActiveAccount,
  isMaster,
}: NavContext): NavGroup[] {
  const activeAccountHref = activeAccountWorkspaceHref(activeAccountId);

  const groups: NavGroup[] = [
    {
      label: "Home",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard",
          description: "Overview, status, and next actions.",
        },
      ],
    },
    {
      label: "Plan",
      requiresAccount: true,
      items: [
        {
          label: "Campaigns",
          href: "/campaigns",
          description: "Create and manage campaign asset packs.",
          requiresAccount: true,
        },
        {
          label: "Content Calendar",
          href: "/content-calendar",
          description: "Plan the month and move content through production.",
          requiresAccount: true,
        },
        {
          label: "Monthly Review",
          href: "/content-calendar/monthly-review",
          description: "Review generated monthly content before approval.",
          requiresAccount: true,
        },
      ],
    },
    {
      label: "Create",
      requiresAccount: true,
      items: [
        {
          label: "Authority Content",
          href: "/authority-content",
          description: "Create blogs, white papers, and authority assets.",
          requiresAccount: true,
        },
        {
          label: "Repurposing",
          href: "/content-repurposing",
          description: "Turn source assets into channel-ready content.",
          requiresAccount: true,
        },
        {
          label: "What-If Stories",
          href: "/what-if-stories",
          description: "Create personalized prospect growth scenarios.",
          masterOnly: true,
        },
      ],
    },
    {
      label: "Review",
      requiresAccount: true,
      items: [
        {
          label: "Quality Review",
          href: "/content-quality",
          description: "Review quality scores and improvement notes.",
          requiresAccount: true,
        },
        {
          label: "Approvals",
          href: "/approvals",
          description: "Review, revise, and approve assets.",
          requiresAccount: true,
        },
        {
          label: "Archive",
          href: "/archive",
          description: "Review archived campaigns and assets.",
          requiresAccount: true,
        },
      ],
    },
    {
      label: "Publish",
      requiresAccount: true,
      items: [
        {
          label: "Publish Center",
          href: "/publishing-schedule",
          description: "Approved content ready to schedule, send, or publish.",
          requiresAccount: true,
        },
        {
          label: "Action History",
          href: "/actions",
          description: "Publishing, draft, and automation history.",
          requiresAccount: true,
        },
        {
          label: "Integrations",
          href: "/zapier",
          description: "ZapierMCP diagnostics and provider execution records.",
          masterOnly: true,
        },
        {
          label: "GalaxyAI",
          href: "/galaxyai",
          description: "Manage creative media generation workflows.",
          masterOnly: true,
        },
      ],
    },
    {
      label: "Grow",
      masterOnly: true,
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
      label: "Workspace",
      items: [
        {
          label: isMaster ? "Accounts" : "Account Workspace",
          href: isMaster ? "/accounts" : activeAccountHref,
          description: isMaster
            ? "Create client accounts, owners, seats, and access."
            : "Manage this account's profile, strategy, team, and publishing settings.",
          requiresAccount: !isMaster,
        },
        {
          label: "Brand Voice",
          href: "/brand-voice",
          description: "Control voice, tone, and brand rules.",
          masterOnly: true,
        },
        {
          label: "Knowledge",
          href: "/knowledge",
          description: "Manage reusable business knowledge.",
          masterOnly: true,
        },
        {
          label: "Settings",
          href: "/settings",
          description: "Manage thresholds and setup controls.",
          masterOnly: true,
        },
      ],
    },
  ];

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => shouldShowItem(item, { activeAccountId, canManageActiveAccount, isMaster })),
    }))
    .filter((group) => group.items.length > 0 && shouldShowGroup(group, { activeAccountId, canManageActiveAccount, isMaster }));
}

function shouldShowGroup(group: NavGroup, context: NavContext) {
  if (group.masterOnly && !context.isMaster) return false;
  if (group.requiresAccount && !context.activeAccountId) return false;
  return true;
}

function shouldShowItem(item: NavItem, context: NavContext) {
  if (item.masterOnly && !context.isMaster) return false;
  if (item.requiresAccount && !context.activeAccountId) return false;
  if (item.manageAccountOnly && !context.isMaster && !context.canManageActiveAccount) return false;
  return true;
}

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

export function SidebarNav({
  userEmail,
  accounts,
  activeAccountId,
  activeAccountName,
  activeAccountRole,
  canManageActiveAccount,
  platformRole,
  isMaster,
}: {
  userEmail: string;
  accounts: AccountContextAccount[];
  activeAccountId: string | null;
  activeAccountName: string | null;
  activeAccountRole: string | null;
  canManageActiveAccount: boolean;
  platformRole: string;
  isMaster: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navGroups = useMemo(
    () => buildNavGroups({ activeAccountId, canManageActiveAccount, isMaster }),
    [activeAccountId, canManageActiveAccount, isMaster],
  );
  const roleLabel = isMaster ? "MASTER" : activeAccountRole ? activeAccountRole.replaceAll("_", " ") : platformRole;

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
          <div className={styles.accountSwitcherWrap}>
            <span className={styles.accountLabel}>Active workspace</span>
            <AccountSwitcher accounts={accounts} activeAccountId={activeAccountId} isMaster={isMaster} />
          </div>

          <div className={styles.account}>
            <span className={styles.accountLabel}>Signed in</span>
            <span className={styles.accountEmail}>{userEmail}</span>
            {activeAccountName ? (
              <span className={styles.accountContext}>{activeAccountName}</span>
            ) : null}
            {roleLabel ? <span className={styles.accountContext}>{roleLabel}</span> : null}
            <SignOutButton className={styles.signOutButton} />
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
            <div className={styles.mobileActiveAccount}>
              <span className={styles.accountLabel}>Active workspace</span>
              <AccountSwitcher accounts={accounts} activeAccountId={activeAccountId} isMaster={isMaster} />
            </div>

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

            <div className={styles.mobileSignOut}>
              <SignOutButton className={styles.mobileSignOutButton} />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}