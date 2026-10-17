# Verification notes

Checked October 17, 2026 on Node.js 24 with a local Next.js production server.

## Automated checks

- TypeScript compilation and optimized production build pass.
- Six Node/storage test cases pass (including concurrent idempotency and stale-write rejection): server-authoritative prices, free-delivery calculation, malformed bags, invalid catalog/size/quantity/duplicate selections, and size multipliers.
- API smoke checks pass: create an order with same-origin browser headers, ignore an injected client price, retrieve the saved receipt, reject unsupported sizes and empty bags, reject cross-origin requests, and reject malformed order references.

## Browser checks

- Desktop viewport: 1440 Ã— 1000.
- Mobile viewport: 390 Ã— 844; document scroll width equals viewport width, with 30 catalog cards rendered.
- Search for Creed yields one card, Aventus.
- Selecting the 5 mL Aventus variant displays $30.45.
- Add-to-bag and bag persistence after reload checked.
- Browser checkout saves an order and displays the reference and server total.
- Order lookup returns the same saved receipt.
- Modal closes using Escape.

The browser checkout initially exposed a local origin-normalization mismatch; the handler now validates the incoming Host header and protocol, and browser checkout was retested successfully. The initial missing favicon was replaced with an original SVG app icon.

## Limits

This is not a penetration test, WCAG certification, payment validation, load test, or multi-instance durability test. File persistence targets one Node process on retained disk. Supabase administrator authentication is implemented; no real payment, shipping, fulfillment, customer account ownership, stock integration, or email delivery is implemented.

## Persistence and administration upgrade

Three Playwright tests pass against an isolated local production build: the shopper creates an order, the administrator signs in and updates it, and customer lookup reflects the change; API authorization/idempotency failures are checked; mobile filters and layout are checked. E2E runs use test-only local credentials and do not use live secrets.

Live Supabase smoke tests pass for order creation, repeated-key lookup, server price calculation, persisted receipt retrieval, status update, and stale-version rejection. Direct anonymous table access and invalid RPC gateway tokens were tested and denied. The cloud database is a dedicated project. A real administrator must be created by the owner; live Supabase password login has not been claimed as verified by the offline E2E suite.

## Deployment

Vercel reports the application deployment for commit `dd16db7` as **READY** at https://scent-atlas-virid.vercel.app. The local production build, E2E workflow, and actual Supabase persistence were verified separately; no end-to-end hosted Supabase administrator password login is claimed before the owner provisions an administrator account.
