# VIP H1.1E LinkedIn Account Publishing Settings Resolution Fix

## Problem

You saved the LinkedIn organization/company ID in account Publishing settings, but VIP still returned:

```text
LinkedIn destination is not locked. VIP needs the real LinkedIn organization/company ID before publishing.
```

That means the destination lock worked, but the publish route did not find the saved account publishing settings when building the LinkedIn payload.

The most likely cause is a legacy approved asset with no `account_id`, or an asset whose campaign/account relationship was not backfilled. In that case, the previous helper only looked at:

```text
asset.account_id
```

If that was null, account publishing settings were never loaded.

## What this patch changes

### 1. Strengthens account publishing settings resolution

The helper now tries account IDs in this order:

```text
1. generated_assets.account_id
2. campaigns.account_id from asset.campaign_id
3. profiles.last_active_account_id
4. profiles.default_account_id
5. owned accounts for the user
6. active account memberships for the user
```

This lets legacy/unscoped approved assets still find the active account publishing settings.

### 2. Adds debug visibility to the publish preview/error response

The canonical ZapierMCP route now returns:

```text
accountPublishingSettingsResolution
accountPublishingSettingsFound
```

so if the lock still blocks, we can see which account IDs VIP checked.

### 3. No schema changes

This does not change RLS, migrations, routes, Zapier configuration, or LinkedIn payload structure. It only improves how VIP finds the saved account publishing settings before building the payload.

## Files included

```text
src/lib/accounts/account-publishing-settings.ts
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
```

## Expected result

After deploy, retry the approved LinkedIn asset.

If the saved account publishing settings are found, payload params should include a real value such as:

```text
company_id: 12345678
```

or:

```text
company_id: urn:li:organization:12345678
```

The publish should stay blocked if VIP still cannot find a real organization ID. In that case, the response will now show which candidate account IDs were checked.

## Suggested commit message

```text
Resolve account publishing settings for legacy assets
```
