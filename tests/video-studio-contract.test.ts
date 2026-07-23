import assert from "node:assert/strict";
import test from "node:test";
import {
  createVideoPackageDraft,
  isVideoPackageReadyForRender,
  VIDEO_PACKAGE_VERSION,
  videoPackageMissingRequired,
} from "../src/lib/video-studio/video-package.ts";

function completeDraft() {
  return createVideoPackageDraft({
    accountId: "account-1",
    campaignId: "campaign-1",
    title: " Contractor Growth Video ",
    provider: "luma",
    source: {
      type: "campaign",
      id: "campaign-1",
      title: "Growth campaign",
      campaignId: "campaign-1",
      assetId: null,
    },
    objective: "Generate qualified leads",
    audience: "Established contractors",
    offer: "Marketing automation assessment",
    concept: "Show the moment marketing becomes coordinated",
    hook: "What if one button launched the whole campaign?",
    script: "Open with the contractor. End with the launch.",
    voiceover: "Your next campaign should not require twelve disconnected tools.",
    shotList: [
      {
        order: 2,
        label: "Launch",
        durationSeconds: 8.4,
        visualDirection: "The van accelerates into a stylized launch.",
        voiceover: "Launch the campaign.",
        onScreenText: null,
      },
      {
        order: 1,
        label: "Problem",
        durationSeconds: 6,
        visualDirection: "A contractor reviews scattered marketing tasks.",
        voiceover: "Marketing should feel coordinated.",
        onScreenText: "One plan. One launch.",
      },
    ],
    durationSeconds: 14.4,
    aspectRatio: "16:9",
    destinationUrl: "https://example.com",
    lineage: {
      campaignStrategySignature: "campaign-signature",
      strategyFoundationSignature: "foundation-signature",
      marketIntelligenceSignature: "market-signature",
      evidenceSourceIds: ["source-1"],
    },
    createdAt: "2026-07-23T18:00:00.000Z",
  });
}

test("video package drafts normalize status, ordering, and duration", () => {
  const draft = completeDraft();

  assert.equal(draft.version, VIDEO_PACKAGE_VERSION);
  assert.equal(draft.renderStatus, "draft");
  assert.equal(draft.reviewStatus, "not_submitted");
  assert.equal(draft.title, "Contractor Growth Video");
  assert.equal(draft.durationSeconds, 14);
  assert.deepEqual(
    draft.shotList.map((shot) => [shot.order, shot.label, shot.durationSeconds]),
    [
      [1, "Problem", 6],
      [2, "Launch", 8],
    ],
  );
  assert.equal(isVideoPackageReadyForRender(draft), true);
});

test("readiness names missing creative decisions", () => {
  const draft = completeDraft();
  const incomplete = { ...draft, hook: "", shotList: [] };

  assert.deepEqual(videoPackageMissingRequired(incomplete), ["Hook", "Shot list"]);
  assert.equal(isVideoPackageReadyForRender(incomplete), false);
});
