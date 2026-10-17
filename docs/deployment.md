# Database, administration, and deployment

## Cloud mode

Apply the migrations in `supabase/migrations/` to a dedicated Supabase project. The public order table has RLS enabled and no public read/write policies. Direct `anon` and `authenticated` table access is revoked.

Generate a random gateway token (at least 32 random bytes). Store its SHA-256 hex digest in `scent_atlas_private.access` using trusted SQL, with `singleton=true`; keep the original token only in server environment variables. The live project's bootstrap has already been completed; **do not replace its token or insert another row during normal deployments**.

Set these Vercel variables for the intended environment, then redeploy:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_ORDER_TOKEN` (sensitive; never prefix with `NEXT_PUBLIC_`)

The app uses purpose-specific RPCs rather than a project-wide service-role key. Each RPC requires the server-held token; the database stores only its digest. These RPCs are executable by `anon` so the server can use a publishable key, but an unauthenticated caller without the separate token cannot operate them. Calls carry no customer Supabase session.

The token grants order creation, lookup, listing, and status changes, so treat it as a privileged secret even though it does not grant project-wide access. Rotating it requires updating both its digest and the deployment environment. Never put it in SQL migration files, screenshots, logs, or Git.

Partial cloud configuration fails closed. Vercel deployments never fall back to filesystem storage. Local development with all cloud variables unset uses serialized file storage.

## Administrator account

1. In the dedicated Supabase project's **Authentication → Users**, create the intended administrator with a password chosen by the owner. Mark the email as confirmed using the dashboard's account-creation option. This avoids a signup form that could grant itself administrator access.
2. Set that user's **app metadata** to include `"role": "admin"`. Use the dashboard's metadata controls, or trusted SQL targeting the exact account:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where id = '<confirmed-user-id>'::uuid;
```

3. Open `/admin` and sign in with that account. Existing visitors cannot self-register as an administrator.

The server signs in through Supabase Auth, stores the access token in an HttpOnly, SameSite=Strict cookie restricted to `/api/admin`, and checks `/auth/v1/user` plus current `app_metadata.role` on each protected request. Cloud cookies are Secure. No refresh token is stored; sessions expire after at most one hour and require signing in again. Logging out removes the browser cookie; it does not revoke a previously copied bearer token before expiry.

For offline local review only, unset the cloud variables and provide `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` (minimum 32 characters). This fallback is disabled on Vercel. The automated E2E suite supplies its own test-only fixtures; they are not deployed credentials.

## Security checks and limits

Verified: anonymous direct table reads are denied; invalid gateway tokens are rejected; admin routes reject missing sessions; client prices are ignored; retries are idempotent; stale updates are rejected. The RPCs use fixed search paths and schema-qualified private authorization checks.

Supabase's advisor flags the deliberately callable `SECURITY DEFINER` RPCs and the RLS-enabled table with no policies. These are intentional in this token-guarded design, not a claim that the advisor is clean. See [anonymous definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [RLS with no policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Review the token guard when adding any RPC; do not grant direct table access to silence these notices.

This is a demonstration, not a production commerce launch. Order IDs act as bearer references for non-personal receipts. Public order creation is unauthenticated and requires platform-level rate limits before exposure to substantial traffic; the login attempt limiter is process-local and is not a distributed control. No real payments, addresses, shipment, inventory reservation, or customer account ownership are implemented.

## Current demonstration

The deployed demonstration is https://scent-atlas-virid.vercel.app. Git-triggered automatic deployment is disabled in `vercel.json`; a documentation-only push does not replace the tested deployment. Deploy updates explicitly after checking the target commit and environment.
