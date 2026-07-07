# H1.6B3 — Content Calendar Workspace Scope Cleanup

This patch closes a workspace-scoping gap left on the content calendar overview surfaces.

## What this fixes

The account-scoped routes and monthly review board were already aligned to the active workspace, but the top-level content calendar overview and monthly calendar view still queried generated content by `user_id`.

That meant a MASTER or multi-account user could see mixed campaign counts, assets, and activity from more than one workspace.

## What changed

### `/content-calendar`

- Loads the active account workspace.
- Redirects to `/accounts` if no active workspace is selected.
- Scopes campaign counts to `campaigns.account_id`.
- Scopes generated assets to `generated_assets.account_id`.
- Scopes the Activity Log to `activity_log.account_id`.
- Adds a visible **Active Workspace** section so the user can see which account the command center is reporting on.
- Updates helper copy so reset/cleanup and activity clearly refer to the active workspace.

### `/content-calendar/monthly`

- Requires an active workspace before rendering.
- Keeps account strategy / brand voice loading on the active workspace.
- Changes the working asset query from `user_id` to `account_id`.
- Updates page copy to clarify that the monthly calendar is workspace-scoped.

## SQL required

None. This uses the existing `account_id` columns already added by the multi-account workspace and calendar account-scope patches.

## Apply order

Apply after H1.6B2.

## Test checklist

1. Sign in as MASTER.
2. Select Account A.
3. Open `/content-calendar`. Confirm counts, health warnings, and activity match Account A only.
4. Open `/content-calendar/monthly`. Confirm only Account A assets appear.
5. Switch to Account B.
6. Confirm the overview and monthly calendar change to Account B only.
7. Confirm `/content-calendar/monthly-review` still behaves as before.
8. Run `npm run typecheck`.

## Commit message

`H1.6B3 Content Calendar workspace scope cleanup`
