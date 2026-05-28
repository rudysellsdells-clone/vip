# VIP Readable Error TypeScript Fix

## Problem

Vercel build failed with:

```text
Type error: 'readableError' implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions.
```

## Cause

`readableError()` is recursive. It calls itself when formatting nested error arrays.

TypeScript needs an explicit return type for recursive functions.

## Fix

Replace:

```text
src/lib/errors/readable-error.ts
```

The fix adds explicit return annotations:

```ts
export function readableError(...): string
export function compactReadableError(...): string
```

It also annotates callback return values inside `.map()`.

## Apply

1. Replace the file.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Fix readable error TypeScript return type
```
