import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCampaignVideoReadiness,
  buildVideoUsageSummary,
  videoReviewStatusFromAssetStatus,
} from "../src/lib/video-studio/campaign-video-readiness.ts";
import type { UnifiedVideoRun } from "../src/lib/video-studio/provider-registry.ts";

function run(
  provider: "luma" | "magica",
  renderStatus: UnifiedVideoRun["renderStatus"],
): UnifiedVideoRun {
  return {
    id: `${provider}-${renderStatus}`,
    provider,
    providerRunId: null,
    campaignId: "campaign-1",
    sourceAssetId: null,
    title: "Video run",
    renderStatus,
    reviewStatus: "approved",
    outputUrl: null,
    error: null,
    createdAt: "2026-07-23T20:00:00.000Z",
    updatedAt: "2026-07-23T20:00:00.000Z",
    rawStatus: renderStatus,
  };
}

test("asset decisions map into the canonical video review lifecycle", () => {
  assert.equal(videoReviewStatusFromAssetStatus("needs_review"), "needs_review");
  assert.equal(videoReviewStatusFromAssetStatus("approved"), "approved");
  assert.equal(videoReviewStatusFromAssetStatus("rejected"), "revision_requested");
  assert.equal(videoReviewStatusFromAssetStatus("archived"), "archived");
  assert.equal(videoReviewStatusFromAssetStatus(null), "not_submitted");
});

test("campaign video readiness prioritizes review before provider execution", () => {
  const readiness = buildCampaignVideoReadiness([
    { provider: "luma", assetStatus: "needs_review", renderStatus: null },
    { provider: "magica", assetStatus: "approved", renderStatus: "draft" },
  ]);

  assert.equal(readiness.status, "needs_review");
  assert.equal(readiness.packageCount, 2);
  assert.equal(readiness.needsReviewCount, 1);
  assert.equal(readiness.readyToRenderCount, 1);
  assert.equal(readiness.nextAction.href, "/approvals");
});

test("campaign video readiness surfaces active, failed, and completed states", () => {
  assert.equal(
    buildCampaignVideoReadiness([
      { provider: "luma", assetStatus: "approved", renderStatus: "rendering" },
    ]).status,
    "rendering",
  );
  assert.equal(
    buildCampaignVideoReadiness([
      { provider: "luma", assetStatus: "approved", renderStatus: "failed" },
    ]).status,
    "attention",
  );
  assert.equal(
    buildCampaignVideoReadiness([
      { provider: "magica", assetStatus: "approved", renderStatus: "completed" },
    ]).status,
    "completed",
  );
});

test("video usage summarizes provider attempts without replacing provider records", () => {
  const summary = buildVideoUsageSummary([
    run("luma", "rendering"),
    run("luma", "completed"),
    run("magica", "failed"),
  ]);

  assert.deepEqual(summary, {
    totalAttempts: 3,
    lumaAttempts: 2,
    magicaAttempts: 1,
    activeAttempts: 1,
    completedAttempts: 1,
    failedAttempts: 1,
  });
});
