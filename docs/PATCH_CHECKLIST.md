# VIP Patch Checklist

Use this before every patch.

## 1. Classification

Check all that apply:

```text
[ ] UI only
[ ] API route
[ ] Database migration
[ ] RLS/security
[ ] Account context
[ ] Publishing/Zapier/Gmail/Facebook/LinkedIn
[ ] GalaxyAI
[ ] Campaign/monthly generation
[ ] Calendar placement
[ ] Asset lifecycle/versioning
[ ] TypeScript/types
```

If more than two high-risk areas are checked, split the patch.

## 2. Canonical path check

```text
[ ] I searched for existing code that owns this behavior.
[ ] I am using the existing canonical helper/service.
[ ] I am not creating a duplicate route/client/helper.
[ ] If I am creating a new path, I wrote why in the README.
```

## 3. Account/security check

```text
[ ] This feature has no account-owned data impact.
[ ] OR this feature resolves account context before reading/writing.
[ ] OR this feature includes RLS/migration notes.
```

## 4. Publishing/external-call check

```text
[ ] This patch does not touch external execution.
[ ] OR it requires structured params.
[ ] OR it requires provider success evidence before completed status.
[ ] OR it preserves failure details in output/error fields.
```

## 5. Database check

```text
[ ] No migration needed.
[ ] OR migration is additive and safe to rerun where possible.
[ ] OR rollback is documented.
[ ] RLS policies reviewed.
[ ] Index impact reviewed.
```

## 6. Build check

```text
[ ] No compiled example files were added.
[ ] TypeScript unions updated if new asset/status types were added.
[ ] Supabase Json values are narrowed before property access.
[ ] `npm run build` expected to pass.
```

## 7. Handoff checklist

Every patch README must include:

```text
Problem
Files changed
Behavior changed
Migration needed or not
Env vars needed or not
How to test
Expected success
Expected failure behavior
Rollback guidance
Suggested commit message
```
