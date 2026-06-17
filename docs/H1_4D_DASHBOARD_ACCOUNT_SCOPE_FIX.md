# H1.4D — Dashboard Account Scope Fix

## Purpose

When signed in as an account/client user, the dashboard could still show items from the wrong workspace in the **Needs your attention** area.

The dashboard was still using legacy `user_id` filters for core dashboard data. In a multi-account VIP workspace, account-aware dashboard sections must use the active `account_id` instead.

## File changed

```text
src/app/(app)/dashboard/page.tsx
```

## What changed

The dashboard now resolves the signed-in user's active account through:

```text
getUserAccountContext
```

The following dashboard sections now filter by active `account_id`:

- Recent campaigns
- Needs your attention / pending assets
- Approved assets
- Published assets
- GalaxyAI runs
- Tool runs / recent executions
- Activity log

The dashboard hero also now labels the active workspace, making it easier to confirm which account the user is viewing.

## What stayed legacy for now

Prospects and opportunities still use `user_id` on this page because those tables have not yet been fully migrated to account scope in the current repo snapshot. They remain part of the broader H1.4D/H1.4E hardening queue.

## What did not change

- No SQL changes.
- No publishing provider logic changes.
- No generation logic changes.
- No account membership or role logic changes.
- No destructive data changes.

## Test checklist

1. Sign in as `mainclientcenter@gmail.com`.
2. Go to `/dashboard`.
3. Confirm the hero shows the correct active workspace.
4. Confirm **Needs your attention** no longer shows VIP/Web Search Pros account posts.
5. Switch active workspace as MASTER and confirm the dashboard changes by workspace.
6. Confirm `/campaigns` and `/approvals` still open normally.
