"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { AccountSwitcher } from "@/components/accounts/AccountSwitcher";
import { SignOutButton } from "@/components/layout/SignOutButton";
import type { AccountContextAccount } from "@/lib/accounts/account-context";
import {
  buildAppNavigation,
  isAppNavGroupActive,
  isAppNavPathActive,
} from "@/lib/navigation/app-navigation";
import styles from "./SidebarNav.module.css";

function Logo() {
  return (
    <Link href="/dashboard" className={styles.logoLink} aria-label="Marketing VIP dashboard">
      <img
        src="/marketing-vip-logo.png"
        alt="Marketing VIP"
        className={styles.marketingVipLogo}
      />
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
  enabledFeatureKeys,
}: {
  userEmail: string;
  accounts: AccountContextAccount[];
  activeAccountId: string | null;
  activeAccountName: string | null;
  activeAccountRole: string | null;
  canManageActiveAccount: boolean;
  platformRole: string;
  isMaster: boolean;
  enabledFeatureKeys: string[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const enabledFeatures = useMemo(
    () => new Set(enabledFeatureKeys),
    [enabledFeatureKeys],
  );
  const navGroups = useMemo(
    () =>
      buildAppNavigation({
        activeAccountId,
        canManageActiveAccount,
        isMaster,
        enabledFeatures,
      }),
    [activeAccountId, canManageActiveAccount, enabledFeatures, isMaster],
  );
  const roleLabel = isMaster
    ? "MASTER"
    : activeAccountRole
      ? activeAccountRole.replaceAll("_", " ")
      : platformRole;
  const activeGroup = navGroups.find((group) => isAppNavGroupActive(pathname, group));
  const activeItem = activeGroup?.items.find((item) =>
    isAppNavPathActive(pathname, item.href),
  );
  const workspaceLabel =
    activeAccountName ?? (isMaster ? "Master workspace" : "Select a workspace");

  const navigationContent = navGroups.map((group) => {
    const groupActive = isAppNavGroupActive(pathname, group);

    return (
      <section key={group.label} className={styles.navGroup}>
        <p
          className={[
            styles.groupLabel,
            groupActive ? styles.groupLabelActive : "",
          ].join(" ")}
        >
          {group.label}
        </p>
        <div className={styles.navLinks}>
          {group.items.map((item) => {
            const active = isAppNavPathActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={[
                  styles.navLink,
                  active ? styles.navLinkActive : "",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
                title={item.description}
              >
                <span className={styles.navIndicator} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    );
  });

  return (
    <>
      <aside className={styles.sidebar} aria-label="Marketing VIP navigation">
        <div className={styles.sidebarHeader}>
          <Logo />
          <p className={styles.productLabel}>Marketing operating system</p>
        </div>

        <div className={styles.workspaceCard}>
          <span className={styles.metaLabel}>Active workspace</span>
          <strong className={styles.workspaceName}>{workspaceLabel}</strong>
          <AccountSwitcher
            accounts={accounts}
            activeAccountId={activeAccountId}
            isMaster={isMaster}
          />
        </div>

        <nav className={styles.desktopNav} aria-label="Main navigation">
          {navigationContent}
        </nav>

        <div className={styles.sidebarFooter}>
          <span className={styles.metaLabel}>Signed in</span>
          <span className={styles.accountEmail}>{userEmail}</span>
          <span className={styles.roleBadge}>{roleLabel}</span>
          <SignOutButton className={styles.signOutButton} />
        </div>
      </aside>

      <header className={styles.topBar}>
        <div className={styles.mobileStart}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            <span aria-hidden="true">☰</span>
            <span>Menu</span>
          </button>
          <div className={styles.mobileLogo}>
            <Logo />
          </div>
        </div>

        <div className={styles.pageContext}>
          <span className={styles.metaLabel}>{activeGroup?.label ?? "Home"}</span>
          <strong className={styles.pageTitle}>{activeItem?.label ?? "Dashboard"}</strong>
        </div>

        <div className={styles.topBarWorkspace}>
          <span className={styles.metaLabel}>Active workspace</span>
          <strong>{workspaceLabel}</strong>
        </div>

        <div className={styles.topBarUser}>
          <span className={styles.roleBadge}>{roleLabel}</span>
          <span className={styles.topBarEmail}>{userEmail}</span>
        </div>
      </header>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className={styles.mobileOverlay}
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside
            id="mobile-navigation"
            className={styles.mobilePanel}
            aria-label="Mobile navigation"
          >
            <div className={styles.mobilePanelHeader}>
              <Logo />
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setMobileOpen(false)}
              >
                Close
              </button>
            </div>

            <div className={styles.mobileWorkspaceCard}>
              <span className={styles.metaLabel}>Active workspace</span>
              <strong className={styles.workspaceName}>{workspaceLabel}</strong>
              <AccountSwitcher
                accounts={accounts}
                activeAccountId={activeAccountId}
                isMaster={isMaster}
              />
            </div>

            <nav className={styles.mobileNav} aria-label="Mobile main navigation">
              {navigationContent}
            </nav>

            <div className={styles.mobileFooter}>
              <span className={styles.accountEmail}>{userEmail}</span>
              <span className={styles.roleBadge}>{roleLabel}</span>
              <SignOutButton className={styles.mobileSignOutButton} />
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
