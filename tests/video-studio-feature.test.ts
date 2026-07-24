import assert from "node:assert/strict";
import test from "node:test";
import { resolveVideoStudioEnabled } from "../src/lib/video-studio/feature.ts";

test("Video Studio is available on the H1.18 preview branch", () => {
  assert.equal(
    resolveVideoStudioEnabled({ gitRef: "h1-18-unified-video-studio" }),
    true,
  );
});

test("Video Studio remains hidden elsewhere until release", () => {
  assert.equal(resolveVideoStudioEnabled({ gitRef: "main" }), false);
  assert.equal(resolveVideoStudioEnabled({}), false);
});

test("explicit false remains an emergency rollback", () => {
  assert.equal(
    resolveVideoStudioEnabled({
      serverValue: "false",
      gitRef: "h1-18-unified-video-studio",
    }),
    false,
  );
});

test("server feature values override public feature values", () => {
  assert.equal(
    resolveVideoStudioEnabled({
      serverValue: "off",
      publicValue: "true",
      gitRef: "h1-18-unified-video-studio",
    }),
    false,
  );
});
