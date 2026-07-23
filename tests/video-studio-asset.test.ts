import assert from "node:assert/strict";
import test from "node:test";
import {
  adPackageFromMetadata,
  lumaScenePlanFromPackage,
  renderVideoPackageContent,
  videoPackageFromMetadata,
} from "../src/lib/video-studio/video-asset.ts";
import { createVideoPackageDraft } from "../src/lib/video-studio/video-package.ts";

function packageFixture() {
  return createVideoPackageDraft({
    accountId: "account-1",
    campaignId: "campaign-1",
    title: "Video package",
    provider: "luma",
    source: { type: "campaign", id: "campaign-1", title: "Campaign", campaignId: "campaign-1", assetId: null },
    objective: "Leads",
    audience: "Contractors",
    offer: "Assessment",
    concept: "Coordinated launch",
    hook: "One plan can launch the campaign.",
    script: "A short script.",
    voiceover: "A short voiceover.",
    shotList: [1, 2, 3, 4].map((index) => ({
      order: index,
      label: `Scene ${index}`,
      durationSeconds: 5,
      visualDirection: `Visual ${index}`,
      voiceover: `Voice ${index}`,
      onScreenText: null,
    })),
    durationSeconds: 20,
    aspectRatio: "16:9",
    destinationUrl: "https://example.com",
    lineage: {
      campaignStrategySignature: "sig",
      strategyFoundationSignature: null,
      marketIntelligenceSignature: null,
      evidenceSourceIds: [],
    },
  });
}

test("video assets preserve package metadata and provider prompts", () => {
  const videoPackage = packageFixture();
  const metadata = { generatedBy: "video_studio", videoPackage };

  assert.equal(videoPackageFromMetadata(metadata)?.title, "Video package");
  assert.equal(lumaScenePlanFromPackage(videoPackage).length, 4);
  assert.match(lumaScenePlanFromPackage(videoPackage)[0].prompt, /Coordinated launch/);
  assert.match(renderVideoPackageContent(videoPackage), /SHOT LIST/);
});

test("ad package parsing rejects unrelated asset metadata", () => {
  assert.equal(adPackageFromMetadata({ generatedBy: "other" }), null);
  assert.equal(videoPackageFromMetadata({ generatedBy: "video_studio", videoPackage: {} }), null);
});
