import Link from "next/link";
import styles from "./WebsitePage.module.css";

export function WebsitePage({ children }: { children: React.ReactNode }) {
  return <main className={styles.page}>{children}</main>;
}

export function WebsiteHero({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>

        {(primaryAction || secondaryAction) ? (
          <div className={styles.actions}>
            {primaryAction ? (
              <Link
                href={primaryAction.href}
                className={[styles.button, styles.primaryButton].join(" ")}
              >
                {primaryAction.label}
              </Link>
            ) : null}

            {secondaryAction ? (
              <Link
                href={secondaryAction.href}
                className={[styles.button, styles.secondaryButton].join(" ")}
              >
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function WebsiteSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          {eyebrow ? <p className={styles.sectionEyebrow}>{eyebrow}</p> : null}
          <h2 className={styles.sectionTitle}>{title}</h2>
          {description ? (
            <p className={styles.sectionDescription}>{description}</p>
          ) : null}
        </div>
      </div>

      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export function WebsiteMetric({
  label,
  value,
  description,
  href,
  dot = "blue",
}: {
  label: string;
  value: number | string;
  description: string;
  href?: string;
  dot?: "blue" | "gold" | "green" | "red" | "purple";
}) {
  const dotClass = {
    blue: styles.dotBlue,
    gold: styles.dotGold,
    green: styles.dotGreen,
    red: styles.dotRed,
    purple: styles.dotPurple,
  }[dot];

  const content = (
    <div className={styles.metric}>
      <div className={styles.metricHeader}>
        <p className={styles.metricLabel}>{label}</p>
        <span className={[styles.metricDot, dotClass].join(" ")} />
      </div>
      <p className={styles.metricValue}>{value}</p>
      <p className={styles.metricDescription}>{description}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={styles.metric}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>{label}</p>
          <span className={[styles.metricDot, dotClass].join(" ")} />
        </div>
        <p className={styles.metricValue}>{value}</p>
        <p className={styles.metricDescription}>{description}</p>
      </Link>
    );
  }

  return content;
}

export function WebsiteBadge({ status }: { status: string | null | undefined }) {
  const label = status
    ? status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Unknown";

  let className = styles.badge;

  if (["approved", "completed", "won", "qualified", "customer"].includes(status ?? "")) {
    className = [styles.badge, styles.badgeGreen].join(" ");
  } else if (
    ["needs_review", "waiting_approval", "revision_requested", "proposal_needed"].includes(status ?? "")
  ) {
    className = [styles.badge, styles.badgeGold].join(" ");
  } else if (["failed", "rejected", "lost", "unqualified"].includes(status ?? "")) {
    className = [styles.badge, styles.badgeRed].join(" ");
  } else if (
    ["published", "sent", "active_opportunity", "asset_pack_generated"].includes(status ?? "")
  ) {
    className = [styles.badge, styles.badgeBlue].join(" ");
  } else if (["running", "queued", "researching"].includes(status ?? "")) {
    className = [styles.badge, styles.badgePurple].join(" ");
  }

  return <span className={className}>{label}</span>;
}

export { styles as websiteStyles };
