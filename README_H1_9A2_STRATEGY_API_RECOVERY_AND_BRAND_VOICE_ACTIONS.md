# Marketing VIP H1.9A2 — Strategy API Recovery and Brand Voice Actions

## Install this over

H1.9A1 Strategy Gate Diagnostics.

Do not install H1.8B5 separately. H1.9 and later already include campaign-offer authority.

## Why this release exists

The H1.9A1 diagnostic showed:

- failure stage: Semantic planning
- request status: API error
- completed AI stages: none
- editorial review: not reached

That proves the reported attempt was not blocked because of weak or acceptable strategy copy. The first OpenAI request failed before Marketing VIP created a private semantic plan.

This release also fixes a separate Brand Voice translation issue: a saved offer such as `Free Consultation` must be available in the one-off campaign builder and must populate the authoritative campaign offer rather than remaining isolated inside Brand Voice.

## Strategy API recovery

H1.9A2 changes strategy-model handling so the strategy subsystem no longer inherits the application-wide `OPENAI_MODEL` value.

The global model may be configured for another workflow or endpoint. Strategy generation now uses only these dedicated overrides:

- `OPENAI_STRATEGY_PLANNING_MODEL`
- `OPENAI_STRATEGY_MODEL`
- `OPENAI_STRATEGY_QUALITY_MODEL`

When no dedicated override is supplied, each stage tries:

1. `gpt-4.1`
2. `gpt-4.1-mini` when the first model is unavailable or incompatible

The retry is limited to model/access/endpoint compatibility errors. Authentication, billing, quota, and general server errors are not hidden by repeated retries.

## Improved safe diagnostics

When OpenAI still rejects a request, the diagnostic panel can now show:

- HTTP status
- safe OpenAI error code
- models attempted
- whether a compatible fallback was attempted
- OpenAI request ID

It does not expose the API key, prompts, raw account memory, or the complete API error body.

Common results:

- `HTTP 401`: production API key is missing, invalid, revoked, or belongs to the wrong project
- `HTTP 403` or `404` with a model code: model access/configuration issue; compatible fallback is attempted automatically
- `HTTP 429`: rate, quota, or billing limit
- `HTTP 5xx`: temporary OpenAI service error

## Brand Voice action translation

`Free Consultation` saved in Brand Voice Offer Summary now:

- remains available in **Offer from Brand Voice**
- populates **Campaign Offer / Desired Conversion** when selected
- suggests **Schedule a Free Consultation** when the CTA field is empty
- can also appear in the Brand Voice CTA shortcut list
- is no longer likely to disappear because the Brand Voice option list was capped too aggressively

The same behavior applies to recognizable demos, audits, webinars, guides, trials, quotes, and estimates.

Selecting a Brand Voice CTA while Campaign Offer is empty also derives the corresponding offer name.

## Installation

1. Back up or commit the current local repository.
2. Unzip the patch directly into the local VIP repository root.
3. Choose **Replace** for existing files.
4. Do not run a Supabase migration.
5. Commit and push through GitHub Desktop.

Suggested commit message:

```text
H1.9A2 recover strategy API calls and sync Brand Voice actions
```

## Test after deployment

### Brand Voice test

1. Confirm `Free Consultation` is saved in Brand Voice Offer Summary.
2. Open Campaigns.
3. Under Brand Voice shortcuts, select `Free Consultation` from **Offer from Brand Voice**.
4. Confirm:
   - Campaign Offer / Desired Conversion becomes `Free Consultation`
   - CTA becomes `Schedule a Free Consultation` when it was empty

### Strategy test

1. Complete the campaign brief.
2. Generate the Marketing Spine.
3. A successful run should move through semantic planning, strategy writing, and editorial review.
4. If it fails, copy the new diagnostic details, especially HTTP status, error code, models attempted, and request ID.

## Validation completed

- 18 strategy-engine regression tests passed
- full TypeScript check passed
- Marketing VIP Demo versus Website Audit authority test passed
- exact malformed fallback-copy rejection passed
- narrative fallback remains disabled
- dedicated strategy model resolution test passed
- compatible-model fallback test passed
- safe OpenAI error parsing test passed
- `Free Consultation` Brand Voice offer test passed
- `Schedule a Free Consultation` CTA test passed
- Next.js production compilation completed successfully

The local Next.js build reached `Running TypeScript` after successful compilation but did not exit before the isolated runtime limit. The standalone full-project TypeScript check passed with no errors.

## Database and environment impact

- no database migration
- no Supabase change
- no required new environment variable
- existing dedicated strategy-model variables remain supported
- `OPENAI_API_KEY` is still required
