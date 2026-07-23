import assert from "node:assert/strict";
import test from "node:test";
import { resolveAdStudioEnabled } from "../src/lib/ad-studio/feature.ts";

test("Ad Studio is enabled on the H1.17 preview branch", () => {
  assert.equal(
    resolveAdStudioEnabled({ gitRef: "h1-17-ad-studio" }),
    true,
  );
});

test("Ad Studio remains disabled by default outside the preview branch", () => {
  assert.equal(resolveAdStudioEnabled({ gitRef: "main" }), false);
  assert.equal(resolveAdStudioEnabled({}), false);
});

test("explicit feature values override branch defaults", () => {
  assert.equal(
    resolveAdStudioEnabled({
      serverValue: "false",
      gitRef: "h1-17-ad-studio",
    }),
    false,
  );
  assert.equal(
    resolveAdStudioEnabled({
      serverValue: "true",
      gitRef: "main",
    }),
    true,
  );
});

test("server values take precedence over public values", () => {
  assert.equal(
    resolveAdStudioEnabled({
      serverValue: "off",
      publicValue: "true",
      gitRef: "h1-17-ad-studio",
    }),
    false,
  );
});

test("accepted true and false aliases are parsed safely", () => {
  for (const value of ["1", "true", "yes", "on"]) {
    assert.equal(resolveAdStudioEnabled({ serverValue: value }), true);
  }

  for (const value of ["0", "false", "no", "off"]) {
    assert.equal(resolveAdStudioEnabled({ serverValue: value }), false);
  }
});
