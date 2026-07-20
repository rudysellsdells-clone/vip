# H1.10D7 — Marketing Spine Type Fix

This direct-root patch fixes the production build error on the asset detail page:

`Property 'channelRoles' does not exist on type 'Record<string, unknown> | {}'.`

## Root cause

The Marketing Spine lineage helpers returned an inferred union containing an untyped empty object. TypeScript therefore could not guarantee that the resolved spine supported record-style property access.

## Fix

The lineage helper functions now explicitly return `Record<string, unknown>` and the strategy source resolver now has an explicit return contract:

- `firstNonEmptyRecord(...): Record<string, unknown>`
- `strategyRecordWithSource(...): { record: Record<string, unknown>; source: string | null }`

This preserves the H1.10D6 strategy-lineage behavior while making `marketingSpine.channelRoles` type-safe.

## Installation

Extract this ZIP directly into the repository root and choose **Replace**.

No database or environment-variable changes are required.
