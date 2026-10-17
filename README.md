# Scent Atlas

**A fragrance discovery storefront for small-format samples.**

[Open live demo](https://scent-atlas-virid.vercel.app) · [Administrator sign-in](https://scent-atlas-virid.vercel.app/admin)

A full-stack portfolio project built with **Next.js, React, TypeScript, Supabase, and Node.js**. Browse 30 fragrances, filter by an editorial scent family, choose a 2/5/10 mL format, build a persistent shopping bag, and place a server-priced demo order with receipt lookup.

![Scent Atlas desktop storefront](docs/desktop.png)

[Mobile preview](docs/mobile.png) Â· [Catalog provenance](docs/catalog-sources.md) Â· [Verification notes](docs/verification.md) · [Architecture decisions](docs/architecture.md) · [Deployment and admin setup](docs/deployment.md)

## Features

- Search by fragrance or house, filter by scent family, and sort by name or sample price.
- Product details with sample size selection and consistent integer-cent pricing.
- Shopping bag persisted in browser storage, with quantity changes and removal.
- Server-side product, size, quantity, duplicate-line, and request validation. Submitted prices are ignored.
- Supabase-backed cloud orders, with a no-account local storage adapter for offline review.
- Idempotent checkout retries and optimistic concurrency for order status updates.
- An administrator order desk at `/admin`, with Supabase Auth role checks and protected session cookies.
- Native modal dialogs, keyboard dismissal, focus restoration, responsive layouts, and reduced-motion support.
- Original CSS decant illustrations; no retailer product photography or private store assets.

## Run locally

Requires **Node.js 22.18+** and npm.

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:3000. No API keys or external database accounts are required.

```bash
npm test
npm run typecheck
npm run build
npm start

# Browser/API end-to-end tests (after build)
npx playwright install chromium
npm run test:e2e
```

## How it works

```text
Browser                         Next.js / Node.js
Catalog + search + size choice   Shared product catalog and pricing
Persistent bag (localStorage) -> POST /api/orders -> Validate + calculate -> Supabase PostgreSQL (cloud) / JSON (local)
Order reference              -> GET /api/orders?id=<UUID> -> Receipt / demo status
```

`lib/catalog.json` holds the 30 product records. `lib/commerce.ts` is shared, deterministic pricing logic; the server independently recomputes all amounts. `app/api/orders/route.ts` creates and retrieves demo orders. `lib/orders.ts` owns file storage and write serialization. `app/page.tsx` implements the storefront.

### Storage and hosting

Cloud mode persists orders in Supabase PostgreSQL and supports serverless deployment. Public clients have no direct order-table access; the server uses purpose-specific, token-guarded RPCs. Database uniqueness protects checkout retries, and row versions protect concurrent updates.

For local mode, leave cloud variables unset. `.data/` stores orders on retained disk; `ORDER_DATA_DIR` selects a different directory. Local file writes target one Node process and reject new orders once 10,000 records are reached rather than silently deleting receipts.

See [deployment and admin setup](docs/deployment.md) for environment configuration and creating an administrator. There are no default cloud administrator credentials. The app does not collect shopper addresses, payment details, or email. Demo receipts are accessible by opaque order reference.

## Catalog and demonstration scope

The collection is inspired by FragranceNet's best-selling collection pages, reviewed October 17, 2026. It is **not a verified top-30 sales ranking**. See [catalog sources](docs/catalog-sources.md) for provenance and editorial choices.

All prices, decant packaging, delivery costs, and orders are illustrative. No real payment, shipment, brand affiliation, official sample availability, or inventory is represented. The checkout does not call payment or email services.

This is a clean portfolio reimplementation of a previous storefront concept. It contains no prior private repository history, customer records, personal payment codes, or original commercial assets. No real sales are claimed.

## Checks

Six unit/storage tests cover pricing, invalid input, concurrent checkout retries, stored lookup, status transitions, and stale updates. Three Playwright tests cover shopping, administration, authorization, idempotency, and mobile behavior. Production build and UI/API smoke checks are recorded in [verification notes](docs/verification.md).
