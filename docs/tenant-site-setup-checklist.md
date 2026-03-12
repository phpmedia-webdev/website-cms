# Tenant site setup checklist

Single reference for setting up a tenant site (fork) of the website-cms application. Use this when deploying a new fork or bringing a new tenant site online.

---

## Prerequisites

- [ ] Template repository cloned/deployed
- [ ] Supabase project access
- [ ] Vercel account (or hosting platform)
- [ ] Client schema name decided (e.g. `client_acme_corp` or `website_cms_template_dev` for template dev). Use underscores, not hyphens.
- [ ] Core env vars ready: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_CLIENT_SCHEMA`, `NEXT_PUBLIC_APP_URL`

---

## Quick start: automated setup (recommended)

Use the automated script for fastest setup:

```bash
pnpm setup-client <schema-name>
```

Or directly:

```bash
pnpm tsx scripts/setup-client-schema.ts <schema-name>
```

**Example:**

```bash
pnpm setup-client client_acme_corp
```

**What it does:**

- Creates the schema
- Runs all migrations (with schema name replacement)
- Grants permissions
- Creates RPC functions
- Inserts default settings
- Enables RLS and policies
- Creates storage bucket
- Refreshes PostgREST cache

**After running the script:**

1. Expose schema in Supabase Dashboard (Step 3 below)
2. Set environment variables (Step 5 below), including SMTP and VAPID if needed
3. Run any additional migrations not in the script (e.g. 116 below)
4. Create superadmin user (Step 6 below)
5. Deploy application (Step 7 below)

**Note:** The script uses `exec_sql` RPC which may not be available in all Supabase projects. If the script fails, use the manual steps below.

---

## Manual setup (if automated script fails)

### Step 1: Create client schema in Supabase

1. Open Supabase Dashboard → SQL Editor
2. Run (replace schema name):

```sql
CREATE SCHEMA IF NOT EXISTS client_acme_corp;
```

**Note:** Schema names must use underscores, not hyphens (e.g. `client_acme_corp` not `client-acme-corp`).

---

### Step 2: Run core migrations

Run these in order in **Supabase Dashboard → SQL Editor**, **replacing `website_cms_template_dev` with your client schema name** in each file:

| Step | File | Action |
|------|------|--------|
| 2.1 | `supabase/migrations/000_create_schema_and_tables.sql` | Replace schema name; copy, run |
| 2.2 | `supabase/migrations/004_expose_schema_permissions.sql` | Replace schema name in GRANT statements; run |
| 2.3 | `supabase/migrations/008_create_settings_rpc.sql` | Replace in SET search_path and FROM clauses (3 places each); run. Alternative: `008b_create_dynamic_settings_rpc.sql` if using dynamic RPCs |
| 2.4 | `supabase/migrations/009_insert_default_settings.sql` | Replace schema name; run |
| 2.5 | `supabase/migrations/010_enable_rls_and_policies.sql` | Replace in all ALTER TABLE and CREATE POLICY; run |
| 2.6 | `supabase/migrations/011_fix_function_search_path.sql` | Replace schema name; run |

For a greenfield tenant, run all migrations in `supabase/migrations/` in numeric filename order, replacing the template schema name where applicable.

---

### Step 3: Expose schema in Supabase Dashboard

1. Go to Supabase Dashboard → **Settings** → **API** → **Exposed Schemas**
2. Add your client schema name (e.g. `client_acme_corp`)
3. Click **Save**
4. Refresh PostgREST cache:

```sql
NOTIFY pgrst, 'reload schema';
```

---

### Step 4: Create storage bucket

1. Go to Supabase Dashboard → **Storage**
2. Create a bucket named: `client-{schema_name}` (e.g. `client-client_acme_corp`)
3. Set to **Public** if needed for media
4. Configure CORS if needed

---

### Step 5: Configure environment variables

Set variables in **Vercel** (and in `.env.local` for local dev). Use the full list below as the source of truth.

#### Review .env.local and create a deployment ENV template

Before deploying, review the variables in **`.env.local`** (project root) and create a template for the deployment platform so nothing is missed:

1. **Review** — Open `.env.local` and note every variable used for this tenant (Supabase, auth, SMTP, Stripe, PWA, download tokens, etc.). Do not copy secret values into docs or the template; use placeholders.
2. **Create a template** — In your deployment ENV location (e.g. Vercel → Settings → Environment Variables, or a secure internal doc), create a checklist or template that lists each variable name and a short note (e.g. “From Supabase Dashboard”, “Stripe webhook signing secret”). This ensures production/preview have every variable the app expects and makes handoff or new tenants easier.
3. **Fill values** — Set the actual values in the deployment platform (Vercel, etc.) for Production and/or Preview/Development as needed. Never commit real secrets to the repo.

#### Setting env variables in Vercel

1. Open your project in the [Vercel Dashboard](https://vercel.com/dashboard).
2. Go to **Settings** → **Environment Variables**.
3. Add each variable one by one:
   - **Key:** exact name (e.g. `NEXT_PUBLIC_SUPABASE_URL`).
   - **Value:** the secret or config value (no quotes unless the value itself must contain spaces).
   - **Environments:** choose Production, Preview, and/or Development as needed (e.g. use Development for `NEXT_PUBLIC_DEV_BYPASS_2FA` only).
4. **Do not add spaces around `=`** — Vercel uses Key and Value fields; only in `.env` files would a stray space break parsing.
5. For **sensitive** values (e.g. `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_API_KEY`, `SMTP_ENCRYPTION_KEY`, `VAPID_PRIVATE_KEY`), avoid logging or exposing them; Vercel marks them as sensitive by default when you add them.
6. After adding or changing variables, **redeploy** the project (Deployments → … → Redeploy) so the new env is picked up.

**Full list of environment variables** (use this for both Vercel and `.env.local`; replace placeholders and redact secrets from docs):

```env
# Supabase (from Supabase project dashboard: https://app.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Client schema (must match schema name in Supabase, e.g. template_dev, client_abc123)
NEXT_PUBLIC_CLIENT_SCHEMA=website_cms_template_dev

# Application URL (use production URL in Vercel, e.g. https://yourdomain.com)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Site name (display name for the tenant)
NEXT_PUBLIC_SITE_NAME=Your Site Name

# Development only: set true to bypass 2FA when NODE_ENV=development (auth still required)
NEXT_PUBLIC_DEV_BYPASS_2FA=false

# PHP-Auth (central auth service)
AUTH_BASE_URL=https://auth.yourdomain.com
AUTH_ORG_ID=your_org_id
AUTH_APPLICATION_ID=your_application_id
AUTH_API_KEY=your_api_key
# Roles scope for website-cms; if 403, set Application type in PHP-Auth to website-cms
AUTH_ROLES_SCOPE=website-cms
# Optional: set to 1 to log role resolution (debug only)
DEBUG_PHP_AUTH_ROLES=0

# SMTP password encryption (required to save SMTP config in Admin). Do not commit the real value.
SMTP_ENCRYPTION_KEY=your_32_char_or_longer_secret

# PWA push (required for admin Status app push). Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_MAILTO=mailto:support@yoursite.com

# Ecommerce / Stripe (only if tenant needs ecommerce). Get keys from https://dashboard.stripe.com/apikeys
# Copy-paste template: docs/env-templates/stripe.env
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
# Webhook signing secret: create endpoint in Stripe Workbench (dashboard.stripe.com/webhooks); subscribe to checkout.session.completed
STRIPE_WEBHOOK_SECRET=whsec_...

# Download links (Step 25). Time-limited download tokens; use SHOP_DOWNLOAD_TOKEN_SECRET or CREDENTIALS_ENCRYPTION_KEY
SHOP_DOWNLOAD_TOKEN_SECRET=your_secret_or_leave_unset_to_use_CREDENTIALS_ENCRYPTION_KEY
```

Checklist for Vercel:

- [ ] All Supabase variables set (URL, anon key, service role key).
- [ ] `NEXT_PUBLIC_CLIENT_SCHEMA` matches the tenant schema name.
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL (e.g. `https://yourdomain.com`).
- [ ] PHP-Auth variables set if using central auth (`AUTH_BASE_URL`, `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`, `AUTH_API_KEY`, `AUTH_ROLES_SCOPE`).
- [ ] `SMTP_ENCRYPTION_KEY` set if the tenant will use SMTP/email notifications.
- [ ] `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` set if using admin Status PWA push.
- [ ] Stripe keys set if tenant needs ecommerce (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`); webhook endpoint configured in Stripe Dashboard (see **Ecommerce / Stripe** below).
- [ ] `SHOP_DOWNLOAD_TOKEN_SECRET` (or `CREDENTIALS_ENCRYPTION_KEY`) set if tenant has downloadable products and time-limited download links.
- [ ] Reviewed `.env.local` and created a deployment ENV template (variable names + notes) in the deployment platform or internal doc so all required vars are set.
- [ ] Redeploy after adding or changing env vars.

**SMTP key generation** (value for `SMTP_ENCRYPTION_KEY`): Use a 32+ character secret. The app also accepts `CREDENTIALS_ENCRYPTION_KEY`. Generate a random key (recommended):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the 64-char result. Or use a long passphrase; if shorter than 32 bytes the app hashes it with SHA-256. **Keep the key secret and consistent** — changing it makes existing encrypted SMTP passwords unreadable.

**VAPID key generation** (values for `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`): Generate once (e.g. when moving to a domain):

```bash
npx web-push generate-vapid-keys
```

Copy the full **Public Key** and **Private Key** into Vercel (or `.env.local`). Use the **same** key pair for the life of the app; changing keys invalidates existing push subscriptions.

**Ecommerce / Stripe (if tenant needs ecommerce):**

1. **API keys:** In [Stripe Dashboard](https://dashboard.stripe.com/apikeys), copy **Secret key** and **Publishable key** (use Test keys for development). Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel (and `.env.local`). Never commit or expose the secret key.
2. **Webhook endpoint (Stripe Workbench):** Use [Stripe Workbench](https://dashboard.stripe.com/webhooks) to manage webhooks. Click **Create destination**:
   - **Endpoint URL:** `https://your-domain.com/api/webhooks/stripe` (replace with the tenant’s production or preview URL).
   - Choose **Webhook** (HTTPS endpoint).
   - **Events:** Select `checkout.session.completed` (and any other events the app uses), then continue and create the destination.
   - In the **Webhooks** tab, open the new destination and reveal **Signing secret** (`whsec_...`). Set `STRIPE_WEBHOOK_SECRET` in Vercel (and `.env.local`). The app uses this to verify that webhook payloads are from Stripe before updating orders.

**Transactional email templates (ecommerce / order emails):**

- Run migration **135_seed_default_email_templates.sql** (see **Additional migrations** above) to pre-populate the **Order confirmation** and **Digital delivery** templates in the tenant schema. After running, **Admin → Marketing → Templates** will list these two templates; the tenant can edit subject (title) and body (placeholders like `{{customer_name}}`, `{{order_id}}`, `{{business_name}}`). If the templates are missing, the app sends a minimal fallback email so the customer still receives a confirmation.

---

### Step 6: Create superadmin user

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Create a new user (or use existing)
3. Update user metadata (replace user ID and schema name):

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'type', 'superadmin',
  'role', 'superadmin',
  'tenant_id', 'client_acme_corp',
  'allowed_schemas', ARRAY['client_acme_corp']
)
WHERE id = 'user-uuid-here';
```

Or use the script: `pnpm run update-user` / `scripts/update-user-metadata.ts` if available.

---

### Step 7: Deploy application

1. Push code to repository
2. Deploy to Vercel (or your platform)
3. Set all environment variables in the deployment platform
4. Verify deployment is live

---

## Additional migrations (run when applicable)

Run in **Supabase SQL Editor**. Replace `website_cms_template_dev` with your tenant schema name where the migration targets the template schema.

**Push subscriptions (PWA)** — Required for admin Status app push notifications:

- [ ] **File:** `supabase/migrations/116_push_subscriptions.sql`
- **Action:** Copy the full contents into SQL Editor. Replace `website_cms_template_dev` with your schema name in `SET search_path` and in `CREATE TABLE ... website_cms_template_dev.push_subscriptions`.
- **Run:** Execute the script.
- Creates table `push_subscriptions` (user_id, endpoint, p256dh, auth) and enables RLS.

- [ ] **Blog list pagination** — **File:** `supabase/migrations/117_get_published_posts_pagination.sql`. Adds offset and count RPCs for `/blog` pagination. Replace schema name if different; run in SQL Editor.

- [ ] **Default email templates** (if using ecommerce or transactional email) — **File:** `supabase/migrations/135_seed_default_email_templates.sql`
- **Action:** Copy the full contents into SQL Editor. Replace `website_cms_template_dev` with your schema name in `SET search_path` and in all `website_cms_template_dev` table references.
- **Run:** Execute the script after migration 134 (template content type) has been run.
- **What it does:** Inserts two template content rows: **Order confirmation** (slug `order-confirmation`) and **Digital delivery** (slug `digital-delivery`). These are used when an order is paid or completed; tenants can edit them in **Admin → Marketing → Templates**. Placeholders like `{{customer_name}}`, `{{order_id}}`, `{{order_total}}`, `{{access_link}}`, `{{business_name}}`, `{{business_email}}` are replaced at send time.

Add other migrations here as they become required (e.g. run all files in `supabase/migrations/` in numeric order for a new tenant).

---

## Step 8: Verify setup

**Authentication**

- [ ] Visit `https://clientdomain.com/admin/login` (or your app URL)
- [ ] Log in with superadmin credentials
- [ ] Verify dashboard loads

**Design system**

- [ ] Check browser console for errors
- [ ] Verify CSS variables and Google Fonts load

**Database**

- [ ] Create a blog post or upload media; confirm data is in the correct schema

**PWA (on HTTPS)**

- [ ] Open `/status`, click “Enable push notifications” if VAPID is set
- [ ] Add to home screen and confirm install; trigger a form submission (with PWA enabled in Notifications settings) to test push

---

## Step 9: Post-setup configuration

- [ ] **Design system** (Admin → Settings) — Fonts, color palette, site name/description
- [ ] **Site / General** — Site URL, PWA/Status App Install (name, colors, icon) if desired
- [ ] **Notifications** (Admin → Settings → Notifications) — SMTP, notification actions, link to Status page
- [ ] **Integrations** (Superadmin → Integrations) — Google Analytics, VisitorTracking, SimpleCommenter, etc., if used
- [ ] **2FA** (Admin → Settings → Security) — Enroll TOTP; test login flow

---

## Troubleshooting

**Schema not found**

- Verify schema is in Dashboard → Settings → API → Exposed Schemas
- Run: `NOTIFY pgrst, 'reload schema';`
- Check Step 2.2 permissions

**Settings not loading**

- Verify RPCs exist: `SELECT * FROM get_settings(ARRAY['design_system.theme']);`
- Check `{schema}.settings` has data
- Confirm `NEXT_PUBLIC_CLIENT_SCHEMA` matches the actual schema

**Authentication issues**

- Confirm user metadata (Step 6) is set correctly
- Check middleware allows the route; verify Supabase keys

**SMTP / encryption (“Encryption not configured” or “SMTP_ENCRYPTION_KEY must be set”)**

- **Restart the dev server** — Next.js loads `.env.local` only at startup. After adding or changing the key, stop the server (Ctrl+C) and run `pnpm run dev` again.
- **No space around `=`** — Use `SMTP_ENCRYPTION_KEY=Passphrase` not `SMTP_ENCRYPTION_KEY = Passphrase`.
- **Non-empty value** — The value must not be empty.
- **File and name** — File must be `.env.local` in the project root; variable name exactly `SMTP_ENCRYPTION_KEY` or `CREDENTIALS_ENCRYPTION_KEY`.

**Push not sending**

- If `VAPID_PUBLIC_KEY` or `VAPID_PRIVATE_KEY` is missing or empty, the server will not send push (no error; notifications simply won’t be delivered).
- On localhost, push subscription and sending may not work end-to-end; deploy to HTTPS to test.

---

## Quick reference: schema name replacement

When setting up a new client, replace `website_cms_template_dev` with your client schema name in:

1. `000_create_schema_and_tables.sql` — All table references
2. `004_expose_schema_permissions.sql` — GRANT statements
3. `008_create_settings_rpc.sql` — SET search_path and FROM (3 places each)
4. `009_insert_default_settings.sql` — INSERT statements
5. `010_enable_rls_and_policies.sql` — ALTER TABLE and CREATE POLICY
6. `011_fix_function_search_path.sql` — Schema name
7. `116_push_subscriptions.sql` — SET search_path and CREATE TABLE schema prefix
8. **Env:** `NEXT_PUBLIC_CLIENT_SCHEMA`

Use your editor’s Find and Replace to replace all instances in each file before running.

---

## Adding new tables after initial setup

If PostgREST does not see new tables even with the schema exposed:

- Use **RPC functions in the `public` schema** that operate on the tenant schema (same pattern as settings and color_palettes).
- Create the table migration with permissions and RLS; create the RPC in `public`; call `.rpc()` from the app. Test writes with `.from()` if needed, then add RPC for reads.

---

## Notes

- Each tenant has its own isolated schema.
- RPC functions may be per-schema or dynamic (schema name parameter).
- Storage buckets are per client (`client-{schema_name}`).
- Environment variables are per deployment.
- Superadmin users can access multiple schemas via `allowed_schemas` in metadata.

---

## Reference

- **Legacy / archived:** Original checklist: `docs/archived/zzz-CLIENT_SETUP_CHECKLIST.md`. Env templates (merged into this doc): `docs/archived/env-encryption-key-template.md`, `docs/archived/env-vapid-keys-template.md`.
- **Migrations:** `supabase/migrations/` — run in filename order; replace schema name where migrations reference `website_cms_template_dev`.
