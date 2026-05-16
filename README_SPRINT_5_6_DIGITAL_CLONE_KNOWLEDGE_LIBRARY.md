# Sprint 5.6 Digital Clone Profile and Knowledge Library

## Goal

Make VIP smarter by giving it editable business memory.

## Why This Sprint

VIP already has:

- Campaign generation
- Approvals
- GalaxyAI execution
- Zapier MCP execution
- Gmail draft creation
- Facebook locked publishing
- Execution audit trail
- Command center dashboard

Sprint 5.6 improves output quality by managing:

- Rudy's voice
- Business positioning
- Offers
- Buyer segments
- Brand rules
- Knowledge sources
- Approved content examples

## What This Adds

### 1. Digital Clone Defaults

Adds:

```text
src/lib/clone/defaults.ts
```

Contains default clone profile, brand rules, allowed knowledge source types, and content example types.

### 2. Digital Clone Context Loader

Adds:

```text
src/lib/clone/context.ts
```

This loader gathers:

- digital clone profile
- brand rules
- content examples
- knowledge sources
- service lines
- buyer segments
- offers

It returns a formatted context block that can be used by campaign generation prompts.

### 3. Digital Clone Profile Page

Adds:

```text
/brand-voice
```

File:

```text
src/app/(app)/brand-voice/page.tsx
```

This page lets Rudy edit:

- clone name
- purpose
- voice summary
- business summary
- audience summary
- offer summary
- sales outcome summary
- brand rules

### 4. Knowledge Library Page

Adds:

```text
/knowledge
```

File:

```text
src/app/(app)/knowledge/page.tsx
```

This page lets Rudy add and review:

- knowledge sources
- content examples

### 5. API Routes

Adds:

```text
src/app/api/digital-clone/profile/route.ts
src/app/api/brand-rules/route.ts
src/app/api/knowledge-sources/route.ts
src/app/api/content-examples/route.ts
```

### 6. Components

Adds:

```text
src/components/clone/DigitalCloneProfileForm.tsx
src/components/clone/BrandRuleForm.tsx
src/components/knowledge/KnowledgeSourceForm.tsx
src/components/knowledge/ContentExampleForm.tsx
```

## No Database Migration Needed

This sprint uses existing tables from the project foundation:

```text
digital_clone_profiles
brand_rules
content_examples
knowledge_sources
service_lines
buyer_segments
offers
activity_log
```

## Apply

1. Copy files into repo.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Add digital clone profile and knowledge library
```

## Test

1. Go to `/brand-voice`.
2. Save/update the digital clone profile.
3. Add a brand rule.
4. Go to `/knowledge`.
5. Add a knowledge source.
6. Add a content example.
7. Confirm rows appear in Supabase:
   - `digital_clone_profiles`
   - `brand_rules`
   - `knowledge_sources`
   - `content_examples`
8. Confirm activity records appear in `activity_log`.

## Integration Note

The new context loader is ready for campaign generation:

```ts
import { loadDigitalCloneContext } from "@/lib/clone/context";

const cloneContext = await loadDigitalCloneContext(user.id);
```

Use:

```ts
cloneContext.formattedContext
```

inside campaign generation prompts to make outputs more Rudy-specific.

## Success Criteria

Sprint 5.6 is complete when:

- Rudy can edit his clone profile
- Rudy can add brand rules
- Rudy can add knowledge sources
- Rudy can add content examples
- VIP can load a formatted digital clone context for future campaign generation
