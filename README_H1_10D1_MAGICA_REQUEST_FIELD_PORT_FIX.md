# H1.10D1 — Magica Request Field and Port Resolution Fix

## Problem fixed

Provisioning stopped with:

```text
Could not find the prompt field on the Magica Request node.
```

The H1.10D parser assumed Request fields and processing-node ports would be returned as structured objects. Magica's workflow builder uses different shapes:

- Request node source handles are bare field IDs such as `field_prompt`.
- Processing-node ports are returned as strings such as `in:prompt` and `out:result`.
- The Response node input handle is `result`.

## What changed

- Recursively inspects the quick-create response and Request node data for field IDs.
- Resolves the requested `prompt` field to its actual field ID when present.
- Uses the documented deterministic fallback `field_prompt` when Magica omits the Request field schema from `GET /workflows/{id}`.
- Accepts string port arrays returned by Magica's add-node endpoint.
- Preserves top-level quick-create and add-node response fields when Magica wraps workflow or node data.
- Uses `result` as the documented Response-node fallback handle.
- Adds a provisioning diagnostic showing the resolved Request field ID.

## Files included

```text
src/lib/galaxyai/client.ts
src/lib/galaxyai/provisioning.ts
README_H1_10D1_MAGICA_REQUEST_FIELD_PORT_FIX.md
PATCH_MANIFEST_H1_10D1.txt
FILE_SHA256SUMS_H1_10D1.txt
```

## Apply

Unzip directly into the Marketing VIP repo root and choose **Replace**.

Then commit, push, and let Vercel rebuild.

After deployment, return to the Magica page and click:

```text
Provision / Verify VIP Workflows
```

## Note about the failed attempt

The previous failed request may have created an empty Request/Response scaffold in Magica before provisioning stopped. This fix does not automatically delete remote workflows. Any obvious empty duplicate scaffold from the failed attempt can be deleted from Magica after the new workflow provisions successfully.
