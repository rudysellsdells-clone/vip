# VIP Sprint 2.23 — Memory-Backed Publish-Ready Generation

## Goal

Fix the real generation problem upstream.

The issue was not primarily quality scoring. The monthly asset generator was too template-driven and could turn strategy fields into weak sentences instead of writing real content from saved business context.

## What This Patch Changes

### 1. Adds a memory context builder

```text
src/lib/content-generation/memory-context.ts
```

It defensively gathers context from available memory-style tables:

```text
brand_voice
brand_voice_profiles
knowledge_entries
knowledge
business_knowledge
settings
app_settings
```

Missing tables do not crash generation. They become warnings.

### 2. Adds publish-ready content sanity checks

```text
src/lib/content-generation/content-sanity.ts
```

It blocks obviously bad public content before saving, including:

```text
incomplete sentences
raw strategy labels
internal campaign/week labels
placeholder wording
unsupported guarantee/ranking claims
missing emoji/hashtags on social posts
content that is too thin for the asset type
```

### 3. Adds a memory-backed weekly asset generator

```text
src/lib/content-generation/publish-ready-weekly-generator.ts
```

It makes one model call per campaign week to generate the full weekly package:

```text
1 blog
5 LinkedIn posts
5 Facebook posts
1 email
1 video script
```

It uses:

```text
saved memory as source of truth
monthly strategy as campaign angle
asset type as format
sanity repair before saving
```

### 4. Replaces the monthly generation route

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
```

Generation now creates model-backed, memory-aware, publish-ready assets instead of relying on scaffolded template text.

## Source of Truth Rule

```text
Saved Brand Voice / Knowledge / Business Facts = source of truth
Monthly strategy = campaign angle
Asset type = format
Quality review = safety check
```

## Important Behavior

By default, generation requires enough memory context.

If the system cannot find useful saved memory, it returns:

```text
Not enough saved Brand Voice / Knowledge / Business Facts were found...
```

This is intentional. It is better to stop than save nonsense.

## Files Included

```text
src/lib/content-generation/memory-context.ts
src/lib/content-generation/content-sanity.ts
src/lib/content-generation/publish-ready-weekly-generator.ts
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
README_MEMORY_BACKED_PUBLISH_READY_GENERATION.md
```

## No SQL Required

This reads existing memory tables defensively.

## Environment Required

Publish-ready generation requires:

```text
OPENAI_API_KEY
```

Optional:

```text
OPENAI_MODEL
```

Default model fallback is:

```text
gpt-4.1-mini
```

## Apply

1. Add the three new helper files.
2. Replace the monthly generation route.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add memory-backed publish-ready generation
```

## Test

1. Confirm Brand Voice and Knowledge pages have useful context.
2. Reset a test month.
3. Generate a new monthly campaign package.
4. Open week 1 LinkedIn posts.
5. Confirm:
   - content sounds human
   - content is complete
   - content reflects business facts
   - content does not simply restate strategy fields
   - content does not expose campaign/week labels
   - social posts include emoji and hashtags
   - blogs and emails are much closer to publish-ready
6. Then run quality review as the safety check.
