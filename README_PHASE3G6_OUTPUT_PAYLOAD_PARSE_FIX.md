# VIP Phase 3G.6 Output Payload Parse Build Fix

## What this fixes

Vercel failed while parsing:

```text
src/lib/publishing/output-payload.ts
```

The issue was this line:

```ts
const pageName = config.pageName ?? env("ZAPIER_LINKEDIN_PAGE_NAME") || null;
```

JavaScript/TypeScript does not allow mixing the nullish coalescing operator `??` with `||` without explicit parentheses.

## File replaced

```text
src/lib/publishing/output-payload.ts
```

## Change made

Replaced the invalid expression with the existing `firstValue(...)` helper:

```ts
const pageName = firstValue(config.pageName, env("ZAPIER_LINKEDIN_PAGE_NAME")) || null;
```

No behavior changed. This only fixes the parser/build error while preserving the hosted image payload support.

## Suggested commit message

```text
Fix hosted image payload parser error
```
