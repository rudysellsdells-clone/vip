import assert from "node:assert/strict";
import test from "node:test";
import {
  isStrategyWorkspacePathActive,
  STRATEGY_WORKSPACE_TABS,
} from "../src/lib/strategy/strategy-workspace-navigation.ts";

const expectedRoutes = [
  "/strategy",
  "/strategy/business-truth",
  "/strategy/brand-voice",
  "/strategy/offerings",
  "/strategy/audiences",
  "/strategy/messaging-proof",
  "/strategy/brand-rules",
  "/strategy/knowledge",
];

test("strategy workspace exposes the complete ordered tab inventory", () => {
  assert.deepEqual(
    STRATEGY_WORKSPACE_TABS.map((tab) => tab.href),
    expectedRoutes,
  );
  assert.equal(new Set(expectedRoutes).size, expectedRoutes.length);
});

test("strategy overview is exact while section tabs support nested routes", () => {
  assert.equal(isStrategyWorkspacePathActive("/strategy", "/strategy"), true);
  assert.equal(
    isStrategyWorkspacePathActive("/strategy/brand-voice", "/strategy"),
    false,
  );
  assert.equal(
    isStrategyWorkspacePathActive(
      "/strategy/brand-voice/history",
      "/strategy/brand-voice",
    ),
    true,
  );
  assert.equal(
    isStrategyWorkspacePathActive(
      "/strategy/brand-rules-extra",
      "/strategy/brand-rules",
    ),
    false,
  );
});
