# VIP What-If Success Story MVP

## Goal

Add a dedicated Phase Two generator for personalized prospect-facing What-If Success Stories.

This is a sales asset designed to help prospects visualize what could be possible with Web Search Pros, without pretending the scenario already happened.

## What This Adds

### New page

```text
/what-if-stories
```

### New helper

```text
src/lib/what-if-stories/generator.ts
```

### New API route

```text
src/app/api/what-if-stories/generate/route.ts
```

### New component

```text
src/components/what-if-stories/WhatIfStoryGeneratorForm.tsx
```

### Navigation update

```text
Growth → What-If Stories
```

## Workflow

```text
Enter prospect details
→ Enter pain point / opportunity
→ Choose offer focus, tone, CTA
→ Generate What-If Story
→ Asset is saved as prospect_what_if_story
→ Status is needs_review
→ Review/revise/approve in /approvals
```

## Guardrails

The generated story is instructed to clearly label itself as:

```text
a strategic what-if scenario, not a completed case study or promised result
```

It must not invent:

```text
fake results
fake revenue
fake rankings
fake testimonials
fake client proof
guaranteed outcomes
```

## Required Environment Variable

Uses the existing OpenAI key:

```bash
OPENAI_API_KEY=
```

Optional:

```bash
OPENAI_MODEL=gpt-4.1-mini
```

## No SQL Required

This MVP uses the existing `generated_assets` table.

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add What-If Success Story MVP
```

## Test

1. Open `/what-if-stories`.
2. Enter a business name and a few details.
3. Click **Generate What-If Story**.
4. Open the generated story.
5. Confirm it appears in `/approvals`.
6. Review/revise/approve as usual.

## Next Step

Connect this directly to the Prospects page:

```text
Prospect detail → Generate What-If Story
```

Then add:

```text
Create Gmail draft from approved What-If Story
```
