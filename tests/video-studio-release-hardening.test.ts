import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { resolveVideoStudioEnabled } from "../src/lib/video-studio/feature.ts";
import { providerConfigurationStatus } from "../src/lib/video-studio/provider-registry.ts";

function source(path: string) {
  return readFileSync(
    fileURLToPath(new URL(`../${path}`, import.meta.url)),
    "utf8",
  );
}

test("production activation remains explicit while the H1.18 preview stays available", () => {
  assert.equal(
    resolveVideoStudioEnabled({ gitRef: "main" }),
    false,
  );
  assert.equal(
    resolveVideoStudioEnabled({ gitRef: "h1-18-unified-video-studio" }),
    true,
  );
  assert.equal(
    resolveVideoStudioEnabled({ serverValue: "true", gitRef: "main" }),
    true,
  );
  assert.equal(
    resolveVideoStudioEnabled({ serverValue: "false", gitRef: "h1-18-unified-video-studio" }),
    false,
  );
});

test("provider readiness requires real deployment credentials", () => {
  assert.deepEqual(providerConfigurationStatus({}), {
    luma: false,
    magica: false,
  });
  assert.deepEqual(
    providerConfigurationStatus({
      lumaApiKey: "luma",
      magicaApiKey: "magica",
    }),
    { luma: true, magica: true },
  );
  assert.deepEqual(
    providerConfigurationStatus({ galaxyAiApiKey: "legacy-magica" }),
    { luma: false, magica: true },
  );
});

test("package and render APIs block unavailable providers before execution", () => {
  const generationRoute = source("src/app/api/video-studio/packages/generate/route.ts");
  const renderRoute = source("src/app/api/video-studio/assets/[assetId]/render/route.ts");

  for (const route of [generationRoute, renderRoute]) {
    assert.match(route, /providerConfigurationStatus/);
    assert.match(route, /status: 503/);
    assert.match(route, /not configured for this deployment/);
  }
});

test("provider status is authenticated and never exposes credentials", () => {
  const statusRoute = source("src/app/api/video-studio/providers/status/route.ts");

  assert.match(statusRoute, /supabase\.auth\.getUser/);
  assert.match(statusRoute, /status: 401/);
  assert.match(statusRoute, /Cache-Control/);
  assert.doesNotMatch(statusRoute, /process\.env\.[A-Z_]+\s*[,}]/);
});

test("Video Studio controls retain mobile-safe actions and accessible feedback", () => {
  const builder = source("src/components/video-studio/VideoPackageBuilder.tsx");
  const renderButton = source("src/components/video-studio/VideoRenderButton.tsx");
  const providerHook = source("src/components/video-studio/useVideoProviderAvailability.ts");

  assert.match(builder, /max-sm:w-full/);
  assert.match(builder, /sm:grid-cols-2/);
  assert.match(builder, /aria-live="polite"/);
  assert.match(builder, /providerStatusLoading/);
  assert.match(renderButton, /max-sm:w-full/);
  assert.match(renderButton, /aria-live="polite"/);
  assert.match(renderButton, /providerStatusLoading/);
  assert.match(providerHook, /cache: "no-store"/);
});
