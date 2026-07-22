import assert from "node:assert/strict";
import test from "node:test";
import { buildCampaignWorkspaceState } from "../src/lib/campaigns/campaign-workspace.ts";

test("new campaign begins at Marketing Spine approval", () => {
  const workspace = buildCampaignWorkspaceState({
    strategyApproved: false,
    strategyStale: false,
    assetCount: 0,
    needsReviewCount: 0,
    approvedAssetCount: 0,
    executedAssetCount: 0,
  });

  assert.equal(workspace.nextAction.label, "Approve Marketing Spine");
  assert.equal(workspace.stages.find((stage) => stage.id === "strategy")?.status, "current");
  assert.equal(workspace.stages.find((stage) => stage.id === "assets")?.status, "locked");
});

test("stale strategy blocks downstream work", () => {
  const workspace = buildCampaignWorkspaceState({
    strategyApproved: false,
    strategyStale: true,
    assetCount: 4,
    needsReviewCount: 2,
    approvedAssetCount: 2,
    executedAssetCount: 0,
  });

  assert.equal(workspace.nextAction.label, "Refresh Marketing Spine");
  assert.equal(workspace.stages.find((stage) => stage.id === "strategy")?.status, "attention");
  assert.equal(workspace.stages.find((stage) => stage.id === "assets")?.status, "locked");
});

test("approved strategy with no assets advances to generation", () => {
  const workspace = buildCampaignWorkspaceState({
    strategyApproved: true,
    strategyStale: false,
    assetCount: 0,
    needsReviewCount: 0,
    approvedAssetCount: 0,
    executedAssetCount: 0,
  });

  assert.equal(workspace.nextAction.label, "Generate Asset Pack");
  assert.equal(workspace.stages.find((stage) => stage.id === "strategy")?.status, "complete");
  assert.equal(workspace.stages.find((stage) => stage.id === "assets")?.status, "current");
});

test("generated assets with review work advance to review", () => {
  const workspace = buildCampaignWorkspaceState({
    strategyApproved: true,
    strategyStale: false,
    assetCount: 5,
    needsReviewCount: 3,
    approvedAssetCount: 2,
    executedAssetCount: 0,
  });

  assert.equal(workspace.nextAction.label, "Review Generated Assets");
  assert.equal(workspace.stages.find((stage) => stage.id === "assets")?.status, "complete");
  assert.equal(workspace.stages.find((stage) => stage.id === "review")?.status, "current");
  assert.equal(workspace.stages.find((stage) => stage.id === "execution")?.status, "locked");
});

test("approved assets advance to execution", () => {
  const workspace = buildCampaignWorkspaceState({
    strategyApproved: true,
    strategyStale: false,
    assetCount: 3,
    needsReviewCount: 0,
    approvedAssetCount: 3,
    executedAssetCount: 0,
  });

  assert.equal(workspace.nextAction.label, "Execute Approved Assets");
  assert.equal(workspace.stages.find((stage) => stage.id === "review")?.status, "complete");
  assert.equal(workspace.stages.find((stage) => stage.id === "execution")?.status, "current");
});

test("fully executed campaign completes all workflow stages", () => {
  const workspace = buildCampaignWorkspaceState({
    strategyApproved: true,
    strategyStale: false,
    assetCount: 3,
    needsReviewCount: 0,
    approvedAssetCount: 0,
    executedAssetCount: 3,
  });

  assert.equal(workspace.progressPercent, 100);
  assert.equal(workspace.nextAction.label, "Review Campaign Status");
  assert.equal(workspace.stages.every((stage) => stage.status === "complete"), true);
});
