# H1.4C — Account-Scoped Route and API Guard Cleanup

This ZIP adds the first account-security hardening slice after H1.4A/H1.4B.

## Apply

Copy the patch files into the repo root, then run the included SQL migration in Supabase:

```text
db/migrations/20260616_h1_4c_account_scope_route_api_guards.sql
```

## Files changed

```text
src/lib/accounts/account-context.ts
src/lib/accounts/account-utils.ts
src/app/(app)/accounts/page.tsx
src/app/(app)/accounts/[accountId]/page.tsx
src/app/api/accounts/route.ts
src/app/api/accounts/[accountId]/archive/route.ts
src/app/api/accounts/[accountId]/members/route.ts
src/app/(app)/campaigns/page.tsx
src/app/(app)/campaigns/[campaignId]/page.tsx
src/app/api/campaigns/route.ts
src/app/api/campaigns/[campaignId]/route.ts
src/app/api/campaigns/[campaignId]/generate/route.ts
src/app/api/campaigns/[campaignId]/archive/route.ts
src/app/api/campaigns/[campaignId]/delete/route.ts
src/app/api/campaigns/[campaignId]/restore/route.ts
db/migrations/20260616_h1_4c_account_scope_route_api_guards.sql
docs/H1_4C_ACCOUNT_SCOPED_ROUTE_API_GUARDS.md
README_H1_4C_ACCOUNT_SCOPED_ROUTE_API_GUARDS.md
```

## Important

This patch does not change publishing provider logic, Zapier MCP payloads, or AI generation prompts.

It centralizes account access checks, scopes account/campaign pages and APIs, and adds additive RLS support for account-aware tables.

See the full implementation note:

```text
docs/H1_4C_ACCOUNT_SCOPED_ROUTE_API_GUARDS.md
```
