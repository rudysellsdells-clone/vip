# VIP WordPress Publishing Runs Constraint Fix

## Problem

When clicking **Create WordPress Draft**, Supabase returns:

```text
new row for relation "publishing_execution_runs" violates check constraint "publishing_execution_runs_provider_check"
```

## Cause

The `publishing_execution_runs` table has a provider check constraint that was created before WordPress publishing was added.

The app is now trying to record a WordPress/Zapier publishing run, but the database constraint does not allow the new provider/channel values.

## Fix

Run this SQL migration in Supabase:

```text
db/migrations/20260524_wordpress_publishing_runs_constraints.sql
```

It safely replaces the provider/channel check constraints and allows:

### Providers

```text
zapier
zapier_mcp
galaxyai
galaxy_ai
wordpress
manual
```

### Channels

```text
linkedin
facebook
gmail
galaxyai
wordpress
manual
```

## Files Included

```text
db/migrations/20260524_wordpress_publishing_runs_constraints.sql
README_WORDPRESS_PUBLISHING_RUNS_CONSTRAINT_FIX.md
```

## Apply

1. Open Supabase SQL Editor.
2. Paste the SQL from:

```text
db/migrations/20260524_wordpress_publishing_runs_constraints.sql
```

3. Run it.
4. Try **Create WordPress Draft** again.

Suggested commit message:

```text
Allow WordPress publishing run records
```

## Expected Result

After the SQL runs, VIP should be able to create a `publishing_execution_runs` row for WordPress.

If the next error mentions Zapier or WordPress authentication, that means the database issue is fixed and the remaining issue is the Zapier/WordPress connection itself.
