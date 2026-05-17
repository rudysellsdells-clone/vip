# VIP Product Portability Readiness

## Goal

Make VIP easier to sell, duplicate, deploy, or white-label later without rewriting the app.

## What This Patch Starts

This patch starts the portability foundation by adding:

```text
src/lib/config/product.ts
.env.example
```

The top navigation now reads app/brand names from public product config instead of hard-coding Rudy-specific names.

## Current Portable Configuration

Use these environment variables:

```bash
NEXT_PUBLIC_PRODUCT_APP_NAME="Rudy's VIP"
NEXT_PUBLIC_PRODUCT_BRAND_NAME="Web Search Pros OS"
NEXT_PUBLIC_PRODUCT_COMPANY_NAME="Web Search Pros"
NEXT_PUBLIC_PRODUCT_OWNER_NAME="Rudy"
NEXT_PUBLIC_PRODUCT_SUPPORT_EMAIL="support@example.com"
NEXT_PUBLIC_PRODUCT_PRIMARY_SERVICE_CATEGORY="marketing"
```

For a future customer or resale version, these can become:

```bash
NEXT_PUBLIC_PRODUCT_APP_NAME="Client Growth OS"
NEXT_PUBLIC_PRODUCT_BRAND_NAME="Client Marketing Command Center"
NEXT_PUBLIC_PRODUCT_COMPANY_NAME="Client Company"
NEXT_PUBLIC_PRODUCT_OWNER_NAME="Client Owner"
NEXT_PUBLIC_PRODUCT_SUPPORT_EMAIL="support@clientcompany.com"
NEXT_PUBLIC_PRODUCT_PRIMARY_SERVICE_CATEGORY="marketing"
```

## Recommended Selling Models

### Option 1: Single-tenant deployments

Each client gets their own:

- Vercel project
- Supabase project
- Integration keys
- Environment variables
- Commercial seed data

This is the easiest sellable model first.

### Option 2: Multi-tenant SaaS

One shared app supports multiple companies.

This needs more work:

- organizations table
- organization_members table
- team roles
- workspace-level permissions
- billing
- per-workspace integration settings
- per-workspace seed data
- usage limits

Do not jump to this until the product is proven.

## What Still Needs To Become Portable

### 1. Hard-coded copy audit

Search for these strings and move them into config, templates, or seed data:

```text
Rudy
Rudy's
Web Search Pros
Marketing Twin
Rudy McCormick
```

### 2. Commercial foundation templates

The current service lines, buyer segments, and offers are specific to Web Search Pros.

For resale, create template packs:

```text
Marketing Agency Pack
Contractor Growth Pack
Local Business Pack
Dental Marketing Pack
Legal Marketing Pack
Manufacturing Growth Pack
```

### 3. Integration portability

Each deployment needs its own:

```text
OPENAI_API_KEY
GALAXYAI_API_KEY
ZAPIER_MCP_SERVER_URL
Facebook Page connection
Gmail connection
```

Never share Rudy's production integration keys with a customer deployment.

### 4. Data lifecycle

Before selling, add:

- export customer data
- delete customer data
- archive workspace
- reset demo data
- onboarding seed wizard

### 5. Licensing and billing

Eventually add:

- Stripe subscription
- license status
- feature flags
- usage limits
- onboarding checklist

## Recommended Roadmap

### Phase 1 — Current patch

- Add product config
- Add env example
- Reduce hard-coded product names in navigation
- Add portability docs

### Phase 2 — White-label setup

- Product settings page
- Upload logo
- Primary color setting
- Brand copy settings
- Template pack selector

### Phase 3 — Single-tenant resale

- Deployment guide
- Seed wizard
- Customer onboarding checklist
- Environment checklist
- Demo data reset

### Phase 4 — SaaS

- Organizations
- Roles
- Billing
- Per-workspace integrations
- Usage-based limits
