# Brave Discovery Status Type Fix

## Problem

Vercel failed with:

```text
Type 'string' is not assignable to type '"rejected" | "qualified" | "discovered"'
```

in:

```text
src/lib/link-builder/directory-discovery.ts
```

## Cause

`DiscoveredDirectoryOpportunity.status` expects a strict literal union:

```ts
"discovered" | "qualified" | "rejected"
```

but TypeScript treated `score.recommendedStatus` as a generic string.

## Fix

This patch updates:

```text
src/lib/link-builder/directory-discovery.ts
```

It adds:

```ts
type DiscoveryStatus = "discovered" | "qualified" | "rejected";

function normalizeDiscoveryStatus(value: unknown): DiscoveryStatus {
  if (value === "qualified" || value === "rejected" || value === "discovered") {
    return value;
  }

  return "discovered";
}
```

Then it uses the normalized value when building discovered opportunities.

## Apply

Replace:

```text
src/lib/link-builder/directory-discovery.ts
```

Commit and redeploy.

Suggested commit message:

```text
Fix Brave discovery status type
```
