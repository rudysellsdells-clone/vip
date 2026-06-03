# VIP GalaxyAI contentForAsset return type build fix

## What this fixes

Vercel failed with:

```text
Type error: 'contentForAsset' implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions.
```

The GalaxyAI companion prompt case calls `contentForAsset(...)` to build the companion video script text. Because of that direct/indirect self-reference, TypeScript requires an explicit return type.

## File replaced

```text
src/lib/content-calendar/monthly-campaign-planner.ts
```

## Change made

Changed:

```ts
function contentForAsset({ ... }) {
```

to:

```ts
function contentForAsset({ ... }): string {
```

No behavior changed. This is only a TypeScript build fix.
