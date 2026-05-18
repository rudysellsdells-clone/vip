# VIP Link Builder Brave Discovery

## Goal

Add automatic directory opportunity discovery to the Directory Link Builder using Brave Search API.

## What This Adds

### New files

```text
src/lib/link-builder/brave-search.ts
src/lib/link-builder/directory-discovery.ts
src/app/api/link-builder/opportunities/discover/route.ts
src/components/link-builder/BraveDiscoveryForm.tsx
```

### Updated files

```text
src/app/(app)/link-builder/page.tsx
.env.example
```

## Environment Variable

Add this in Vercel:

```bash
BRAVE_SEARCH_API_KEY=
```

## How It Works

On `/link-builder`, a new section appears:

```text
Discover directory opportunities
```

The workflow:

```text
Rudy enters a search query
→ VIP calls Brave Web Search
→ VIP filters directory-like results
→ VIP scores relevance, quality, and risk
→ VIP skips duplicates
→ VIP saves new opportunities to directory_opportunities
```

## Search Provider

This uses Brave Web Search API:

```text
GET https://api.search.brave.com/res/v1/web/search
```

With:

```text
X-Subscription-Token: BRAVE_SEARCH_API_KEY
```

## Good Starter Queries

```text
marketing agency directory submit listing
SEO agency directory add business
web design agency directory add company
digital marketing directory submit site
local business directory add listing marketing agency
```

## What It Filters For

VIP keeps results that look like:

```text
directory
add listing
submit listing
add business
claim listing
business listing
company profile
agency directory
member directory
vendor directory
resource directory
citation
chamber
association
```

VIP rejects or ignores spammy patterns like:

```text
buy backlinks
link package
PBN
casino
adult
payday
crypto
guest post marketplace
cheap backlinks
```

## No Database Migration Required

This patch uses the existing Link Builder table:

```text
directory_opportunities
```

So the original Directory Link Builder SQL migration still needs to exist, but no new table is added here.

## Apply

1. Add/replace included files.
2. Add `BRAVE_SEARCH_API_KEY` in Vercel.
3. Commit.
4. Push.
5. Redeploy Vercel.

Suggested commit message:

```text
Add Brave discovery for Link Builder
```

## Test

1. Open `/link-builder`.
2. Find **Discover directory opportunities**.
3. Search:

```text
marketing agency directory submit listing
```

4. Confirm the opportunity queue fills with discovered candidates.
5. Review, score, approve, and prepare submissions as normal.

## Notes

This does not auto-submit to directories. It only automates discovery, filtering, scoring, deduping, and saving opportunities for review.
