# H1.6C6 — Audience Perspective Lock for Human Content Generation

## Problem fixed

Generated blog and social content was improving, but it was still written from the wrong perspective.

Example failure:

- The target audience was dental practice owners.
- The generated blog sounded like advice to a marketer about a dental campaign.
- The copy used phrases like “this week’s campaign,” “a useful article should,” “the reader,” “the buyer,” and “generic messaging.”

That means the AI was still treating the campaign brief as the subject of the content instead of using it as private guidance.

## What this patch adds

This patch adds an Audience Perspective Lock across the main content generation paths.

### New helper

`src/lib/content-generation/audience-perspective.ts`

This helper converts broad audience labels into a more realistic final reader persona.

Examples:

- `Dental Practices` → `dental practice owners`
- `Contractors` → `contractors and trade business owners`
- `Healthcare` → `healthcare business leaders`

It also provides everyday concerns and safe example situations the content engine can use without inventing fake claims.

## Files changed

- `src/lib/content-generation/audience-perspective.ts`
- `src/lib/content-generation/publish-ready-weekly-generator.ts`
- `src/lib/content-generation/content-sanity.ts`
- `src/lib/content-calendar/monthly-campaign-planner.ts`
- `src/lib/content-calendar/asset-generation.ts`
- `src/lib/ai/prompt-doctrine.ts`

## Behavior changes

### Monthly campaign generation

The AI now receives explicit instructions to write for the final buyer, owner, operator, or decision-maker instead of writing about the campaign.

For a dental practice campaign, the content should now speak to the dental practice owner, managing dentist, or office manager responsible for visibility and new patient opportunities.

### Blog posts

Blogs should now avoid meta-marketing language like:

- “This week’s campaign helps...”
- “A useful article should...”
- “The reader needs to understand...”
- “Generic messaging falls flat...”
- “Content about X has to...”

The copy should instead explain the issue in plain language from the audience’s point of view.

### Social posts

Social posts should stop sounding like a campaign strategist wrote them. They should speak directly to the business owner/operator audience with everyday sentences and clearer next-step logic.

### Sanity checks

The publish-ready sanity gate now catches marketer-perspective leaks and sends the asset through repair before saving.

New blocked patterns include:

- “this week’s campaign”
- “this campaign helps”
- “this article should”
- “a useful article should”
- “the content should”
- “the reader needs to understand”
- “generic messaging”
- “generic content”

## SQL required

No SQL required.

## Testing notes

After applying this patch, regenerate a fresh monthly campaign package. Existing generated assets will not automatically change unless regenerated or manually edited.

A good dental-practice blog should now sound closer to:

> Most dental practice owners do not have extra time to chase every new marketing trend. They need to know why the practice is not showing up when patients are searching, what matters now, and what can wait.

Instead of:

> This week’s campaign helps dental Practices understand AI Optimization...
