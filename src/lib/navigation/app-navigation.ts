export type AppNavItem = {
  label: string;
  href: string;
  description?: string;
  masterOnly?: boolean;
  requiresAccount?: boolean;
  manageAccountOnly?: boolean;
  featureKey?: string;
};

export type AppNavGroup = {
  label: string;
  items: AppNavItem[];
  masterOnly?: boolean;
  requiresAccount?: boolean;
};

export type AppNavContext = {
  activeAccountId: string | null;
  canManageActiveAccount: boolean;
  isMaster: boolean;
  enabledFeatures?: ReadonlySet<string>;
};

function activeAccountWorkspaceHref(activeAccountId: string | null) {
  return activeAccountId ? `/accounts/${activeAccountId}` : "/accounts";
}

function shouldShowGroup(group: AppNavGroup, context: AppNavContext) {
  if (group.masterOnly && !context.isMaster) return false;
  if (group.requiresAccount && !context.activeAccountId) return false;
  return true;
}

function shouldShowItem(item: AppNavItem, context: AppNavContext) {
  if (item.masterOnly && !context.isMaster) return false;
  if (item.requiresAccount && !context.activeAccountId) return false;
  if (
    item.manageAccountOnly &&
    !context.isMaster &&
    !context.canManageActiveAccount
  ) {
    return false;
  }
  if (item.featureKey && !context.enabledFeatures?.has(item.featureKey)) {
    return false;
  }
  return true;
}

export function buildAppNavigation({
  activeAccountId,
  canManageActiveAccount,
  isMaster,
  enabledFeatures,
}: AppNavContext): AppNavGroup[] {
  const activeAccountHref = activeAccountWorkspaceHref(activeAccountId);
  const context: AppNavContext = {
    activeAccountId,
    canManageActiveAccount,
    isMaster,
    enabledFeatures,
  };

  const groups: AppNavGroup[] = [
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
      label: "Measure",
      requiresAccount: true,
      items: [
        {
          label: "Analytics",
          href: "/analytics",
          description: "Connect traffic, engagement, leads, conversions, and revenue.",
          requiresAccount: true,
        },
        {
          label: "UTM Taxonomy",
          href: "/analytics/taxonomy",
          description: "Control campaign naming, source/medium rules, and attributed links.",
          requiresAccount: true,
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
      items: group.items.filter((item) => shouldShowItem(item, context)),
    }))
    .filter(
      (group) => group.items.length > 0 && shouldShowGroup(group, context),
    );
}

export function isAppNavPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAppNavGroupActive(
  pathname: string,
  group: AppNavGroup,
) {
  return group.items.some((item) => isAppNavPathActive(pathname, item.href));
}
