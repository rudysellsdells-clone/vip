# H1.10D2 — Magica Mode Mapping + Live Preflight Fix

## Problem fixed

Magica rejected the FLUX image node because VIP sent the model/submodel identifier as the node execution mode:

```text
nodeType: flux_2_max
mode: flux-2-max-text
```

Magica reported that the valid modes for this node are:

```text
text-to-image
image-to-image
```

## Corrected mapping

This patch separates the Magica catalog values by purpose:

```text
subModelId/category-specific model ID -> schema lookup
subModel category                    -> node execution mode
```

For the reported FLUX case, VIP now sends:

```text
nodeType: flux_2_max
mode: text-to-image
```

The schema lookup can still use:

```text
flux-2-max-text
```

## Live preflight added

Before creating any remote workflow scaffold, VIP now:

1. loads the live Magica model catalog
2. requires an exact `text-to-image` catalog mode
3. requires an exact `image-to-video` catalog mode
4. fetches both live model schemas
5. stops before workflow creation if either candidate or schema is unavailable
6. records the selected node type, execution mode, and schema ID in diagnostics

This prevents a catalog/schema error from creating a new partial workflow.

## Files included

```text
src/lib/galaxyai/provisioning.ts
README_H1_10D2_MAGICA_MODE_PREFLIGHT_FIX.md
PATCH_MANIFEST_H1_10D2.txt
FILE_SHA256SUMS_H1_10D2.txt
```

## Apply

Unzip directly into the VIP repository root and choose **Replace**.

Then commit, push, wait for Vercel, and click:

```text
Provision / Verify VIP Workflows
```

## Expected image diagnostic

The provisioning details should now show a line similar to:

```text
nodeType=flux_2_max; mode=text-to-image; schema=flux-2-max-text
```
