# VIP Memory Gate Soft Warning Fix

## Problem

Monthly generation stopped with:

```text
Not enough saved Brand Voice / Knowledge / Business Facts were found to safely generate publish-ready campaign content.
```

## Truth

The previous patch was too strict.

It was correct to avoid nonsense content, but it should not block generation just because saved memory was not detected perfectly. The system should:

```text
use saved memory when found
use current campaign/business context when saved memory is light
warn clearly when saved memory is missing
only hard-block if strict memory mode is explicitly enabled
```

## What This Fix Changes

### 1. Memory lookup is more forgiving

Replaces:

```text
src/lib/content-generation/memory-context.ts
```

Improvements:

```text
searches more likely memory table names
removes fragile updated_at ordering
treats missing tables as diagnostic warnings, not failures
includes current campaign context as fallback memory
```

Candidate memory tables now include:

```text
brand_voice
brand_voices
brand_voice_profiles
brand_voice_settings
knowledge_entries
knowledge
knowledge_items
business_knowledge
business_facts
company_facts
memory_entries
saved_knowledge
settings
app_settings
user_settings
```

### 2. Monthly generation no longer hard-blocks by default

Replaces:

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
```

Now:

```text
requireMemoryContext defaults to false
generation continues with current campaign context if saved memory is not detected
response returns warnings instead of blocking
strict blocking only happens if requireMemoryContext is explicitly true
```

## Files Included

```text
src/lib/content-generation/memory-context.ts
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
README_MEMORY_GATE_SOFT_WARNING_FIX.md
```

## No SQL Required

## Apply

1. Replace the two files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Make memory gate a soft warning for generation
```

## Test

1. Reset a test month.
2. Generate the month again.
3. Confirm it does not stop on missing memory.
4. Check response warnings.
5. Open assets and confirm quality.
6. If assets still ignore Brand Voice/Knowledge, the next step is to inspect the actual memory table names/schema and wire those exact tables in.
