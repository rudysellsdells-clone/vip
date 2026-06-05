# VIP Phase 3G.3 Unterminated String Build Fix

## What this fixes

Vercel failed with:

```text
Unterminated string constant
].join("
"),
```

The Phase 3G.3 patch accidentally wrote a newline inside the string literal instead of using:

```ts
].join("\n"),
```

## File replaced

```text
src/lib/content-calendar/monthly-campaign-planner.ts
```

## Change made

Replaced the broken generated code:

```ts
].join("
"),
```

with:

```ts
].join("\n"),
```

No behavior changed. This is only a syntax/build fix for the Phase 3G.3 campaign visual direction and GalaxyAI image prompt patch.

## Suggested commit message

```text
Fix Phase 3G image prompt planner string join
```
