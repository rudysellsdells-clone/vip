# Brave Discovery Broader Matching Fix

## Problem

The Brave discovery section appears, but it does not find/save opportunities.

## Cause

The first filter was too conservative. It only saved results that clearly contained directory/submission language. Brave often returns useful directory-like pages with vague snippets, so VIP was throwing away too many results.

## Fix

This patch broadens the discovery filter.

Updated files:

```text
src/lib/link-builder/directory-discovery.ts
src/app/api/link-builder/opportunities/discover/route.ts
src/components/link-builder/BraveDiscoveryForm.tsx
```

## What Changed

### 1. Broader candidate matching

VIP now keeps results when:

- title/snippet/url includes directory/listing/profile/member signals
- URL path looks like a directory/listing/profile path
- the search query itself has strong directory intent

This means a search like:

```text
marketing agency directory
```

can save broader review candidates instead of returning zero.

### 2. Better starter queries

The form now uses broader queries:

```text
marketing agency directory
SEO agency directory
web design agency directory
digital marketing agency directory
business directory marketing agency
agency directory get listed
marketing company directory
professional services directory marketing
```

### 3. Raw result count

The discovery route now returns:

```text
rawResultCount
```

So you can tell whether Brave returned results but VIP filtered them out.

### 4. Better user messages

The form now reports:

```text
Brave returned X raw results
Found Y candidates
Saved Z opportunities
Skipped N duplicates
```

## Apply

1. Replace the included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Broaden Brave Link Builder discovery matching
```

## Test

Try these queries:

```text
marketing agency directory
SEO agency directory
web design agency directory
digital marketing agency directory
business directory marketing agency
```

Start with 20 results.

## Note

This patch still does not auto-submit. It only broadens discovery so Rudy can review more possible opportunities.
