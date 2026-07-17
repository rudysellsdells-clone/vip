# Marketing VIP H1.9A1 — Strategy Gate Diagnostics

## Purpose

H1.9A1 is an observability release for the one-off campaign strategy gate.
It does **not** loosen or tighten the current strategy quality standards.

The previous UI returned the same generic message for several different conditions:

- OpenAI request timeout
- OpenAI/API failure
- Invalid or incomplete JSON
- Semantic-plan validation failure
- Semantic-plan repair failure
- Strategy-writing failure
- Editorial reviewer rejection
- Final deterministic validation failure
- Advisory warnings that remained after review

H1.9A1 identifies which condition actually occurred so the next correction can be based on evidence.

## What the failure panel now shows

A failed strategy attempt displays:

- Exact failure stage
- Request status
- Stages that completed successfully
- Whether the editorial review was reached
- Editorial approval decision
- Blocking findings
- Editorial findings
- Advisory findings
- Whether retrying is appropriate

The panel exposes only safe, concise diagnostic summaries. It does not expose prompts, API responses, private source material, account memory, or raw Brand Voice content.

## Quality behavior remains unchanged

H1.9A1 does not change:

- Semantic-plan rules
- Strategy field contracts
- Critical versus warning classifications
- Editorial-review instructions
- Final blocking conditions
- Campaign creation or approval workflow
- Offer-authority rules
- Asset generation

A low-quality strategy remains blocked. A strategy that the current gate considers acceptable remains eligible for preview.

## Additional safety improvement

When a regeneration attempt fails, the previous unapproved preview is cleared. This prevents an older strategy from remaining visible beneath a message stating that no new preview was created.

## Installation

1. Confirm H1.9A is already installed.
2. Unzip this patch directly into the local VIP repository root.
3. Choose **Replace** when prompted.
4. Do not run anything in Supabase.
5. Commit and push through GitHub Desktop.

Suggested commit message:

```text
H1.9A1 expose strategy quality gate diagnostics
```

## Test procedure

1. Wait for Vercel to deploy the commit.
2. Open the same one-off contractor campaign brief.
3. Generate the Marketing Spine once.
4. If it is blocked, copy or screenshot the complete **Strategy generation diagnostic** panel.
5. Include the stage, request status, blocking findings, editorial findings, and advisory findings.

The result will tell us whether the next release should address model/API reliability, semantic planning, editorial behavior, deterministic validation, or warning severity.

## Validation completed

- 15 strategy-engine regression tests passed
- Strategy diagnostic error payload test passed
- Existing malformed-copy rejection tests passed
- Existing offer-authority tests passed
- Existing proof and deliverable protections passed
- Full TypeScript check passed
- No database migration required
- No new environment variables required

A local production build did not finish within the isolated environment's execution window and produced no compile error before timeout. Vercel should be used for final production-build verification.
