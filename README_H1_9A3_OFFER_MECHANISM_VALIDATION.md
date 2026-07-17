# Marketing VIP H1.9A3 — Offer Mechanism Validation

## Purpose

H1.9A3 fixes the specific strategy-generation failure reported after H1.9A2:

- Stage: Semantic planning repair
- Request status: completed
- Remaining blocker: `offerMechanism must explain what the resolved offer actually does during the buyer's next step.`

The OpenAI requests completed successfully. The failure came from a deterministic validator that recognized only a narrow list of mechanism verbs. Natural consultation language such as "discuss the situation," "ask questions," "clarify priorities," or "determine fit" could therefore be rejected even after a successful planning repair.

## What changed

### One shared offer-mechanism standard

Planning and final strategy validation now use the same category-aware mechanism rules.

Supported offer categories include:

- Demo
- Audit
- Consultation
- Webinar
- Guide
- Trial
- Product
- Service
- Informational campaigns

### Free Consultation behavior

A Free Consultation mechanism can now correctly explain that the buyer will:

- Discuss the current situation
- Ask questions
- Clarify priorities
- Explore options
- Determine whether a practical next step fits

The validator still rejects vague language such as:

> The Free Consultation is available to interested owners who want more information.

### Prompt alignment

The semantic-planning, planning-repair, strategy-writing, strategy-repair, and editorial-review prompts now receive the same category-specific mechanism standard. The model is therefore told what a valid mechanism looks like before the validator evaluates it.

### Offer-reference improvement

The mechanism must still reference the resolved promoted offer. Generic words such as "free" or "marketing" are no longer sufficient by themselves; the offer name, category, or a meaningful offer-specific term must be present.

## Installation

1. Confirm H1.9A2 is already installed.
2. Extract this ZIP directly into the local VIP repository root.
3. Choose **Replace** when prompted.
4. Do not run a Supabase migration.
5. Commit and push the changes.

Suggested commit message:

```text
H1.9A3 add category-aware offer mechanism validation
```

## Test after deployment

Generate the same campaign again.

For a Free Consultation, a valid private mechanism may describe a focused conversation where the buyer discusses the current situation, asks questions, clarifies priorities, and determines whether the next step fits.

The generation should proceed beyond Semantic planning repair. If another block occurs, the existing H1.9A1 diagnostics will identify the next exact stage and issue.

## Files changed

- `src/lib/content-generation/strategy-engine-v2/offer-mechanism.ts` — new shared category-aware mechanism logic
- `src/lib/content-generation/strategy-engine-v2/semantic-plan.ts`
- `src/lib/content-generation/strategy-engine-v2/strategy-validator.ts`
- `src/lib/content-generation/strategy-engine-v2/prompts.ts`
- `src/lib/content-generation/strategy-engine-v2/types.ts`
- `tests/strategy-engine-v2.test.ts`

## Validation completed

- 21 strategy-engine regression tests passed
- Free Consultation semantic mechanism passed
- Free Consultation final Offer Explanation passed
- Vague consultation language remained blocked
- Existing Marketing VIP Demo mechanism passed
- Existing offer-authority, proof, deliverable, malformed-copy, and API-recovery tests passed
- Full TypeScript check passed
- Next.js production compilation and TypeScript phases passed locally

The isolated local build process did not finish page-data collection before the runtime limit, so the Vercel deployment remains the final complete production-build confirmation.

## Database and environment impact

- No database migration
- No new environment variable
- No form changes
- No change to approved campaign storage
