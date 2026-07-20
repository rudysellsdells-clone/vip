# H1.10C2 — GalaxyAI Provisioning and Recovery Consolidation Fix

## Why this patch exists

H1.10C added workflow provisioning, but it unintentionally replaced several H1.10B recovery files with older versions. That caused:

- a TypeScript failure in `run-recovery.ts`
- loss of automatic run polling from the approved prompt screen
- loss of manual Retrieve Output / Check Status controls on the GalaxyAI page
- loss of recent-run recovery controls on asset detail pages

H1.10C2 consolidates both feature sets correctly.

## Fixes

- Restores H1.10B automatic polling and output retrieval.
- Restores manual run status and output recovery controls.
- Preserves H1.10C VIP-managed workflow provisioning and recommended workflow selection.
- Makes remote media `type` optional because the GalaxyAI API may omit it.
- Normalizes missing media types to `file` during deduplication.
- Restores account-scoped workflow selection while leaving unrelated approval behavior unchanged.

## Files

```text
src/app/(app)/assets/[assetId]/page.tsx
src/app/(app)/galaxyai/page.tsx
src/components/galaxyai/RunGalaxyAiAssetButton.tsx
src/lib/galaxyai/run-recovery.ts
src/lib/galaxyai/types.ts
```

## Validation

- GalaxyAI pure TypeScript module check: passed
- GalaxyAI UI targeted syntax/type pass with framework stubs: passed
- GalaxyAI recovery tests: 3 passed

A full Next.js build was not run in the isolated patch workspace because installed project dependencies were unavailable there.

## Install

Unzip directly into the repository root and choose Replace.

Suggested commit message:

```text
H1.10C2 consolidate GalaxyAI provisioning and recovery
```
