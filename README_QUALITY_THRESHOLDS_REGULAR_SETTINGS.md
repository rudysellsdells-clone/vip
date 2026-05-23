# VIP Quality Thresholds in Regular Settings

## Goal

Move the editable quality gate thresholds into the main Settings page.

The separate page still exists:

```text
/settings/content-quality
```

But this patch makes the regular Settings page more useful by showing the quality threshold controls directly at:

```text
/settings
```

## File Included

```text
src/app/(app)/settings/page.tsx
```

## What It Shows

The Settings page now includes:

```text
Quality gate status
Approval mode
Overall minimum score
Human review setting
Editable quality thresholds form
Related settings cards
```

## Related Links Included

```text
Brand Voice
Knowledge
Content Quality
Publishing Ready
Reporting
Archive
```

## No SQL Required

This depends on the previous quality gate migration already being run:

```text
db/migrations/20260523_quality_gate_settings.sql
```

## Apply

1. Replace/add the included file.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add quality thresholds to settings
```

## Test

1. Open:

```text
/settings
```

2. Confirm the quality threshold form appears.
3. Change a threshold.
4. Click **Save Quality Thresholds**.
5. Confirm the setting persists after refresh.
6. Confirm `/settings/content-quality` still works if you want to keep the direct page.
