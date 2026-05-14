# Facebook Page Name Lock Fix v2

## Issue

The previous guardrail was updated to:

```text
web.search.professionals
```

Rudy confirmed the correct Facebook Page name is actually:

```text
mccormick.web.marketing
```

## Fix

This patch updates:

```text
src/lib/zapier/execution-policy.ts
```

The required Facebook Page name is now:

```ts
export const REQUIRED_FACEBOOK_PAGE_NAME = "mccormick.web.marketing";
```

## Required Vercel Variables

Set:

```bash
ZAPIER_FACEBOOK_PAGE_NAME=mccormick.web.marketing
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
Update Facebook page lock to mccormick.web.marketing
```

## Status

This does not enable Facebook publishing yet. It only corrects the safety lock display and future execution guardrail.
