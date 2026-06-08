# VIP Account Security Standard

## Purpose

VIP is now a multi-account product. Any client/workspace feature must isolate account data and permissions.

## Rule

Do not rely only on `user_id` for multi-account data.

Use both:

```text
user identity
account membership/role
```

## Canonical helper

```text
src/lib/accounts/account-context.ts
```

This should be used or extended for API routes that need active account, account membership, or account role context.

## Tables that require account review

High-priority account-owned tables:

```text
accounts
account_memberships
account_brand_profiles
account_publishing_settings
campaigns
generated_assets
content_calendar_plans
content_calendar_items
publishing_execution_runs
tool_runs
galaxyai_runs
activity_log
service_lines
buyer_segments
offers
brand_rules
content_examples
knowledge_sources
asset_quality_reviews
quality_gate_decisions
asset_exports
prospects
opportunities
```

## RLS pattern

Preferred select policy pattern for account-owned records:

```sql
using (
  account_id is not null
  and public.user_can_view_account(account_id)
)
```

Preferred write policy pattern:

```sql
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
)
```

If a table still uses `user_id` only, mark it as legacy and audit it before client onboarding.

## API route pattern

Every account-sensitive route should:

1. Authenticate user.
2. Resolve account context.
3. Check role/permission for action.
4. Scope all queries by account where applicable.
5. Return 403 for unauthorized access.

## Service role rule

Service-role Supabase client may bypass RLS. When using it, the route must perform explicit authorization checks first.

Never use service role as a shortcut around account security.

## Storage rule

Storage paths for account-owned campaign assets should include account and campaign context:

```text
accounts/{account_id}/campaigns/{campaign_id}/assets/{asset_id}/{filename}
```

Public buckets are acceptable only for assets intended to be publicly published.
