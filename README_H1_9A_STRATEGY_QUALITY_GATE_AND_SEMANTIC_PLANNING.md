# Marketing VIP H1.9A — Strategy Quality Gate and Semantic Planning

## Purpose

H1.9A corrects the remaining one-off Marketing Spine quality problem in H1.9.

H1.9 successfully resolved campaign authority, but its deterministic narrative fallback could still assemble campaign fragments into polished-looking sentences that were grammatically or strategically wrong. Examples included:

- `fragmented execution is limiting progress`
- `trying to easy marketing that works for them`
- `the workaround may keep activity moving`
- `the buyer's decisions and day-to-day actions`
- `desired business outcome`
- `evaluating Demo`

Those passages came from the fallback path, not from strong campaign reasoning.

H1.9A removes that path from visible strategy generation.

## New generation flow

```text
Canonical Campaign Brief
        ↓
Private Semantic Plan
        ↓
Semantic Plan Validation
        ↓
Thirteen-Field Strategy Draft
        ↓
Deterministic Whole-Spine Validation
        ↓
Independent Full Editorial Rewrite / Review
        ↓
Final Validation
        ↓
Display for Human Approval
```

A strategy is displayed only after every stage passes.

## What changed

### 1. Narrative fallbacks are disabled

VIP no longer substitutes hard-coded strategy prose when:

- OpenAI is unavailable
- the semantic plan fails
- the draft strategy fails validation
- the final editorial review does not approve the result

Instead, the preview endpoint returns a retryable quality-gate message. No campaign or preview is saved, and the form inputs remain intact.

### 2. A private semantic plan is created first

Before writing the visible strategy fields, VIP resolves nine campaign-specific reasoning concepts:

- buyer trigger
- current workaround
- customer-side root cause
- business consequence
- campaign belief
- offer mechanism
- desired decision
- primary objection
- objection response

This step converts shorthand and form fragments into complete marketing meaning before prose is written.

### 3. The exact H1.9 fallback language is prohibited

The semantic planner, strategy writer, deterministic validator, and final editorial reviewer now reject the recurring fallback structures and awkward phrase combinations.

The exact contractor output reported during testing is included as a permanent regression fixture.

### 4. Final review judges meaning, not keyword presence

The independent editorial review evaluates whether:

- every sentence makes sense when read aloud
- the buyer situation is believable
- the core problem is customer-centered and specific
- the consequence follows from the problem
- the point of view is useful and distinctive
- the offer solves the stated problem
- the CTA is the natural next step
- no field sounds like form values were inserted into a template

The reviewer returns a complete rewritten strategy. It can approve only the rewritten result, not the original draft.

### 5. Offer-conflict blocking is more precise

H1.9 broadly blocked generic words such as `review` and `report` when a Website Audit had been excluded. H1.9A blocks only unmistakable conflicting-offer terms such as `audit`, `assessment`, `diagnostic`, and the rejected offer name.

This prevents ordinary sentences from failing offer-authority validation while still keeping the Website Audit out of a Marketing VIP Demo campaign.

## User-visible behavior

A successful strategy preview now shows:

- `Quality-approved AI draft`
- semantic plan status
- whether planning repair was required
- editorial quality-review status
- resolved offer authority
- excluded conflicting offers

When generation does not meet the quality standard, the user sees:

> Marketing VIP did not produce a strategy that met the quality standard. No preview was created. Please retry the generation; the campaign inputs remain unchanged.

No low-quality fallback strategy is displayed.

## OpenAI calls

The normal strategy-preview path uses three model calls:

1. semantic planning
2. strategy writing
3. independent editorial review and complete rewrite

A fourth call occurs only when the private semantic plan fails validation and requires repair.

Default model resolution:

- planning: `OPENAI_STRATEGY_PLANNING_MODEL`, then quality/strategy/general model, then `gpt-4.1`
- writing: `OPENAI_STRATEGY_MODEL`, then general model, then `gpt-4.1`
- review: `OPENAI_STRATEGY_QUALITY_MODEL`, then strategy/general model, then `gpt-4.1`

The default per-request timeout is 14 seconds to keep the multi-stage workflow within the existing preview-route execution budget.

## Installation

1. Unzip the H1.9A ZIP directly into the local `vip` repository root.
2. Choose **Replace** when prompted.
3. Do not run any Supabase SQL.
4. Commit and push through GitHub Desktop.
5. Allow Vercel to deploy.
6. Generate a fresh Marketing Spine using the same contractor campaign.

Suggested commit message:

```text
H1.9A add semantic planning and block low-quality strategy fallbacks
```

## Database impact

None.

- No migration
- No new table
- No new column
- No Supabase action
- Existing approved strategies remain readable

## Validation completed

- 14 strategy-engine regression tests passed
- exact reported broken output rejected
- natural contractor strategy accepted with zero validation issues
- semantic-plan validation passed
- stitched-fragment semantic plan rejected
- Marketing VIP Demo versus Website Audit authority test passed
- invented deliverable test passed
- unsupported proof test passed
- all 13 field contracts remain present
- full project TypeScript check passed
- Next.js 16.2.10 production build passed
- all 86 static pages generated
- route finalization passed

## Files included

- `.env.example`
- `.env.sprint4.example`
- `README_H1_9A_STRATEGY_QUALITY_GATE_AND_SEMANTIC_PLANNING.md`
- `src/app/api/campaigns/strategy-preview/route.ts`
- `src/components/campaigns/CampaignWebsiteForm.tsx`
- `src/lib/ai/one-off-strategy-generator.ts`
- `src/lib/content-generation/strategy-engine-v2/errors.ts`
- `src/lib/content-generation/strategy-engine-v2/prompts.ts`
- `src/lib/content-generation/strategy-engine-v2/semantic-plan.ts`
- `src/lib/content-generation/strategy-engine-v2/source-authority.ts`
- `src/lib/content-generation/strategy-engine-v2/strategy-fallbacks.ts`
- `src/lib/content-generation/strategy-engine-v2/strategy-validator.ts`
- `src/lib/content-generation/strategy-engine-v2/types.ts`
- `tests/strategy-engine-v2.test.ts`
