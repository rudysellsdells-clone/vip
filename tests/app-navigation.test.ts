import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAppNavigation,
  isAppNavGroupActive,
  isAppNavPathActive,
} from "../src/lib/navigation/app-navigation.ts";

function labels(groups: ReturnType<typeof buildAppNavigation>) {
  return groups.flatMap((group) => group.items.map((item) => item.label));
}

test("normal users without an active account only see account-independent navigation", () => {
  const groups = buildAppNavigation({
    activeAccountId: null,
    canManageActiveAccount: false,
    isMaster: false,
  });

  assert.deepEqual(groups.map((group) => group.label), ["Home"]);
  assert.deepEqual(labels(groups), ["Dashboard"]);
});

test("normal users with an active account see workspace navigation without master tools", () => {
  const groups = buildAppNavigation({
    activeAccountId: "account-123",
    canManageActiveAccount: false,
    isMaster: false,
  });
  const itemLabels = labels(groups);

  assert.ok(itemLabels.includes("Account Workspace"));
  assert.ok(itemLabels.includes("Campaigns"));
  assert.ok(itemLabels.includes("Analytics"));
  assert.ok(!itemLabels.includes("Accounts"));
  assert.ok(!itemLabels.includes("GalaxyAI"));
  assert.ok(!itemLabels.includes("Settings"));
});

test("master users retain platform and growth tools", () => {
  const groups = buildAppNavigation({
    activeAccountId: "account-123",
    canManageActiveAccount: true,
    isMaster: true,
  });
  const itemLabels = labels(groups);

  assert.ok(itemLabels.includes("Accounts"));
  assert.ok(itemLabels.includes("GalaxyAI"));
  assert.ok(itemLabels.includes("Prospects"));
  assert.ok(itemLabels.includes("Settings"));
  assert.ok(!itemLabels.includes("Account Workspace"));
});

test("feature-gated items remain hidden unless explicitly enabled", () => {
  const baseline = buildAppNavigation({
    activeAccountId: "account-123",
    canManageActiveAccount: true,
    isMaster: true,
  });
  const withFeatures = buildAppNavigation({
    activeAccountId: "account-123",
    canManageActiveAccount: true,
    isMaster: true,
    enabledFeatures: new Set(["future-feature"]),
  });

  assert.deepEqual(labels(withFeatures), labels(baseline));
});

test("active path helpers support nested routes", () => {
  assert.equal(isAppNavPathActive("/campaigns", "/campaigns"), true);
  assert.equal(isAppNavPathActive("/campaigns/123", "/campaigns"), true);
  assert.equal(isAppNavPathActive("/campaign-tools", "/campaigns"), false);

  const campaignsGroup = buildAppNavigation({
    activeAccountId: "account-123",
    canManageActiveAccount: false,
    isMaster: false,
  }).find((group) => group.label === "Plan");

  assert.ok(campaignsGroup);
  assert.equal(isAppNavGroupActive("/campaigns/123", campaignsGroup), true);
});
