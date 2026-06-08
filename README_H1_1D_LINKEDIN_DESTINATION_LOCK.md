# VIP H1.1D LinkedIn Destination Lock Patch

## Problem fixed

LinkedIn posts were successfully reaching Zapier MCP, but they were publishing to the wrong LinkedIn company page.

The payload showed this unsafe field:

```text
company_id: McCormick Web Marketing
```

That is a page name/label, not a reliable LinkedIn organization ID. When the LinkedIn Zapier action receives an invalid or ambiguous company/page value, it can fall back to the connected/default company page.

## What this patch changes

### 1. Account publishing settings are now loaded before canonical publishing

The canonical route now enriches the asset with:

```text
account_publishing_settings
```

before building LinkedIn/Facebook params.

### 2. LinkedIn no longer falls back from company_id to page name

VIP may still display:

```text
linkedin_page_name: McCormick Web Marketing
```

But it only sends:

```text
company_id
organization_id
linkedin_company_id
```

when a real organization ID is configured.

Accepted formats:

```text
12345678
urn:li:organization:12345678
```

### 3. Publishing is blocked if LinkedIn company_id is unsafe

For LinkedIn assets, the canonical ZapierMCP route now refuses to publish if `company_id` is missing or looks like a page name.

This prevents VIP from publishing to the wrong LinkedIn company page.

### 4. Legacy LinkedIn tool-runs are hardened too

The legacy `tool_runs` execution route now refuses to execute LinkedIn company updates unless `params.company_id` is a real organization ID/URN.

### 5. Account UI label is clarified

The account Publishing settings form now labels the field as:

```text
LinkedIn Organization ID
```

with a placeholder:

```text
12345678 or urn:li:organization:12345678
```

## Files included

```text
src/lib/accounts/account-publishing-settings.ts
src/lib/publishing/output-payload.ts
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
src/lib/zapier/linkedin.ts
src/app/api/assets/[assetId]/prepare-linkedin-post/route.ts
src/app/api/tool-runs/[toolRunId]/execute/route.ts
src/components/accounts/AccountPublishingSettingsForm.tsx
README_H1_1D_LINKEDIN_DESTINATION_LOCK.md
```

## Required setup after applying

Open the account in VIP:

```text
/accounts/[accountId]
```

Go to Publishing settings and set:

```text
LinkedIn Page Name: McCormick Web Marketing
LinkedIn Organization ID: <actual LinkedIn organization ID>
```

Do not put `McCormick Web Marketing` in the Organization ID field.

## Test checklist

1. Save the correct LinkedIn Organization ID in account Publishing settings.
2. Approve a LinkedIn post.
3. Publish via ZapierMCP.
4. Confirm the request payload includes a real `company_id`.
5. Confirm Zapier MCP output `author` matches the correct LinkedIn organization.
6. Confirm the LinkedIn post appears on McCormick Web Marketing, not Deal Jamz.

## Suggested commit message

```text
Lock LinkedIn publishing to configured organization ID
```
