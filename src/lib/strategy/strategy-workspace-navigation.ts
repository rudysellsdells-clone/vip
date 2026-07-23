export const STRATEGY_WORKSPACE_TABS = [
  { label: "Overview", href: "/strategy" },
  { label: "Business Truth", href: "/strategy/business-truth" },
  { label: "Brand Voice", href: "/strategy/brand-voice" },
  { label: "Offerings", href: "/strategy/offerings" },
  { label: "Audiences", href: "/strategy/audiences" },
  { label: "Messaging & Proof", href: "/strategy/messaging-proof" },
  { label: "Brand Rules", href: "/strategy/brand-rules" },
  { label: "Knowledge", href: "/strategy/knowledge" },
] as const;

export function isStrategyWorkspacePathActive(pathname: string, href: string) {
  if (href === "/strategy") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
