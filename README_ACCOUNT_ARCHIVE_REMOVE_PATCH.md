# VIP Account Remove / Archive Patch

## What this adds

This patch adds a safe account removal flow.

It does **not** hard-delete accounts. It archives them:

```text
accounts.status = archived
```

That removes the account from the active Accounts screen while preserving campaigns, assets, memberships, and history.

## Files included

```text
src/app/api/accounts/[accountId]/archive/route.ts
src/app/(app)/accounts/page.tsx
src/components/accounts/ArchiveAccountButton.tsx
```

## How it works

On `/accounts`, VIP now shows a **Remove Account** button for platform owners/admins.

When clicked, VIP calls:

```text
POST /api/accounts/[accountId]/archive
```

The server route:

1. Confirms the user is signed in.
2. Confirms they are allowed to manage/remove the account.
3. Uses the Supabase service-role client to archive the account safely.
4. Sets `status = archived`.
5. Stores archive metadata in `settings`.

## Why archive instead of delete

A hard delete could remove or orphan campaign history, generated assets, memberships, and related records.

Archiving is safer for a marketing workflow because removed accounts disappear from normal use but remain available for audit/history or future restore logic.

## Environment requirement

This route uses:

```text
SUPABASE_SERVICE_ROLE_KEY
```

You said this is already configured in the project.

## Suggested commit message

```text
Add safe account archive removal flow
```
