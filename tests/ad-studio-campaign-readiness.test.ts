import assert from "node:assert/strict";
import test from "node:test";
import { buildCampaignAdReadiness } from "../src/lib/ad-studio/campaign-ad-readiness.ts";

test("campaign advertising starts with a direct Ad Studio action", () => {
  const state = buildCampaignAdReadiness([]);
  assert.equal(state.status, "not_started");
  assert.equal(state.packageCount, 0);
  assert.equal(state.nextAction.href, "/ad-studio");
});

test("campaign advertising prioritizes review when generated ads are pending", () => {
  const state = buildCampaignAdReadiness([
    { channel: "google_search", status: "needs_review", score: 94 },
    { channel: "meta", status: "approved", score: 88 },
  ]);
  assert.equal(state.status, "needs_review");
  assert.equal(state.needsReviewCount, 1);
  assert.equal(state.approvedCount, 1);
  assert.equal(state.nextAction.href, "/approvals");
});

test("approved high-scoring packages become export ready", () => {
  const state = buildCampaignAdReadiness([
    { channel: "google_search", status: "approved", score: 94 },
    { channel: "meta", status: "approved", score: 83 },
    { channel: "linkedin", status: "approved", score: 70 },
  ]);
  assert.equal(state.status, "approved");
  assert.equal(state.exportReadyCount, 2);
  assert.equal(state.averageScore, 82);
  assert.deepEqual(state.channels.sort(), ["google_search", "linkedin", "meta"]);
});
