# H1.4C2 — Testing Controls: Sign Out and Use Workspace

## Purpose

H1.4C added route/API authorization guards, but testing account isolation was awkward because the UI did not make it obvious how to sign out or how a MASTER user should operate inside a specific client workspace.

This patch adds the missing test/operator controls.

## What changed

### 1. Sign out is now visible

Added:

```text
src/app/api/auth/sign-out/route.ts
src/components/layout/SignOutButton.tsx
```

The top navigation now includes a visible **Sign out** control on desktop and mobile.

### 2. MASTER can intentionally choose the active workspace

Updated:

```text
src/components/accounts/AccountSwitcher.tsx
src/components/layout/SidebarNav.tsx
```

The account selector is now labeled **Active workspace** and clearly identifies itself as the MASTER workspace selector when the signed-in user is a MASTER/platform user.

### 3. Account cards now have a Use Workspace button

Added:

```text
src/components/accounts/UseAccountWorkspaceButton.tsx
```

Updated:

```text
src/app/(app)/accounts/page.tsx
src/app/(app)/accounts/[accountId]/page.tsx
```

From `/accounts`, a MASTER user can click **Use Workspace** on an account card to make that account the active workspace. The account detail page also includes **Set Active Workspace**.

### 4. Includes prior H1.4C build fix

This patch also carries forward the small TypeScript fix in:

```text
src/app/api/campaigns/[campaignId]/generate/route.ts
```

That fix prevents Vercel from rejecting the build due to an implicit `any` callback parameter.

## What did not change

- No database migration changes.
- No publishing provider logic changes.
- No content generation prompt changes.
- No Zapier MCP changes.
- No LinkedIn/Facebook/Gmail execution changes.
- No account permission model changes beyond making the existing active workspace switch easier to use.

## Testing after deploy

1. Log in as MASTER.
2. Open `/accounts`.
3. Click **Use Workspace** on a client account.
4. Open `/campaigns` and confirm it reflects that workspace.
5. Switch to another workspace and confirm `/campaigns` changes.
6. Click **Sign out**.
7. Confirm the app returns to `/login`.
8. Sign back in and continue testing.

## SQL

No new SQL is required for this patch.

If the H1.4C SQL migration has not been run yet, run that migration after the app builds and deploys cleanly.
