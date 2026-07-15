# H1.7B — Analytics Collection and GA4 Connection

## Status

**Built:** direct-unzip patch created.

H1.7B turns the H1.7A data model into an operational hybrid analytics system. Marketing VIP can now collect first-party website events, roll those events into daily reporting, authorize a Google account, select an accessible GA4 property, and import 30 days of GA4 reporting data.

## Dependencies

Apply H1.7A before H1.7B:

1. `20260715_h1_7a_analytics_foundation.sql`
2. `20260715_h1_7b_analytics_collection_and_ga4.sql`

H1.7B replaces the H1.7A Analytics page and CSS. It also replaces `SidebarNav.tsx` to add the permanent **Measure → Analytics** navigation entry.

## What this patch adds

### Marketing VIP Native

- Account-specific, rotatable collection keys
- Origin-restricted public event ingestion
- A lightweight JavaScript tracker served by Marketing VIP
- Automatic tracking for:
  - Page views
  - Campaign visits
  - Engaged visits
  - CTA clicks
  - Telephone clicks
  - Email clicks
  - Form starts
  - Form submissions
  - Downloads
- Public collector rate limiting
- Event deduplication
- Campaign and generated-asset UUID validation
- First-party daily reporting rollups
- Manual dashboard refresh for native metrics

The tracker does not collect form values, email addresses, telephone numbers, IP addresses, or page text. Landing-page query strings are reduced to approved campaign and UTM parameters before storage.

### Google Analytics 4

- Server-side Google OAuth authorization
- Signed OAuth state protection
- AES-256-GCM encryption for Google access and refresh tokens
- Server-only OAuth credential table
- Google Analytics account and property discovery
- GA4 property selection
- Initial 30-day synchronization
- Manual 30-day refresh
- Cached reporting for:
  - Users
  - Sessions
  - Engaged sessions
  - Page views
  - Default channel group
  - Session source
  - Session medium
  - Key events
  - Revenue

### User experience

- Native and GA4 setup controls inside `/analytics`
- Copyable website tracking snippet
- Tracking-key rotation
- Connection status and error states
- Read-only behavior for non-manager account members
- Permanent Analytics navigation entry

## Files added

- `db/migrations/20260715_h1_7b_analytics_collection_and_ga4.sql`
- `src/lib/analytics/crypto.ts`
- `src/lib/analytics/google.ts`
- `src/lib/analytics/ga4-sync.ts`
- `src/lib/analytics/server.ts`
- `src/components/analytics/AnalyticsSetupPanel.tsx`
- `src/app/api/analytics/native/source/route.ts`
- `src/app/api/analytics/collect/route.ts`
- `src/app/api/analytics/tracker.js/route.ts`
- `src/app/api/analytics/rollup/route.ts`
- `src/app/api/analytics/ga4/connect/route.ts`
- `src/app/api/analytics/ga4/callback/route.ts`
- `src/app/api/analytics/ga4/property/route.ts`
- `src/app/api/analytics/ga4/sync/route.ts`

## Files replaced

- `src/app/(app)/analytics/page.tsx`
- `src/app/(app)/analytics/Analytics.module.css`
- `src/components/layout/SidebarNav.tsx`

## Environment variables

Add these in Vercel for Production, Preview, and Development as appropriate.

```text
ANALYTICS_ENCRYPTION_KEY=<32-byte base64 or 64-character hex key>
GOOGLE_ANALYTICS_CLIENT_ID=<Google OAuth web client ID>
GOOGLE_ANALYTICS_CLIENT_SECRET=<Google OAuth web client secret>
GOOGLE_ANALYTICS_REDIRECT_URI=https://vip-theta-eight.vercel.app/api/analytics/ga4/callback
NEXT_PUBLIC_APP_URL=https://vip-theta-eight.vercel.app
CRON_SECRET=<long random secret>
```

Generate the analytics encryption key locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Generate a separate cron secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Do not reuse the Google client secret or Supabase service-role key as the analytics encryption key.

## Google Cloud setup

1. Open or create the Google Cloud project that will own Marketing VIP's Google Analytics connection.
2. Enable:
   - Google Analytics Admin API
   - Google Analytics Data API
3. Configure the OAuth consent screen.
4. Create an OAuth client with application type **Web application**.
5. Add this exact authorized redirect URI:

```text
https://vip-theta-eight.vercel.app/api/analytics/ga4/callback
```

The protocol, hostname, path, capitalization, and trailing slash behavior must match the `GOOGLE_ANALYTICS_REDIRECT_URI` environment value exactly.

While the OAuth application is in testing mode, add the Google accounts that will test the connection as test users.

## Installation

1. Confirm H1.7A is already installed.
2. Unzip H1.7B directly into the repository root.
3. Choose **Replace** for the three existing files listed above.
4. Apply this migration in Supabase SQL Editor:

```text
db/migrations/20260715_h1_7b_analytics_collection_and_ga4.sql
```

5. Add the environment variables in Vercel.
6. Redeploy the application.
7. Confirm the Vercel build succeeds.
8. Open **Measure → Analytics**.

## Native analytics activation

1. Enter the account website URL.
2. Select **Enable Native Analytics**.
3. Copy the generated script.
4. Place it once before the website's closing `</head>` tag.
5. Visit the tracked website in a browser that is not sending Do Not Track or Global Privacy Control.
6. Return to Marketing VIP and select **Refresh Native Metrics**.

Example installation:

```html
<script async src="https://vip-theta-eight.vercel.app/api/analytics/tracker.js?key=vip_EXAMPLE_KEY"></script>
```

The real key must come from the account's Analytics setup panel.

### Custom events

The tracker exposes:

```javascript
window.vipTrack("conversion_recorded", {
  content_type: "consultation"
}, {
  value: 500,
  currencyCode: "USD"
});
```

Only event names in the H1.7A canonical taxonomy are accepted. Property names are allowlisted by the collector.

### Optional markup

Track a primary CTA:

```html
<a href="/schedule" data-vip-cta>Schedule a Consultation</a>
```

Track a supported custom event:

```html
<button data-vip-event="consultation_scheduled">Confirm Appointment</button>
```

## GA4 connection

1. Open **Measure → Analytics** as an account owner or administrator.
2. Select **Connect Google Analytics**.
3. Approve read-only Google Analytics access.
4. Select the correct GA4 property.
5. Select **Use Selected Property**.
6. Marketing VIP will attempt an initial 30-day synchronization.
7. Use **Sync Last 30 Days** for a manual refresh.

OAuth tokens are encrypted before storage and cannot be read through authenticated Supabase queries.

## Native rollup endpoint

Manual account-scoped refresh is available from the Analytics page.

A scheduler may also call:

```text
GET /api/analytics/rollup
Authorization: Bearer <CRON_SECRET>
```

A scheduled request rolls up all active native analytics sources for yesterday and today. No scheduler configuration is added automatically by this patch.

## Verification checklist

### Build

- Run `npm run build`.
- Run `npm run typecheck` when practical.
- Confirm no additional npm package installation is required.

### Database

- Confirm `analytics_data_sources` has `collection_key` and `key_rotated_at`.
- Confirm `analytics_oauth_credentials` exists.
- Confirm authenticated users cannot select from `analytics_oauth_credentials`.
- Confirm `rollup_native_analytics` exists and is executable only by the service role.

### Native collector

- Enable a native source for an account.
- Confirm a `vip_` collection key is generated.
- Install the snippet on the configured hostname.
- Confirm `page_view` reaches `analytics_events`.
- Confirm a request from an unapproved hostname receives HTTP 403.
- Confirm telephone and email link values are not stored.
- Confirm form field values are not stored.
- Confirm duplicate event IDs do not create duplicate rows.
- Run **Refresh Native Metrics** and confirm dashboard totals populate.

### GA4

- Confirm the OAuth redirect reaches Google.
- Confirm callback state validation succeeds.
- Confirm accessible GA4 properties are listed.
- Select a property and confirm the initial sync returns data.
- Confirm `analytics_daily_metrics` contains rows for the GA4 source.
- Confirm tokens in `analytics_oauth_credentials` begin with the encrypted `v1.` format rather than readable OAuth tokens.

### Account scope

- Switch between two accounts and confirm keys, properties, events, and metrics remain isolated.
- Confirm a viewer can read analytics but cannot change sources.
- Confirm an owner or admin can configure connections.

## Known H1.7B boundaries

- Native reporting is refreshed manually or through the rollup endpoint; automated scheduling is planned for H1.7C.
- GA4 synchronization is manual after the first property selection; recurring GA4 sync is planned for H1.7C.
- GA4 key events map to conversions. They do not automatically populate the Marketing VIP lead count.
- GA4 campaign rows do not yet map to Marketing VIP campaign and generated-asset UUIDs.
- The native source initially allows the configured hostname and its `www` equivalent. Additional domains require a future settings control.
- The tracker respects Do Not Track and Global Privacy Control. The customer remains responsible for any consent banner or regional privacy requirements applying to their website.

## Rollback

### Application rollback

Restore the previous versions of:

- `src/app/(app)/analytics/page.tsx`
- `src/app/(app)/analytics/Analytics.module.css`
- `src/components/layout/SidebarNav.tsx`

Remove the H1.7B-only files listed under **Files added**.

### Database rollback

Only use before OAuth credentials or real analytics data exist:

```sql
drop function if exists public.rollup_native_analytics(date, date, uuid);
drop table if exists public.analytics_oauth_credentials cascade;
drop index if exists public.analytics_data_sources_collection_key_unique;
alter table public.analytics_data_sources
  drop column if exists collection_key,
  drop column if exists key_rotated_at;
notify pgrst, 'reload schema';
```

After real events or OAuth credentials exist, disable the sources in the application instead of dropping data.

## Next patch: H1.7C

H1.7C should add:

1. Scheduled native rollups and recurring GA4 synchronization.
2. Campaign and generated-asset identifiers in links created by Marketing VIP.
3. Campaign-level and asset-level performance pages.
4. Date-range controls and source filtering.
5. Sync health history and retry visibility.
6. Conversion-goal management.
