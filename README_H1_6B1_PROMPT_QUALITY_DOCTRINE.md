# H1.6B1 — Prompt Quality Doctrine / Generation Prompt Upgrade

This patch adds a shared prompt doctrine and wires it into VIP's main generation prompts.

## Goal

Raise output quality without adding new UI, SQL, API calls, or workflow friction.

The doctrine reinforces the same chain Rudy wants VIP to protect:

**Brand → Strategy → Channels → Content Plan → Asset Briefs → Assets → Quality → Publishing**

## What this adds

### New file

`src/lib/ai/prompt-doctrine.ts`

This file centralizes reusable prompt standards for:

- source hierarchy
- strategy inheritance
- evidence integrity
- originality
- anti-generic writing
- channel-specific standards
- final self-check
- visual prompt quality
- video prompt quality

## What this updates

### One-off campaign generation

`src/lib/ai/prompts.ts`

The one-off asset pack now uses the doctrine for:

- stronger first drafts
- better source hierarchy
- originality rules
- evidence integrity
- channel standards
- pre-review enrichment

### Monthly publish-ready generation

`src/lib/content-generation/publish-ready-weekly-generator.ts`

The monthly generator now receives the doctrine plus asset brief and channel role context from the Marketing Spine metadata.

### Monthly planner

`src/lib/content-calendar/monthly-campaign-planner.ts`

The private generation prompt now includes the doctrine. Deterministic fallback content was also cleaned up so it does not print internal labels like `Strategic spine:` in public copy.

### Visual prompts

- `src/lib/visual-assets/prompt-builder.ts`
- `src/lib/galaxyai/prompt-builder.ts`
- `src/lib/galaxyai/image-prompt-builder.ts`

Visual and video prompts now include clearer artifact control, originality, evidence, and channel rules.

## What this does not do

- No SQL.
- No database changes.
- No UI changes.
- No new OpenAI calls.
- No publishing changes.
- No security changes.

## Apply order

Apply after the H1.6A spine patches and the one-off campaign fixes.

## Test checklist

1. Generate a one-off campaign asset pack.
2. Confirm the outputs are more specific and less generic.
3. Generate monthly content from a locked Marketing Spine.
4. Confirm the outputs inherit audience, offer, CTA, proof, objection, and originality angle.
5. Generate a visual asset.
6. Confirm the image prompt is more specific and avoids generic stock-art direction.
7. Run Quality Review as usual.

## Commit message

`H1.6B1 Prompt Quality Doctrine generation upgrade`
