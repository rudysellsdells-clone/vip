import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeLumaRenderStatus,
  normalizeLumaRun,
  normalizeMagicaRenderStatus,
  normalizeMagicaRun,
  providerConfigurationStatus,
  VIDEO_PROVIDER_REGISTRY,
} from "../src/lib/video-studio/provider-registry.ts";

test("provider registry preserves direct Luma and managed Magica systems", () => {
  assert.equal(VIDEO_PROVIDER_REGISTRY.luma.executionMode, "direct_api");
  assert.equal(VIDEO_PROVIDER_REGISTRY.magica.executionMode, "managed_workflow");
  assert.ok(VIDEO_PROVIDER_REGISTRY.luma.capabilities.includes("extend_video"));
  assert.ok(
    VIDEO_PROVIDER_REGISTRY.magica.capabilities.includes("workflow_generation"),
  );
});

test("provider-specific states normalize into one render lifecycle", () => {
  assert.equal(normalizeLumaRenderStatus("generating_scene_3"), "rendering");
  assert.equal(normalizeLumaRenderStatus("completed"), "completed");
  assert.equal(normalizeMagicaRenderStatus("running"), "rendering");
  assert.equal(normalizeMagicaRenderStatus("canceled"), "cancelled");
});

test("existing provider rows normalize without losing lineage", () => {
  const luma = normalizeLumaRun({
    id: "luma-1",
    campaign_id: "campaign-1",
    status: "generating_scene_2",
    final_video_url: null,
    created_at: "2026-07-23T18:00:00.000Z",
    updated_at: "2026-07-23T18:01:00.000Z",
  });
  const magica = normalizeMagicaRun({
    id: "magica-1",
    campaign_id: "campaign-1",
    asset_id: "asset-1",
    galaxy_run_id: "provider-run-1",
    galaxy_workflow_id: "workflow-1",
    status: "completed",
    output: { media: { videoUrl: "https://example.com/video.mp4" } },
    created_at: "2026-07-23T18:00:00.000Z",
    updated_at: "2026-07-23T18:02:00.000Z",
  });

  assert.equal(luma.provider, "luma");
  assert.equal(luma.renderStatus, "rendering");
  assert.equal(magica.provider, "magica");
  assert.equal(magica.sourceAssetId, "asset-1");
  assert.equal(magica.outputUrl, "https://example.com/video.mp4");
});

test("provider configuration recognizes current environment aliases", () => {
  assert.deepEqual(
    providerConfigurationStatus({
      lumaApiKey: "luma-key",
      galaxyAiApiKey: "legacy-magica-key",
    }),
    { luma: true, magica: true },
  );
});
