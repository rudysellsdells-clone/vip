# Marketing VIP H1.9A4 — Editorial Release Authority

## Purpose

H1.9A4 corrects the final conflict between Marketing VIP's independent editorial reviewer and its deterministic validators.

The failure that prompted this patch completed all three AI stages and was editorially approved, but the preview was blocked afterward because:

- a complete Core Problem was classified as malformed by a narrow sentence-opening rule; and
- Proof and Support did not contain one of several exact disclaimer phrases.

This patch preserves the quality gate while giving each layer a clear responsibility.

## New release policy

### Independent editorial reviewer

The editorial reviewer owns judgments about:

- whether the strategy is logical and persuasive;
- whether the customer situation, root problem, and consequence make sense;
- whether the point of view is useful;
- whether the writing sounds natural; and
- whether the thirteen fields work as one marketing argument.

### Deterministic release controls

After editorial approval, deterministic code continues to block objective integrity and safety defects:

- missing required fields;
- objectively malformed or stitched language;
- known generic fallback templates;
- internal prompt or source-language leakage;
- substantial source regurgitation;
- audience-list output instead of one decision-maker;
- reintroduction of an excluded offer;
- Offer Explanation describing the wrong offer;
- invented deliverables;
- unsupported proof;
- CTA drift.

Marker-based marketing judgments remain available as advisories after editorial approval rather than repeatedly vetoing the approved strategy.

## Specific corrections

### Complete sentences beginning with “Because”

A Core Problem may legitimately begin with a complete causal sentence such as:

> Because no one owns a repeatable marketing process, campaign planning competes with daily operations for the owner's limited attention.

H1.9A4 no longer treats every sentence beginning with “Because” as an incomplete fragment. Known broken patterns and objectively malformed language remain blocked.

### Proof and Support normalization

When the campaign contains no approved proof, VIP now safely normalizes the field to:

> No approved campaign-specific case study, testimonial, or quantitative performance evidence was supplied. Support the strategy with verified offer facts and clear reasoning, and avoid guarantees or unsupported results claims.

This is a factual planning safeguard. It does not invent proof and does not require another AI retry.

### Editorial issue handling

When the editorial reviewer returns `approved: true`, minor issue notes are treated as advisories. They no longer block a preview by themselves.

When the reviewer returns `approved: false`, the preview is still blocked.

## Installation

1. Install H1.9A4 directly over H1.9A3.
2. Unzip the patch into the local VIP repository root.
3. Choose **Replace** when prompted.
4. Commit and push through GitHub Desktop.
5. Do not run anything in Supabase.
6. No Vercel environment changes are required.

Suggested commit message:

```text
H1.9A4 align editorial approval with deterministic release safety
```

## Recommended test

Regenerate the same contractor campaign that produced the H1.9A3 diagnostic.

Expected behavior:

- semantic planning completes;
- strategy writing completes;
- editorial review completes;
- an editorially approved strategy is displayed unless an objective integrity or safety defect remains;
- Proof and Support uses the transparent no-proof statement when no approved evidence was supplied.

## Validation completed

- 25 strategy-engine regression tests passed.
- A complete Core Problem beginning with “Because” passed malformed-language validation.
- Unsupported proof was replaced with the safe no-proof statement.
- Marker-based semantic findings were classified as release advisories after editorial approval.
- Missing fields, malformed language, unsupported proof, and excluded-offer reintroduction remained blocking.
- Full project TypeScript validation passed.
- Next.js 16.2.10 production compilation passed and entered its TypeScript phase. The isolated build runner did not complete the remaining build stages before its execution limit, so Vercel remains the final full production-build confirmation.

## Files included

- `src/lib/ai/one-off-strategy-generator.ts`
- `src/lib/content-generation/strategy-engine-v2/strategy-release.ts`
- `src/lib/content-generation/strategy-engine-v2/strategy-validator.ts`
- `tests/strategy-engine-v2.test.ts`
