import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAppNavigation,
  isAppNavGroupActive,
  isAppNavPathActive,
} from "../src/lib/navigation/app-navigation.ts";
import {
  getEnabledNavigationFeatures,
  NAVIGATION_FEATURES,
} from "../src/lib/navigation/navigation-features.ts";

function labels(groups: ReturnType<typeof buildAppNavigation>) {
  return groups.flatMap((group) => group.items.map((item) => item.label));
}

function hrefs(groups: ReturnType<typeof buildAppNavigation>) {
  return groups
    .flatMap((group) => group.items.map((item) => item.href))
    .sort();
}

const normalAccountRoutes = [
  "/accounts/account-123",
  "/actions",
  "/analytics",
  "/analytics/taxonomy",
  "/approvals",
  "/archive",
  "/authority-content",
  "/campaigns",
  "/content-calendar",
  "/content-calendar/monthly-review",
  "/content-quality",
  "/content-repurposing",
  "/dashboard",
  "/publishing-schedule",
  "/strategy",
].sort();

const masterAccountRoutes = [
  "/accounts",
  "/actions",
  "/analytics",
  "/analytics/taxonomy",
  "/approvals",
  "/archive",
  "/authority-content",
  "/campaigns",
  "/content-calendar",
  "/content-calendar/monthly-review",
  "/content-quality",
  "/content-repurposing",
  "/dashboard",
  "/galaxyai",
  "/link-builder",
  "/opportunities",
  "/prospects",
  "/publishing-schedule",
  "/settings",
  "/strategy",
  "/what-if-stories",
  "/zapier",
].sort();

test("normal users without an active account only see account-independent navigation", () => {
  const groups = buildAppNavigation({
    activeAccountId: null,
    canManageActiveAccount: false,
    isMaster: false,
  });

  assert.deepEqual(groups.map((group) => group.label), ["Home"]);
  assert.deepEqual(labels(groups), ["Dashboard"]);
});

test("normal users with an active account retain every account route without master tools", () => {
  const groups = buildAppNavigation({
    activeAccountId: "account-123",
    canManageActiveAccount: false,
    isMaster: false,
  });
  const itemLabels = labels(groups);
  const groupLabels = groups.map((group) => group.label);

  assert.deepEqual(hrefs(groups), normalAccountRoutes);
  assert.ok(groupLabels.includes("Strategy"));
  assert.ok(groupLabels.includes("Campaigns"));
  assert.ok(groupLabels.includes("Analytics"));
  assert.ok(itemLabels.includes("Strategy Workspace"));
  assert.ok(itemLabels.includes("Account Workspace"));
  assert.ok(itemLabels.includes("All Campaigns"));
  assert.ok(itemLabels.includes("Overview"));
  assert.ok(!itemLabels.includes("Accounts"));
  assert.ok(!itemLabels.includes("Brand Voice"));
  assert.ok(!itemLabels.includes("Knowledge"));
  assert.ok(!itemLabels.includes("Media Providers"));
  assert.ok(!itemLabels.includes("Settings"));
  assert.ok(!itemLabels.includes("Market Intelligence"));
  assert.ok(!itemLabels.includes("Ad Studio"));
  assert.ok(!itemLabels.includes("Video Studio"));
});

test("master users retain every platform, workspace, and growth route", () => {
  const groups = buildAppNavigation({
    activeAccountId: "account-123",
    canManageActiveAccount: true,
    isMaster: true,
  });
  const itemLabels = labels(groups);
  const groupLabels = groups.map((group) => group.label);

  assert.deepEqual(hrefs(groups), masterAccountRoutes);
  assert.ok(groupLabels.includes("Strategy"));
  assert.ok(groupLabels.includes("Growth"));
  assert.ok(groupLabels.includes("Platform Administration"));
  assert.ok(itemLabels.includes("Strategy Workspace"));
  assert.ok(itemLabels.includes("Accounts"));
  assert.ok(itemLabels.includes("Media Providers"));
  assert.ok(itemLabels.includes("Prospects"));
  assert.ok(itemLabels.includes("Settings"));
  assert.ok(!itemLabels.includes("Brand Voice"));
  assert.ok(!itemLabels.includes("Knowledge"));
  assert.ok(!itemLabels.includes("Account Workspace"));
});

test("feature-gated modules appear only when explicitly enabled", () => {
  const enabledFeatures = new Set([
    NAVIGATION_FEATURES.marketIntelligence,
    NAVIGATION_FEATURES.adStudio,
    NAVIGATION_FEATURES.videoStudio,
  ]);
  const groups = buildAppNavigation({
    activeAccountId: "account-123",
    canManageActiveAccount: false,
    isMaster: false,
    enabledFeatures,
  });
  const itemLabels = labels(groups);

  assert.ok(groups.some((group) => group.label === "Research"));
  assert.ok(itemLabels.includes("Market Intelligence"));
  assert.ok(itemLabels.includes("Ad Studio"));
  assert.ok(itemLabels.includes("Video Studio"));
});

test("navigation feature environment values are parsed conservatively", () => {
  const enabled = getEnabledNavigationFeatures({
    marketIntelligence: "true",
    adStudio: "1",
    videoStudio: "yes",
  });
  const disabled = getEnabledNavigationFeatures({
    marketIntelligence: "false",
    adStudio: "0",
    videoStudio: "off",
  });

  assert.deepEqual(
    [...enabled].sort(),
    [
      NAVIGATION_FEATURES.adStudio,
      NAVIGATION_FEATURES.marketIntelligence,
      NAVIGATION_FEATURES.videoStudio,
    ].sort(),
  );
  assert.equal(disabled.size, 0);
});

test("active path helpers support nested campaign and strategy routes", () => {
  assert.equal(isAppNavPathActive("/campaigns", "/campaigns"), true);
  assert.equal(isAppNavPathActive("/campaigns/123", "/campaigns"), true);
  assert.equal(isAppNavPathActive("/campaign-tools", "/campaigns"), false);
  assert.equal(isAppNavPathActive("/strategy/brand-voice", "/strategy"), true);

  const groups = buildAppNavigation({
    activeAccountId: "account-123",
    canManageActiveAccount: false,
    isMaster: false,
  });
  const campaignsGroup = groups.find((group) =>
    group.items.some((item) => item.href === "/campaigns"),
  );
  const strategyGroup = groups.find((group) =>
    group.items.some((item) => item.href === "/strategy"),
  );

  assert.ok(campaignsGroup);
  assert.ok(strategyGroup);
  assert.equal(isAppNavGroupActive("/campaigns/123", campaignsGroup), true);
  assert.equal(isAppNavGroupActive("/strategy/knowledge", strategyGroup), true);
});
