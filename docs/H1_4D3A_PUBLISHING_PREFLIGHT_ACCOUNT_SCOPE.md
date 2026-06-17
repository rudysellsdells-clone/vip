# H1.4D3A — Publishing Preflight + Account Scope

This patch adds a safe review layer before live publishing execution.

## What changed

- Publish Center (`/publishing-schedule`) now scopes canonical approved assets by the active workspace `account_id`.
- Action History (`/actions`) now scopes legacy `tool_runs` by active workspace and canonical `publishing_execution_runs` through the account-owned asset IDs.
- Publishing Ready (`/publishing-ready?asset=...`) now loads assets through the account access guard instead of legacy `user_id` only.
- Publishing Ready now shows a preflight review section with:
  - Workspace/account ID
  - Destination label
  - Workspace publishing settings status
  - ZapierMCP app/action status
  - Blockers and warnings
  - Exact params payload preview
- Facebook payload resolution now reads workspace publishing settings first, then falls back to existing environment variables.
- Legacy publish tool-run buttons are hidden during H1.4D3A and replaced with "Preflight review only" messaging to avoid accidental external execution during testing.
- Ready for Publishing is scoped to the active workspace when resolving generated assets.

## What did not change

- No SQL migration is required.
- No live ZapierMCP execution route was changed.
- No Facebook, LinkedIn, Gmail, WordPress, or GalaxyAI provider execution code was changed.
- No provider credentials or external accounts are required for this test.

## Testing checklist

1. Sign in as MASTER.
2. Switch to a workspace.
3. Open `/publishing-schedule` and confirm only that workspace's approved assets appear.
4. Open a publishable asset from Publish Center.
5. Confirm `/publishing-ready?asset=...` shows the workspace ID, destination, blockers/warnings, and payload preview.
6. Switch to another workspace and confirm the Publish Center changes.
7. Sign in as an account user and confirm they cannot preview another account's asset URL.
8. Confirm legacy tool-run buttons are review-only during this preflight phase.

## Next patch

H1.4D3B should guard the live execution routes themselves:

- `/api/publishing/assets/[assetId]/execute-zapier-mcp`
- `/api/publishing/assets/[assetId]/execute`
- `/api/tool-runs/[toolRunId]/execute`
- schedule / unschedule / mark-published routes

