import assert from "node:assert/strict";
import test from "node:test";
import { collectGalaxyAiRunMedia } from "../src/lib/galaxyai/run-recovery.ts";
import type { GalaxyAiRunDetails } from "../src/lib/galaxyai/types.ts";

function run(overrides: Partial<GalaxyAiRunDetails> = {}): GalaxyAiRunDetails {
  return {
    id: "run-123",
    workflowId: "workflow-1",
    status: "COMPLETED",
    nodeRuns: [],
    ...overrides,
  };
}

test("keeps only workflow media belonging to the current run", () => {
  const media = collectGalaxyAiRunMedia({
    galaxyRun: run(),
    galaxyRunId: "run-123",
    workflowMediaItems: [
      { url: "https://cdn.example.com/current.png", runId: "run-123" },
      { url: "https://cdn.example.com/old.png", runId: "run-999" },
    ],
  });

  assert.deepEqual(media.map((item) => item.url), [
    "https://cdn.example.com/current.png",
  ]);
});

test("recovers media directly from completed node outputs while workflow indexing lags", () => {
  const media = collectGalaxyAiRunMedia({
    galaxyRun: run({
      nodeRuns: [
        {
          id: "node-run-1",
          nodeId: "image-node",
          nodeType: "image_generation",
          status: "COMPLETED",
          output: {
            result: {
              imageUrl: "https://cdn.example.com/generated.webp",
            },
          },
        },
      ],
    }),
    galaxyRunId: "run-123",
  });

  assert.equal(media.length, 1);
  assert.equal(media[0]?.url, "https://cdn.example.com/generated.webp");
  assert.equal(media[0]?.type, "image");
  assert.equal(media[0]?.runId, "run-123");
});

test("deduplicates the same file returned by run details and workflow media", () => {
  const media = collectGalaxyAiRunMedia({
    galaxyRun: run({
      nodeRuns: [
        {
          id: "node-run-1",
          nodeId: "image-node",
          nodeType: "image_generation",
          status: "COMPLETED",
          output: "https://cdn.example.com/generated.png",
        },
      ],
    }),
    galaxyRunId: "run-123",
    workflowMediaItems: [
      {
        url: "https://cdn.example.com/generated.png",
        runId: "run-123",
        nodeLabel: "Final image",
      },
    ],
  });

  assert.equal(media.length, 1);
  assert.equal(media[0]?.nodeLabel, "Final image");
});
