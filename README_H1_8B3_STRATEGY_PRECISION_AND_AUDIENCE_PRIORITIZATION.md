# Marketing VIP H1.8B3 — Strategy Precision and Audience Prioritization

## Purpose

H1.8B3 improves the content inside the existing one-off Marketing Spine review boxes. It does not add form fields, change the approval sequence, create a database migration, or alter approved assets.

The workflow remains:

1. Complete the existing one-off campaign brief.
2. Generate the Marketing Spine preview.
3. Review and edit the strategy.
4. Approve the strategy and create the campaign.
5. Generate content assets from the approved strategy.

## Problems corrected

### Audience-list dumping

The H1.8A intelligence layer previously combined the campaign audience, buyer segment, selected buyer records, Brand Voice audience, and profile audience into one pipe-delimited source. The strategy model could then reproduce that full list in the Target Audience box.

H1.8B3 now:

- Selects one relevant buyer segment instead of two.
- Prioritizes one audience source rather than concatenating all audience sources.
- Converts broad contractor/trade lists into one buyer category.
- Requires a primary decision-maker and business context.
- Limits examples to no more than two when examples are genuinely useful.

### Weak Buyer Situation

The Buyer Situation box must now describe a moment in time:

- What is happening.
- What the buyer is doing now.
- What is no longer working.
- Why the issue is becoming important now.

Campaign notes are treated as a buyer moment only when they actually contain moment or trigger language. Otherwise, VIP builds the moment from the most relevant buyer pain and campaign idea.

### Repetition across strategy boxes

H1.8B3 checks for excessive overlap between:

- Target Audience and Buyer Situation.
- Buyer Situation and Core Problem.
- Core Problem and Business Consequence.
- Campaign Point of View and Offer Explanation.
- Offer Explanation and Offer Deliverables.

The generator is instructed to rewrite overlapping sections before the strategy is shown.

## Two-stage internal quality process

The user still clicks Generate Campaign Strategy once.

Internally, VIP now:

1. Generates the initial Marketing Spine.
2. Runs a deterministic precision diagnostic.
3. Calls a focused strategy editor only when the draft fails audience, buyer-moment, generic-language, or cross-section checks.
4. Applies deterministic final safeguards even if the optional precision rewrite times out or fails.

This conditional second pass avoids charging for an additional call when the initial strategy already meets the quality standard.

## Deterministic safeguards

Even when OpenAI is unavailable or the second pass fails, VIP prevents the most damaging output patterns:

- Long audience rosters are collapsed into one primary buyer category.
- One-word audience labels are expanded into decision-maker language.
- Weak Buyer Situations are converted into a trigger-based scenario.
- Generic short objectives are connected to the problem and CTA.
- Duplicate Core Problem and Business Consequence fields are separated.
- Generic Point of View language is replaced with the verified point of view when available.
- Duplicate Offer Explanation and Deliverables fields use verified deliverable details when available.

No proof, result, statistic, testimonial, guarantee, or deliverable is invented.

## Files included

- `src/lib/content-generation/campaign-intelligence.ts`
- `src/lib/content-generation/one-off-strategy-precision.ts`
- `src/lib/ai/one-off-strategy-generator.ts`
- `src/app/api/campaigns/strategy-preview/route.ts`
- `README_H1_8B3_STRATEGY_PRECISION_AND_AUDIENCE_PRIORITIZATION.md`

## Installation

1. Back up or commit the current repository state.
2. Unzip the H1.8B3 patch directly into the repository root.
3. Choose **Replace** when Windows asks about existing files.
4. Do not run anything in Supabase.
5. Review the changed files in GitHub Desktop.
6. Commit and push.
7. Confirm the Vercel deployment succeeds.

Suggested commit message:

```text
H1.8B3 improve one-off strategy precision
```

## Environment and database changes

- No database migration.
- No new tables or columns.
- No required environment variables.
- No new user form fields.
- No change to the existing strategy approval order.

The strategy preview function now allows up to 60 seconds so the conditional precision editor has enough room when it is needed. The existing `VIP_STRATEGY_OPENAI_TIMEOUT_MS` setting still controls each individual OpenAI request.

## Recommended test

Use the same contractor campaign that exposed the issue.

Confirm:

1. Target Audience contains one primary buyer category rather than the complete contractor list.
2. Target Audience identifies the person making the decision, not only the industry.
3. Buyer Situation describes a recognizable moment and does not repeat Target Audience.
4. Core Problem explains the underlying obstacle.
5. Business Consequence explains what continuing the problem costs or prevents.
6. Campaign Point of View is not generic marketing language.
7. Offer Explanation describes how the offer works.
8. Offer Deliverables separately state what the buyer receives.
9. No raw Brand Voice list, Account Strategy list, pipe-delimited source, or internal field label appears.
10. Editing and approving the strategy still creates the campaign only after approval.

## Validation performed

- Current GitHub source hashes were matched before modification.
- TypeScript syntax transpilation passed for all changed files.
- Strict standalone TypeScript validation passed for the strategy precision module.
- Strict standalone TypeScript validation passed for the strategy generator.
- Strict standalone TypeScript validation passed for the campaign intelligence module.
- Audience-list detection test passed.
- Contractor audience prioritization test passed.
- Buyer-moment rewrite test passed.
- Cross-section duplication detection test passed.
- Deterministic fallback separation test passed.
- Good-strategy false-positive test passed.

A complete repository build requires installed project dependencies and should be confirmed by Vercel after the patch is pushed.
