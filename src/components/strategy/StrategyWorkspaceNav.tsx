"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isStrategyWorkspacePathActive,
  STRATEGY_WORKSPACE_TABS,
} from "@/lib/strategy/strategy-workspace-navigation";
import styles from "./StrategyWorkspaceNav.module.css";

export function StrategyWorkspaceNav({ accountName }: { accountName: string }) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <div className={styles.context}>
        <span className={styles.eyebrow}>Strategy Workspace</span>
        <strong className={styles.accountName}>{accountName}</strong>
      </div>
      <nav className={styles.tabs} aria-label="Strategy workspace sections">
        {STRATEGY_WORKSPACE_TABS.map((tab) => {
          const active = isStrategyWorkspacePathActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[styles.tab, active ? styles.tabActive : ""].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
