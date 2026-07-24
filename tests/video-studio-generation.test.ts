import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGeneratedVideoPackage } from "../src/lib/video-studio/video-generator.ts";
import type { VideoSourceContext } from "../src/lib/video-studio/source-context.ts";

const context: VideoSourceContext = {
  accountId: "account-1",
  campaignId: "campaign-1",
  source: {
    type: "campaign",
    id: "campaign-1",
    title: "Launch campaign",
    campaignId: "campaign-1",
    assetId: null,
  },
  objective: "Generate qualified leads",
  audience: "Established contractors",
  offer: "Marketing automation assessment",
  destinationUrl: "https://example.com/assessment",
  strategySnapshot: { approved: true },
  lineage: {
    campaignStrategySignature: "campaign-signature",
    strategyFoundationSignature: "foundation-signature",
    marketIntelligenceSignature: "market-signature",
    evidenceSourceIds: ["source-1"],
  },
  creativeSource: { campaignName: "Launch campaign" },
};

function rawPackage() {
  return {
    title: "Launch the campaign",
    concept: "A contractor moves from scattered tasks to a coordinated launch.",
    hook: "What if the whole campaign launched from one clear plan?",
    script: "Show the problem, the coordinated plan, the launch, and the CTA.",
    voiceover: "Marketing should move as one coordinated system.",
    shots: [1, 2, 3, 4].map((index) => ({
      label: `Scene ${index}`,
      visualDirection: `Realistic business scene ${index}.`,
      voiceover: `Voiceover ${index}.`,
      onScreenText: index === 4 ? "Start here" : null,
    })),
  };
}

test("generated video packages normalize into four provider-ready scenes", () => {
  const videoPackage = normalizeGeneratedVideoPackage({
    raw: rawPackage(),
    context,
    provider: "luma",
    aspectRatio: "9:16",
  });

  assert.equal(videoPackage.provider, "luma");
  assert.equal(videoPackage.durationSeconds, 20);
  assert.equal(videoPackage.aspectRatio, "9:16");
  assert.equal(videoPackage.shotList.length, 4);
  assert.deepEqual(videoPackage.shotList.map((shot) => shot.durationSeconds), [5, 5, 5, 5]);
  assert.equal(videoPackage.lineage.campaignStrategySignature, "campaign-signature");
});

test("generation rejects incomplete scenes before persistence", () => {
  const raw = rawPackage();
  raw.shots[2].visualDirection = "";

  assert.throws(
    () => normalizeGeneratedVideoPackage({ raw, context, provider: "magica", aspectRatio: "16:9" }),
    /Every video shot needs visual direction and voiceover/,
  );
});
