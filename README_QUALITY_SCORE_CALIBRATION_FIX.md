# VIP Quality Score Calibration Fix

## Problem

Initial generated assets were receiving abnormally low quality scores.

That made the system feel too guarded and pushed too much content into unnecessary regeneration.

## Why It Happened

There were three likely causes:

### 1. The scorer was judging all asset types too similarly

A LinkedIn post, Facebook post, email, video script, and blog post should not be judged against the same length/structure expectations.

Short-form content was being treated too much like long-form content.

### 2. Thresholds were too strict for pre-review generated assets

The previous defaults were closer to final approval thresholds.

But this stage is not final publishing approval. It is a pre-review quality check.

### 3. The fallback heuristic was too punitive

If OpenAI quality scoring failed or was unavailable, the fallback heuristic could produce conservative/low scores.

That fallback should be diagnostic, not a reason to aggressively regenerate good-enough content.

## What This Fix Does

Replaces:

```text
src/lib/content-quality/auto-quality-gate.ts
```

Improvements:

```text
asset-type-specific scoring expectations
asset-type-specific thresholds
social posts are judged as social posts
blogs are judged as blogs
short-form content is not punished for being short
fallback heuristic is calibrated higher
regeneration is reserved for real quality failures
```

## New Default Thresholds

General:

```text
overall: 74
brandVoice: 70
clarity: 72
cta: 68
seoAio: 64
conversion: 68
```

Social posts:

```text
overall: 72
brandVoice: 68
clarity: 70
cta: 64
seoAio: 58
conversion: 64
```

Blog posts:

```text
overall: 76
brandVoice: 72
clarity: 74
cta: 68
seoAio: 70
conversion: 68
```

These can still be overridden with environment variables.

## Important Philosophy

This does not remove quality control.

It changes the quality gate from:

```text
block too much
```

to:

```text
catch true problems and let good-enough content reach human review
```

That is the right direction if the guardrails eventually need to come off.

## No SQL Required

This only changes scoring behavior.

## Apply

1. Replace the file.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Calibrate quality scoring for generated assets
```

## Test

1. Generate a clean month.
2. Run bulk/automatic quality review.
3. Confirm scores are no longer abnormally low across the board.
4. Confirm social posts are not punished for being short.
5. Confirm weak assets still regenerate when genuinely low quality.
