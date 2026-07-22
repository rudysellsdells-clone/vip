"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./StrategyWorkspaceNav.module.css";

const tabs = [
  { label: "Overview", href: "/strategy" },
  { label: "Business Truth", href: "/strategy/business-truth" },
  { label: "Brand Voice", href: "/strategy/brand-voice" },
  { label: "Offerings", href: "/strategy/offerings" },
  { label: "Audiences", href: "/strategy/audiences" },
  { label: "Messaging & Proof", href: "/strategy/messaging-proof" },
  { label: "Brand Rules", href: "/strategy/brand-rules" },
  { label: "Knowledge", href: "/strategy/knowledge" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/strategy") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StrategyWorkspaceNav({ accountName }: { accountName: string }) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <div className={styles.context}>
        <span className={styles.eyebrow}>Strategy Workspace</span>
        <strong className={styles.accountName}>{accountName}</strong>
      </div>
      <nav className={styles.tabs} aria-label="Strategy workspace sections">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
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
