# H1.7C2 — UTM Taxonomy and Automatic Publishing Attribution

## Status

**Built:** direct-unzip patch created.

H1.7C2 adds the canonical attribution layer that connects Marketing VIP publishing to both GA4 and the native Marketing VIP event model. It gives every trackable outbound publishing link readable UTM values plus exact Marketing VIP campaign and asset identifiers.

## Dependencies

Apply these analytics releases first:

1. H1.7A — analytics foundation
2. H1.7B — native collection and GA4 connection
3. H1.7C1 — reporting and synchronization operations

Then apply H1.7C2.

## Architecture decision

H1.7C2 uses one canonical attribution builder rather than separate UTM logic for Facebook, LinkedIn, email, WordPress, or future channels.

The live publishing flow is:

```text
Approved asset
→ Publishing preflight
→ Canonical output payload
→ H1.7C2 attribution enrichment
→ Tracking-link audit record
→ ZapierMCP provider execution
→ Native + GA4 reporting
```

The approved asset stored in `generated_assets.content` is not rewritten. Attribution is applied to the outbound publishing payload at preview and execution time.

## Taxonomy

### Standard parameters

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term (optional)
```

### Marketing VIP identifiers

```text
vip_campaign=<campaign UUID>
vip_asset=<generated asset UUID>
```

### Naming rules

- Lowercase
- Hyphens instead of spaces
- No personal information
- Readable campaign and content names
- Stable campaign names after the first live publishing execution
- Exact UUIDs only in the `vip_` parameters
- Existing legitimate destination query parameters are preserved
- Existing UTM and VIP parameters are replaced rather than duplicated

### Default source and medium mapping

| Publishing destination | `utm_source` | `utm_medium` |
|---|---|---|
| LinkedIn organic | `linkedin` | `organic-social` |
| LinkedIn paid | `linkedin` | `paid-social` |
| Facebook organic | `facebook` | `organic-social` |
| Facebook paid | `facebook` | `paid-social` |
| Instagram organic | `instagram` | `organic-social` |
| X organic | `x` | `organic-social` |
| Email | Workspace email source | `email` |
| SMS | Workspace SMS source | `sms` |
| Search advertisement | Publishing source | `cpc` |
| Display advertisement | Publishing source | `display` |
| Video | Publishing source | `video` |
| QR code | `qr` | `qr` |
| Other supported outbound channel | Publishing channel | `referral` |

The controlled medium vocabulary is:

```text
organic-social
paid-social
cpc
display
email
sms
organic-search
referral
affiliate
video
qr
direct-mail
```

## What this patch adds

### Account-scoped taxonomy settings

A new screen is available at:

```text
Measure → UTM Taxonomy
```

Account owners and administrators can configure:

- Default email source, such as `email`, `mautic`, or `hubspot`
- Default website source
- Default SMS source
- Whether the buyer segment becomes `utm_term`
- Whether VIP appends a tracked destination when social copy contains no link
- Whether VIP appends a tracked destination when email copy contains no link

Account viewers can review the taxonomy and generated tracking links but cannot change settings.

### Automatic publishing attribution

The canonical live ZapierMCP route now:

- Resolves the best destination URL from the asset, campaign, approved content, publishing settings, account CTA, or account website
- Generates canonical UTM values
- Appends `vip_campaign` and `vip_asset`
- Replaces a plain destination URL already present in approved outbound copy
- Optionally appends the tracked URL when no link is present
- Adds common structured URL aliases to the provider payload
- Saves the tracking link before provider execution when possible
- Attaches attribution to the publishing execution audit record
- Returns attribution details and warnings to the user

### Publishing preflight preview

The live Publish Center button now loads and displays:

- Destination URL
- Final tracked URL
- Source and medium
- Campaign and content slugs
- Optional term
- Campaign UUID
- Asset UUID
- Whether VIP replaced or appended the URL
- Any nonblocking attribution warning

No external publishing action is triggered by this preview.

### Persistent tracking-link audit

The new `analytics_tracking_links` table stores the current attributed URL for each asset and channel.

The publishing run also records:

- Campaign ID
- Tracking-link ID
- Original destination URL
- Final tracked URL
- Full attribution object

### GA4 campaign and asset reconciliation

GA4 synchronization now imports these session-level manual campaign dimensions:

```text
sessionManualCampaignName
sessionManualAdContent
sessionManualTerm
```

Marketing VIP uses the first two to map GA4 reporting rows back to persisted campaign and asset slugs. This allows GA4 campaign traffic to contribute to the same campaign-level and asset-level reports introduced in H1.7C1.

The exact `vip_campaign` and `vip_asset` parameters remain the native tracker’s strongest attribution keys. The readable UTM values provide familiar GA4 reporting and a second reconciliation path.

## Files added

- `db/migrations/20260715_h1_7c2_utm_taxonomy_and_tracking_links.sql`
- `src/lib/analytics/utm-taxonomy.ts`
- `src/lib/analytics/publishing-attribution.ts`
- `src/app/api/analytics/utm-settings/route.ts`
- `src/components/analytics/UtmTaxonomyPanel.tsx`
- `src/app/(app)/analytics/taxonomy/page.tsx`
- `README_H1_7C2_UTM_TAXONOMY_AND_ATTRIBUTION.md`

## Files replaced

- `src/components/layout/SidebarNav.tsx`
- `src/components/publishing/SendAssetToZapierMcpButton.tsx`
- `src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts`
- `src/lib/analytics/google.ts`
- `src/lib/analytics/ga4-sync.ts`

The older `/api/publishing/assets/[assetId]/execute` route is intentionally unchanged. The current Publish Center uses the canonical `execute-zapier-mcp` route.

## Environment variables

No new environment variables are required.

H1.7C2 uses the existing analytics and publishing configuration, including:

```text
ANALYTICS_ENCRYPTION_KEY
GOOGLE_ANALYTICS_CLIENT_ID
GOOGLE_ANALYTICS_CLIENT_SECRET
GOOGLE_ANALYTICS_REDIRECT_URI
NEXT_PUBLIC_APP_URL
CRON_SECRET
```

## Installation

1. Confirm H1.7A, H1.7B, and H1.7C1 are deployed.
2. Unzip H1.7C2 directly into the Marketing VIP repository root.
3. Choose **Replace** for the five files listed under **Files replaced**.
4. Apply this migration in Supabase SQL Editor:

```text
db/migrations/20260715_h1_7c2_utm_taxonomy_and_tracking_links.sql
```

5. Commit and push through GitHub Desktop.
6. Confirm the Vercel build succeeds.
7. Open **Measure → UTM Taxonomy**.
8. Review the default mapping and save the workspace source settings.
9. Open an approved LinkedIn, Facebook, or email asset in Publish Center.
10. Confirm the tracked-link preview appears before the live execution button.
11. Execute one controlled test asset.
12. Visit the tracked URL on a site where the Marketing VIP native tracker is installed.
13. Refresh native metrics and synchronize GA4.
14. Confirm the campaign and asset appear in Analytics reporting.

## Recommended first test

Use one approved social post with a plain destination URL already present in the copy.

Expected result:

1. Publish Center shows the original destination.
2. The tracked URL contains one copy of each UTM parameter.
3. Existing nontracking parameters remain.
4. The social payload contains the tracked URL instead of the plain URL.
5. A row appears in `analytics_tracking_links`.
6. The publishing execution run contains `tracking_link_id`, `tracked_url`, and `attribution`.
7. A visit generates native campaign and asset attribution.
8. A later GA4 synchronization resolves the readable campaign/content slugs when GA4 has processed the session.

## Database verification

### Confirm tables and columns

```sql
select account_id, taxonomy_version, default_email_source,
       include_audience_term, append_link_to_social, append_link_to_email
from public.analytics_utm_settings
order by updated_at desc;

select id, campaign_id, asset_id, channel, utm_source, utm_medium,
       utm_campaign, utm_content, utm_term, tracked_url, created_at
from public.analytics_tracking_links
order by created_at desc
limit 20;

select id, asset_id, campaign_id, tracking_link_id,
       destination_url, tracked_url, attribution, status, created_at
from public.publishing_execution_runs
where tracking_link_id is not null
order by created_at desc
limit 20;
```

### Confirm stable slugs

```sql
select id, name, analytics_campaign_slug
from public.campaigns
where analytics_campaign_slug is not null
order by updated_at desc
limit 20;

select id, title, asset_type, analytics_content_slug
from public.generated_assets
where analytics_content_slug is not null
order by updated_at desc
limit 20;
```

### Confirm GA4 reconciliation after synchronization

```sql
select metric_date, source_id, campaign_id, asset_id, channel,
       traffic_source, traffic_medium, sessions_count, conversions_count
from public.analytics_daily_metrics
where campaign_id is not null or asset_id is not null
order by metric_date desc
limit 50;
```

## Behavioral safeguards

- Only `http` and `https` destinations are accepted.
- URL fragments are removed before tracking parameters are generated.
- Telephone, email, and personal-data links are not treated as campaign destinations.
- Existing query parameters are preserved.
- Duplicate UTM/VIP parameters are deleted before canonical values are applied.
- Medium values outside the controlled vocabulary fall back to the channel default.
- The first persisted campaign/content slugs remain stable instead of changing every time a title changes.
- The approved database content remains unchanged.
- If no destination exists, publishing can continue without attribution and returns a visible warning.
- Tracking-link persistence failure is visible and does not falsely claim successful attribution.
- Account RLS isolates taxonomy settings and tracking links.

## Known boundaries

- H1.7C2 covers the current canonical ZapierMCP publishing route used by Publish Center.
- It does not retroactively rewrite links in previously published posts or emails.
- It does not shorten URLs.
- It does not create QR images.
- It does not force UTMs onto WordPress page URLs; WordPress payloads receive VIP identifiers and attribution metadata without polluting internal navigation with standard campaign UTMs.
- GA4 data is not immediate. Campaign/content reconciliation occurs when Google has processed the session and the next Marketing VIP synchronization runs.
- A destination must exist in campaign/asset data, approved content, account publishing settings, account CTA, or account website for a tracked URL to be generated.

## Rollback

### Application rollback

Restore the previous versions of the five replaced files and remove the H1.7C2-only application files.

### Database rollback

Do not drop the tables after real publishing attribution exists. Disable use at the application layer and preserve the audit history.

For a pre-production installation with no real H1.7C2 data, the following removes the new schema:

```sql
alter table public.publishing_execution_runs
  drop column if exists attribution,
  drop column if exists tracked_url,
  drop column if exists destination_url,
  drop column if exists tracking_link_id,
  drop column if exists campaign_id;

drop table if exists public.analytics_tracking_links cascade;
drop table if exists public.analytics_utm_settings cascade;

alter table public.generated_assets
  drop column if exists analytics_content_slug;

alter table public.campaigns
  drop column if exists analytics_campaign_slug;

notify pgrst, 'reload schema';
```

## Next logical analytics release

H1.7C3 can add short branded links, QR-code generation, bulk historical-link creation, additional provider/channel mappings, and attribution QA alerts.
