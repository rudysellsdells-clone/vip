# H1.6C10A — One-Off Content Strategy String Literal Build Fix

This is a small build-fix patch for H1.6C10.

## What it fixes

Vercel/Turbopack failed because `src/lib/content-generation/one-off-campaign-brief.ts` contained a broken multiline string literal in the one-off campaign execution contract.

The broken prompt rule has been split into two valid string entries.

## Files changed

- `src/lib/content-generation/one-off-campaign-brief.ts`

## SQL

No SQL required.

## Install

Unzip this patch directly into the repo root and replace the existing file.
