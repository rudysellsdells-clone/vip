# H1.6C7 — Campaign Idea Depth Lock

## Purpose

This patch makes first-version generated content more specific around the actual campaign idea before the user has to request a stronger V2.

The immediate problem was that an AI audit campaign for dental practice owners produced a cleaner but still too-generic blog post. It spoke to the right audience more than before, but it did not explain enough about the actual audit: what it reviews, why a dental practice owner would need it, and what the owner should understand after the consultation.

## What changed

### 1. New campaign detail engine

Added:

```text
src/lib/content-generation/campaign-detail.ts
```

This module detects campaign patterns such as:

- AI audit
- AI optimization
- visibility audit
- review consultation
- marketing audit
- search visibility assessment

It then builds a detailed first-draft mandate for the content generator.

For dental AI audit campaigns, it now gives the model specific areas to write from:

- AI and search visibility
- Google Business Profile and local listings
- website service pages
- reviews and reputation signals
- content and FAQ gaps
- appointment/conversion path

### 2. Stronger V1 prompt instructions

Updated:

```text
src/lib/content-generation/publish-ready-weekly-generator.ts
src/lib/content-calendar/asset-generation.ts
src/lib/content-calendar/monthly-campaign-planner.ts
```

The generator now receives a `Campaign Idea Detail Mandate` that says the first draft must already include the type of detail a reviewer would normally request in V2.

### 3. Stronger fast-draft fallback blog content

If OpenAI is unavailable or fails, the deterministic blog fallback now includes more specific sections such as:

- what the audit should help the reader understand
- the specific things being reviewed
- questions the owner should be able to answer
- what should come out of the audit

### 4. Better audit-specific generation behavior

For audit/review/assessment campaigns, generated content should now explain:

- what is being reviewed
- why each area matters
- what problems the audit can uncover
- what a practical recommendation should look like
- why the CTA is the next logical step

## Files changed

```text
README_H1_6C7_CAMPAIGN_IDEA_DEPTH_LOCK.md
src/lib/content-generation/campaign-detail.ts
src/lib/content-generation/publish-ready-weekly-generator.ts
src/lib/content-calendar/monthly-campaign-planner.ts
src/lib/content-calendar/asset-generation.ts
```

## SQL required

No SQL is required.

## Testing notes

After applying this patch, regenerate a fresh campaign package. Existing generated content will not update automatically.

Suggested test:

- Audience: Dental Practices
- Campaign topic: AI Optimization or AI Audit
- Offer: Complimentary Review Consultation or AI Audit
- CTA: Schedule a consultation / Get your audit / Book the review

Expected improvement:

The V1 blog should no longer only say that AI optimization matters. It should explain what the audit checks and why that matters to a dental practice owner.

