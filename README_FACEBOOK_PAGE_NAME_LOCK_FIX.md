# Facebook Page Name Lock Fix

## Issue

The previous Sprint 5.2 guardrail expected the Facebook Page name:

```text
Web Search Pros
```

Rudy confirmed the exact Facebook Page name exposed by Zapier is:

```text
web.search.professionals
```

## Fix

This patch updates:

```text
src/lib/zapier/execution-policy.ts
```

The required Facebook Page name is now:

```ts
export const REQUIRED_FACEBOOK_PAGE_NAME = "web.search.professionals";
```

## Required Vercel Variables

Set:

```bash
ZAPIER_FACEBOOK_PAGE_NAME=web.search.professionals
ZAPIER_FACEBOOK_PAGE_ID=the_exact_page_value_or_id_from_zapier
```

Do not prefix either variable with `NEXT_PUBLIC_`.

## Apply

1. Replace `src/lib/zapier/execution-policy.ts`.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Update Facebook page lock name
```

## Status

This does not enable Facebook publishing yet. It only corrects the safety lock display and future execution guardrail.
