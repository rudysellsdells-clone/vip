# Sprint 5.7 Clone Memory Campaign Generation

## Goal

Plug the Sprint 5.6 digital clone memory into campaign generation.

## Why This Sprint

Sprint 5.6 added editable memory:

- digital clone profile
- brand rules
- knowledge sources
- content examples
- service lines
- buyer segments
- offers

Sprint 5.7 makes campaign generation use that memory.

## What This Adds

### 1. Asset Pack Types

Adds:

```text
src/lib/ai/asset-pack-types.ts
```

This defines the structured Marketing Asset Pack and maps it to `generated_assets`.

### 2. Prompt Upgrade

Updates:

```text
src/lib/ai/prompts.ts
```

The campaign prompt now accepts:

```ts
digitalCloneMemoryContext
```

and includes Rudy's formatted memory in the campaign generation prompt.

### 3. Asset Pack Generator

Adds:

```text
src/lib/ai/asset-pack-generator.ts
```

This generator:

1. Builds the system prompt
2. Builds the user prompt
3. Calls OpenAI if `OPENAI_API_KEY` exists
4. Falls back to a deterministic asset pack if OpenAI is unavailable
5. Returns a structured asset pack

### 4. Campaign Generate Route

Updates:

```text
src/app/api/campaigns/[campaignId]/generate/route.ts
```

The route now:

1. Loads the campaign
2. Loads digital clone context
3. Generates the Marketing Asset Pack using clone memory
4. Saves every asset to `generated_assets`
5. Saves a clone memory snapshot to each asset
6. Saves clone memory context into campaign strategy metadata
7. Logs the generation event

## No Database Migration Needed

This sprint uses existing tables:

```text
digital_clone_profiles
brand_rules
knowledge_sources
content_examples
service_lines
buyer_segments
offers
campaigns
generated_assets
activity_log
```

## Required Environment Variable

Recommended:

```bash
OPENAI_API_KEY=
```

Optional:

```bash
OPENAI_MODEL=gpt-4o-mini
```

If `OPENAI_API_KEY` is missing, the route still works using a deterministic fallback asset pack.

## Apply

1. Copy files into repo.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Use digital clone memory in campaign generation
```

## Test

1. Go to `/brand-voice`.
2. Add or update clone profile details.
3. Add at least one brand rule.
4. Go to `/knowledge`.
5. Add at least one knowledge source and one content example.
6. Create a new campaign.
7. Generate the asset pack.
8. Confirm assets are saved.
9. Open Supabase `generated_assets`.
10. Confirm each new asset metadata includes:

```text
cloneMemoryUsed = true
cloneMemorySnapshot
```

11. Open Supabase `campaigns.strategy`.
12. Confirm it includes:

```text
cloneMemorySnapshot
```

## Success Criteria

Sprint 5.7 is complete when new campaign assets are generated using Rudy's saved clone memory and each asset stores a memory snapshot for auditing.
