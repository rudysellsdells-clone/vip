# H1.10D3 — Magica Prompt Length Guard

## Problem fixed

Magica's FLUX 2 Max text-to-image node rejects prompts longer than 3,500 characters.

The Marketing VIP asset prompt can legitimately be longer because it includes campaign context, platform direction, post-copy context, visual direction, and quality controls. Sending that entire approved asset verbatim caused the Magica node to fail with:

`Prompt must be 3500 characters or fewer`

## What this patch changes

- Adds a deterministic Magica prompt compactor.
- Uses a safe runtime limit of **3,400 characters**.
- Leaves prompts that are already under the limit unchanged.
- Removes duplicate paragraphs from oversized prompts.
- Prioritizes campaign subject, platform, audience, offer, CTA, post/script context, creative direction, branding, composition, and quality controls.
- Truncates only at reasonable paragraph, sentence, line, or word boundaries when necessary.
- Preserves the full approved prompt on the original VIP asset.
- Sends only the compacted execution prompt to Magica.
- Records the original length, transmitted length, limit, and whether compaction occurred in the GalaxyAI run input and activity log.

## Runtime behavior

Normal approved-prompt execution is now:

1. Load the full approved VIP prompt.
2. Compact only when it exceeds the Magica-safe limit.
3. Start the existing saved Magica workflow using the compacted prompt.
4. Keep the full approved prompt unchanged in VIP for review and audit.

## Files included

- `src/lib/galaxyai/prompt-compactor.ts`
- `src/app/api/galaxyai/runs/route.ts`
- `tests/galaxyai-prompt-compactor.test.ts`

## Validation performed

- 3 prompt-compaction tests passed.
- 3 existing GalaxyAI output-recovery tests passed.
- TypeScript syntax transpilation passed for both changed runtime files.

A full Next.js build was not run in the artifact environment because the uploaded repository does not include installed dependencies.
