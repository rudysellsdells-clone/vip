# H1.10B — GalaxyAI Run Output Recovery

## Problem confirmed

Marketing VIP successfully submitted an approved prompt and saved a queued GalaxyAI run, but the application did not continue the required status/retrieval workflow.

The status component existed in the repository but was not rendered on either:

- `/galaxyai`
- `/assets/[assetId]`

The start button also refreshed the page immediately instead of polling the new run. Because the completed-run endpoint is what fetches GalaxyAI media and creates the VIP review asset, a remote run could complete without its output ever appearing in Marketing VIP.

## What this patch changes

### 1. Automatic completion polling

After `Run Approved Prompt in GalaxyAI` succeeds, VIP now:

1. Saves the local run.
2. Polls the run status approximately every five seconds.
3. Waits for GalaxyAI to complete.
4. Retrieves the generated media.
5. Creates the appropriate VIP review asset.
6. Shows a direct link to the generated asset.

The browser poll waits up to approximately six minutes. If the creative takes longer, the run remains recoverable from the GalaxyAI Runs page.

### 2. Manual recovery controls restored

Every recent run on `/galaxyai` now includes:

- **Check Status** for queued/running runs
- **Retrieve Output** for completed runs
- **Check Details** for failed/canceled runs

The source GalaxyAI prompt asset also shows its five most recent runs and the same recovery control.

### 3. Completed-run output fallback

GalaxyAI's workflow media index can lag behind the run-status endpoint. VIP now checks both:

- the workflow media endpoint
- completed node outputs returned inside the run details

The same URL is deduplicated when both sources return it.

### 4. Clear outcome messages

VIP now distinguishes:

- queued
- running
- completed and imported
- completed but media still indexing
- completed but review-asset creation failed
- provider failed/canceled
- status request failure

### 5. Existing runs remain recoverable

This patch does not require a new generation. After deployment, open `/galaxyai` and click **Check Status** or **Retrieve Output** on the existing run. If GalaxyAI still retains the result, VIP will import it.

## Safety and compatibility

- Approval requirements are unchanged.
- Supported asset types remain `galaxyai_prompt` and `galaxyai_image_prompt`.
- Account/workspace permission checks remain unchanged.
- Existing workflow input mappings remain unchanged.
- Publishing logic is unchanged.
- No database migration is required.
- No environment-variable change is required.
- Repeated retrieval is idempotent: an existing generated asset is reused rather than duplicated.
- Automatic polling no longer creates an activity-log entry every five seconds; activity is logged only when status changes, media is stored, or an error needs attention.

## Install

1. Unzip this patch directly into the local VIP repository root.
2. Choose **Replace**.
3. Do not run anything in Supabase.
4. Commit and push through GitHub Desktop.
5. Let Vercel deploy.

Suggested commit message:

```text
H1.10B restore GalaxyAI output polling and recovery
```

## Test the existing run first

1. Open **GalaxyAI** from the product navigation.
2. Find the run that did not return output.
3. Click **Check Status** or **Retrieve Output**.
4. Expected outcomes:
   - If still running, the card reports the current status.
   - If complete and media is available, VIP creates or reuses a review asset and shows **Open generated asset**.
   - If GalaxyAI failed, VIP surfaces the provider error.
   - If media indexing is delayed, wait briefly and click **Retrieve Output** again.

## Test a new run

1. Open and approve a GalaxyAI prompt asset.
2. Select the intended synced workflow.
3. Click **Run Approved Prompt in GalaxyAI**.
4. Keep the page open while VIP reports queued/running progress.
5. Confirm the result appears in the review queue and a direct asset link appears.

## Validation completed

- 3 GalaxyAI recovery regression tests passed.
- 25 strategy-engine regression tests passed.
- Changed TypeScript and TSX files passed compiler syntax/transpile validation.
- Exact run filtering passed.
- Node-output fallback passed.
- Duplicate media URL prevention passed.

A full Next.js production build was not run because the uploaded repository does not contain installed dependencies and dependency installation did not complete in the isolated environment. Vercel remains the final production build confirmation.
