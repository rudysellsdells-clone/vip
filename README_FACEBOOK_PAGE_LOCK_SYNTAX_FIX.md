# VIP Facebook Page Lock Syntax Fix

## Problem

Vercel rejected the previous Facebook page lock patch around `output-payload.ts` lines 157–158.

## Cause

The patch mixed TypeScript nullish coalescing (`??`) and logical OR (`||`) without parentheses:

```ts
const pageId = config.pageId ?? env("ZAPIER_FACEBOOK_PAGE_ID") || null;
```

TypeScript/Next requires parentheses when mixing these operators.

## Fix

This package changes those expressions to:

```ts
const pageId = (config.pageId ?? env("ZAPIER_FACEBOOK_PAGE_ID")) || null;
const pageName = (config.pageName ?? env("ZAPIER_FACEBOOK_PAGE_NAME")) || null;
```

and keeps the Facebook Page lock instruction.

## File Included

```text
src/lib/publishing/output-payload.ts
```

## Apply

Extract directly to repo root and redeploy.

Suggested commit message:

```text
Fix Facebook page lock TypeScript syntax
```
