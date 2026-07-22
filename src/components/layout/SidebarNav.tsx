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
    () =>
      buildAppNavigation({
        activeAccountId,
        canManageActiveAccount,
        isMaster,
      }),
    [activeAccountId, canManageActiveAccount, isMaster],
  );
  const roleLabel = isMaster
    ? "MASTER"
    : activeAccountRole
      ? activeAccountRole.replaceAll("_", " ")
      : platformRole;

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Logo />

        <nav className={styles.desktopNav} aria-label="Main navigation">
          {navGroups.map((group) => {
            const groupActive = isAppNavGroupActive(pathname, group);

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
                      const active = isAppNavPathActive(pathname, item.href);

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
            <AccountSwitcher
              accounts={accounts}
              activeAccountId={activeAccountId}
              isMaster={isMaster}
            />
          </div>

          <div className={styles.account}>
            <span className={styles.accountLabel}>Signed in</span>
            <span className={styles.accountEmail}>{userEmail}</span>
            {activeAccountName ? (
              <span className={styles.accountContext}>{activeAccountName}</span>
            ) : null}
            {roleLabel ? (
              <span className={styles.accountContext}>{roleLabel}</span>
            ) : null}
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
              <AccountSwitcher
                accounts={accounts}
                activeAccountId={activeAccountId}
                isMaster={isMaster}
              />
            </div>

            {navGroups.map((group) => (
              <section key={group.label} className={styles.mobileGroup}>
                <p className={styles.mobileGroupLabel}>{group.label}</p>
                <div className={styles.mobileLinks}>
                  {group.items.map((item) => {
                    const active = isAppNavPathActive(pathname, item.href);

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
                          <span className={styles.mobileLinkTitle}>
                            {item.label}
                          </span>
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
