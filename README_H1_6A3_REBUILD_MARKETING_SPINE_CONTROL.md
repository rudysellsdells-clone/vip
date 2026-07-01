# H1.6A3 — Rebuild Marketing Spine Control

This is a small UX follow-up to H1.6A2.

## What this fixes

H1.6A2 made the Marketing Spine visible and lockable, but when the spine was locked, the UI did not provide an obvious way to recreate/rebuild it.

That made the workflow feel one-way.

## New behavior

On the monthly campaign generator:

- Before locking, the button says:
  - **Build / Lock Marketing Spine**
- If inputs changed after review, it says:
  - **Rebuild / Lock Marketing Spine**
- After the spine is locked, the button now says:
  - **Rebuild Marketing Spine**

Clicking **Rebuild Marketing Spine**:

- unlocks the reviewed spine
- clears the prior locked signature
- lets you edit strategy inputs again
- requires you to lock the spine again before generating

## Why this matters

The Marketing Spine should be a reviewable strategy bridge, not a one-way trap. This makes the workflow:

1. Build / Lock Spine
2. Review it
3. Rebuild if needed
4. Lock again
5. Generate From Reviewed Spine

## SQL required

None.

## Apply order

Apply after:

1. H1.6A
2. H1.6A2

## Test checklist

1. Go to the monthly campaign generator.
2. Fill/select campaign inputs.
3. Click **Build / Lock Marketing Spine**.
4. Confirm **Generate From Reviewed Spine** activates.
5. Confirm the spine button now says **Rebuild Marketing Spine**.
6. Click **Rebuild Marketing Spine**.
7. Confirm generation is disabled again.
8. Adjust any strategy input.
9. Click **Build / Lock Marketing Spine** again.
10. Generate from the reviewed spine.

## Commit message

`H1.6A3 Rebuild Marketing Spine control`
