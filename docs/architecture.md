# Design decisions

## Server-owned prices

The browser submits product IDs, sizes, and quantities. The server reloads the catalog and computes totals in integer cents. Client-supplied prices are ignored, avoiding price tampering and floating-point currency accumulation. The same pure pricing function drives UI estimates and server validation.

## Idempotent checkout

The browser keeps a UUID checkout key for each bag fingerprint in session storage. A retry after a timeout or refresh reuses the key. Both storage adapters return the existing order for the same key and request hash, or reject a reused key with different contents. Supabase enforces uniqueness in the database, so parallel serverless instances cannot create duplicate rows for a retry. A deliberately new key still creates a new order.

## Explicit status workflow

```text
Received → Preparing → Ready → Completed
    ↓          ↓
 Cancelled  Cancelled
```

All user-facing status labels include “Demo”. Terminal states cannot reopen. The browser sends the version it last read; the server and database enforce compare-and-swap updates so stale tabs cannot overwrite newer changes. The local adapter serializes writes; the cloud adapter checks row versions in a single SQL update.

## Two persistence adapters

Local mode needs no external accounts and uses an ignored JSON file for reviewer convenience. Cloud mode uses Supabase PostgreSQL through scoped, token-guarded RPCs. The order token stays on the server; public keys alone cannot read or change orders. The file adapter is never used on Vercel.

## Authorization lives on the server

The admin UI is only a view. Every listing/update route checks a verified Supabase session and `app_metadata.role`. User-editable `user_metadata` is not an authorization source. The RPC gateway token authenticates the application to its data store; the admin session authenticates the human operator to the application.

## Test boundaries

Unit tests verify price calculations, serialization, idempotency, transitions, and optimistic concurrency. Browser/API E2E tests verify the shopper-to-admin-to-shopper journey against a real local production build. Separate live Supabase smoke tests verify actual cloud persistence and permission denial; local E2E success alone is not reported as cloud Auth verification.
