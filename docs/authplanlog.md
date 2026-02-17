# Final Step-by-Step Plan: PHP-Auth and Website-CMS Integration

---

## Section 1: Step-by-Step Plan — Modify the PHP-Auth App

**Scope:** Repurpose PHP-Auth so it runs in parallel to website-cms: global view of organizations, applications, roles, users (including GPUMs), single audit log, break-glass, and MFA for Superadmin-only access. Remove the old "multi-tenant component web apps" auth model. Preserve and rely on `auth_users`; other data can be cleaned or restructured. **No session carry-over between PHP-Auth and website-cms:** PHP-Auth requires its own login and MFA; auth does not persist from website-cms to PHP-Auth or from PHP-Auth to website-cms.

**API keys:** PHP-Auth **generates and stores** all API keys for tenant applications (e.g. website-cms forks). Consuming apps (website-cms) **do not create** API keys locally; they **receive** the key from PHP-Auth at registration and **store** it in env. This keeps a single source of truth, secure generation, and centralized revoke/rotate.

### 1.1 Data and Schema Cleanup

**1. Preserve `auth_users` (and Supabase Auth link)**

- Treat as source of truth for identity. Do not wipe.
- Ensure `supabase_user_id` (or equivalent) stays and is used for linking.

**2. Audit and clean non-user tables**

- Review: `organizations`, `auth_applications`, `auth_roles`, `auth_user_organizations`, `auth_user_applications`, `auth_component_access`, `audit_logs`, invites, sessions, failed logins, security events, API usage.
- Remove or simplify anything that only supported the old "multi-tenant component web apps" auth (e.g. component access, app-specific tokens for CRM/CMS/E‑comm as separate apps).
- Delete mock or obsolete data; keep only schema/columns needed for the new model.
- Document which tables are kept, which are dropped, and any migrations.

**3. Simplify roles to match website-cms and GPUM**

- Remove or repurpose old role definitions that were for the former component apps.
- Define/seed roles that reflect: **Superadmin** (same as website-cms), admin-style roles (e.g. creator, viewer, editor, client_admin) used by website-cms and other apps, and **GPUM** (General Purpose User Member — end-user with account, not admin).
- Roles are **global** (same set across all organizations and applications). Store them in PHP-Auth so they can be the single source for "which roles exist" and for break-glass (suspend/restore).

**4. Organizations and applications model**

- **Organizations** = client tenants (e.g. one per website-cms tenant).
- **Applications** = one or more per org: websites, web apps, mobile apps (e.g. one row per website-cms fork or per app).
- Ensure schema supports: org name/slug, application name/type (e.g. website-cms), optional link to deployment/URL.
- No need to retain "component access" or multi-token logic for old CRM/CMS/E‑comm apps.

**5. User–organization–application–role links**

- **auth_user_organizations:** user ↔ organization membership; assign admin-style roles here (creator, viewer, etc.) for people who manage website-cms (or other apps).
- **GPUMs:** same `auth_users` table; mark or associate so PHP-Auth can list "all GPUMs" (signed up, have account, need auth in any org application). Use **GPUM** role (or equivalent) for them; they are end-user clients (clients of tenant clients), not admins.
- Decide if `auth_user_applications` is still needed (e.g. user ↔ application when one org has multiple apps); if not, remove or ignore.

### 1.2 Access Control and MFA

**6. Restrict PHP-Auth app to Superadmin only**

- After login, if user is not Superadmin, do **not** allow access to PHP-Auth UI.
- Redirect or treat as unauthorized; send them through the **honeypot** flow (log attempt, no access).

**7. Enforce MFA (TOTP) for PHP-Auth**

- Require TOTP for any user who can access PHP-Auth (in practice, only Superadmins).
- If MFA not enrolled or not satisfied, block access to PHP-Auth and use honeypot/logging as appropriate.
- Document: "Only Superadmin can access PHP-Auth; MFA required; all other attempts → honeypot."

#### 1.2.1 MFA implementation notes (from website-cms — avoid same trial and error)

During website-cms development, MFA (TOTP) had persistent issues on Vercel (infinite loop after verify, cookies not persisting). The following is what finally made it work; apply the same patterns in PHP-Auth so MFA works reliably (especially on serverless/edge hosts like Vercel).

**Required: form POST to verify (not fetch)**

- Use a **form** with `action` pointing to the MFA verify endpoint and `method="post"`. Submit the code (and factorId, challengeId) via form POST so the browser performs a **full page navigation** to the verify API.
- **Why:** With `fetch()`, the verify API may return a redirect with `Set-Cookie`, but in many environments (including Vercel) those cookies are not applied to the document origin reliably. Full navigation ensures the next document load receives and stores the session cookies.

**Verify endpoint behavior**

- Accept both `application/x-www-form-urlencoded` (and optionally JSON) so the form POST works. On success, either:
  - **Option A (simplest):** Respond with a **303 redirect** to the final destination (e.g. dashboard) and attach the upgraded session cookies to that redirect response. Works when the host applies `Set-Cookie` on redirect responses.
  - **Option B (Vercel/serverless fallback):** If Option A does not persist cookies (user ends up in a loop or session not upgraded), use a **token relay**: (1) Verify API does **not** set cookies on the response; instead it writes the session cookie payload to a one-time **token table** (e.g. `mfa_upgrade_tokens`: token UUID, cookies JSONB, expires_at). (2) Verify API redirects 302 to a **success page** with `?t=TOKEN`. (3) The **success page** (server-rendered) reads the token, loads the cookies from the table, sets them via the response (e.g. `cookies().set()` in Next.js), deletes the token, then either redirects after a short delay or renders a "Success" view with a 3-second countdown then redirect. This way the cookies are set on a **document response**, which persists reliably on Vercel.
- Handle errors by redirecting back to the challenge page with query params: `error=invalid`, `error=expired`, `error=missing`, `error=server` so the UI can show the right message.

**Challenge creation**

- Supabase (and some providers) require the **challenge** and **verify** calls to come from the same server/IP. If the MFA challenge is created client-side and verify is server-side, ensure the challenge is created via an **API route** (e.g. POST to `/api/auth/mfa/challenge`) so both challenge and verify run in the same backend context.

**Standalone MFA flow**

- Use **standalone** MFA routes (minimal layout, no app sidebar). Include both challenge and success in the middleware’s “allowed without AAL2” list so the user is not redirected back to challenge while on the success page. After verify, a short **delay** (e.g. 2–3 seconds) on the success page before redirecting gives the browser time to apply cookies before the next request.

**Reference (website-cms)**

- Changelog: 2026-02-12 entries (MFA: set cookies on success page; form POST; standalone flow); `src/app/api/auth/mfa/verify/route.ts`, `src/components/auth/MFAChallenge.tsx` (form POST), migration `110_mfa_upgrade_tokens.sql` (token relay pattern). See also `docs/reference/MFA-fix-003.txt` for loop diagnosis.

#### 1.2.2 Session and MFA: no carry-over to/from PHP-Auth — **required**

**Requirement:** There is **no session carry-over** and **no token handoff** between **PHP-Auth** and **website-cms**. Auth must **not** persist from website-cms to PHP-Auth, or from PHP-Auth to website-cms.

- **PHP-Auth:** Superadmin logs in to PHP-Auth (with MFA). That session grants access only to PHP-Auth. No mechanism allows a website-cms session to be used to access PHP-Auth, and no mechanism allows a PHP-Auth session to be used to access a website-cms fork.
- **Website-cms (across forks):** Auth **does** persist across website-cms fork apps. A Superadmin who logs in (and completes MFA) on one fork can access **all** website-cms forks without requiring MFA again on each fork — one login + MFA for website-cms grants access to all forks while the session is valid. This is the original plan and remains in place.
- **Boundary:** The only separation is **PHP-Auth ↔ website-cms**. Do not implement handoff, SSO, or token exchange between PHP-Auth and website-cms. Within website-cms, auth persists across forks as designed.

**Rationale:** Prevents compromise of PHP-Auth or website-cms from granting access to the other; requires a **distinct login (and MFA) to PHP-Auth** to manage the PHP-Auth app. Managing all website-cms forks still uses a single Superadmin session across forks (no MFA per fork).

### 1.3 Break-Glass and Recovery

**8. Break-glass: suspend users and roles**

- Provide Superadmin actions to: suspend (or revoke) users across organizations/applications, and to suspend or restrict roles (including admin roles used in website-cms).
- Scope: all organizations, all applications, and website-cms (including other superadmin users).
- Actions must be written to `audit_logs` with clear action types and metadata.

**9. Secret recovery mode**

- Implement a secure recovery path (e.g. separate route + secret or hardware token) that allows restoring owner/superadmin capability (e.g. unsuspend the last superadmin, or create a recovery superadmin).
- Document recovery procedure; keep it minimal and secure.

### 1.4 UI: Show UUIDs for Linking

**10. Organization and Application UUIDs on record cards**

- On **Organization** record/card: display **Organization UUID** (and optionally make it copyable).
- On **Application** record/card: display **Application UUID** (and optionally make it copyable).
- Workflow: create Organization and Application in PHP-Auth → copy UUIDs → use them in website-cms (and other apps) for linking (e.g. env or tenant config: `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`).

### 1.5 Audit Logging as Single Source

**11. Central audit_logs**

- Keep `audit_logs` as the **single source** for user-access audit for all applications.
- Schema: at least user, organization, application, action, resource type/id, `login_source`, IP, user agent, timestamp; keep hash chain if already present.

**12. External audit ingestion (website-cms and other apps)**

- Add **POST /api/external/audit-log** (or equivalent):
  - **Auth:** API key (validated against `auth_applications`).
  - **Body:** `userId`, `organizationId`, `applicationId`, `action`, `resourceType`, `resourceId`, `loginSource` (e.g. `website-cms`), `metadata`, `ipAddress`, `userAgent`.
- Validate API key and that application belongs to the given organization.
- Append to `audit_logs` (and hash chain if used).
- Document so website-cms (and future apps) know how to send events.

### 1.6 APIs for Website-CMS and Other Apps

**13. Tenant app registration — generate and store API keys**

- PHP-Auth is the **single source** for API keys: **generate** each key (e.g. strong crypto such as `crypto.randomBytes`) when an Application is created; **store** the key in `auth_applications` (hashed or encrypted at rest if desired); **return** the key once to the Superadmin (e.g. on the Application create response) with a clear "save securely; shown once" warning.
- Keep or implement: Superadmin creates **Organization** (if needed), then creates **Application** (e.g. "Acme website-cms") under that org → PHP-Auth generates the API key, stores it, and returns **API key**, **Application UUID**, and optionally **Org UUID** in the response.
- Do **not** allow consuming apps (website-cms) to supply or create their own keys; keys are issued only by PHP-Auth. Document that website-cms forks **receive** their API key and UUIDs from this flow and store them in env (never commit).

**14. Optional: user/org/app validation**

- If website-cms needs to verify "is this user allowed for this org/app?" or "is this API key valid?", provide endpoints (e.g. validate API key, validate user + org).
- No need to support old "component app" tokens or multi-token flows.

**15. GPUM visibility**

- Ensure PHP-Auth can list and filter **all GPUMs** (users with GPUM role or equivalent) across organizations/applications: signed in, have account, require auth in any org application.
- UI: e.g. "General Purpose User Members" table with org/app context where relevant.

### 1.7 Documentation and Security

**16. Document PHP-Auth's repurposed role**

- Short doc: PHP-Auth runs in parallel to website-cms; global orgs, applications, roles (including Superadmin and GPUM); single audit log; break-glass; MFA for Superadmin only; UUIDs on cards for linking; no longer used for authenticating former component apps.

**17. Security and RLS**

- Ensure no tables are left with RLS disabled; API keys only in env; recovery mode and break-glass actions are logged and restricted.

---

## Section 2: Step-by-Step Plan — Modify the Website-CMS App

**Scope:** Integrate website-cms with the repurposed PHP-Auth: link each fork to an Organization and Application via UUIDs, send all user-access audit events to PHP-Auth, optionally validate users/API key, and use PHP-Auth as break-glass and (optionally) source of admin roles. Roles remain manageable from website-cms superadmin; align role names/types with PHP-Auth where they are shared.

**API keys:** website-cms **does not generate** API keys. Each fork **receives** its API key from PHP-Auth when the Application is created (Superadmin copies it from PHP-Auth); the fork **stores** the key in env (e.g. `AUTH_APP_API_KEY`) and uses it only for calling PHP-Auth (audit-log, validate-api-key, etc.). Never create or store API keys in code or version control.

**Superadmin: no carry-over to/from PHP-Auth; auth persists across forks:** See Section 1.2.2. **Requirement:** No session or token handoff **between PHP-Auth and website-cms**. Superadmin must log in (and complete MFA) **to PHP-Auth** separately from website-cms. **Within website-cms:** auth persists across fork apps — one login + MFA grants access to all forks without redoing MFA on each fork.

### 2.1 Configuration and Linking

**1. Store PHP-Auth identifiers per tenant/fork (receive API key; do not create locally)**

- For each website-cms fork (tenant): **receive** from PHP-Auth (at app registration) the **Organization UUID**, **Application UUID**, and **API key**; store them in env (e.g. `AUTH_ORG_ID`, `AUTH_APPLICATION_ID`, `AUTH_APP_API_KEY`). Never commit these values.
- Do **not** generate API keys in website-cms; PHP-Auth generates and stores all keys. The fork only stores the key it was given.
- Optional: store in tenant_settings or env; ensure server-side code can read org ID, application ID, and API key for that deployment.

**2. Document the linking workflow**

- In PHP-Auth: create Organization → create Application (PHP-Auth generates and returns API key once) → copy **Org UUID**, **Application UUID**, and **API key** to website-cms config.
- In website-cms: store the key and UUIDs in env; use them when calling PHP-Auth (e.g. audit log, validate-user). Do not create API keys locally.
- Optional: document how "tenant" (e.g. schema or tenant id) maps to PHP-Auth organization and application.

### 2.2 Audit Logging to PHP-Auth

**3. Implement audit event push**

- For auth and user-management events (login, logout, MFA, add/remove user, role change, suspend, etc.): build a payload (`userId`, `organizationId`, `applicationId`, `action`, `resourceType`, `resourceId`, `loginSource: 'website-cms'`, `metadata`, `ipAddress`, `userAgent`).
- POST to PHP-Auth **POST /api/external/audit-log** with `X-API-Key`.
- Use the stored Organization UUID and Application UUID for that fork.

**4. Cover key events**

- At minimum: admin login/logout, MFA success/failure, user invite, user removed, role assigned, superadmin actions (if any), and break-glass–relevant actions.
- Ensure `login_source` (e.g. `website-cms`) and `application_id` are set so PHP-Auth can filter and show "user access audit for all applications."

### 2.3 Roles and Superadmin Alignment

**5. Align roles with PHP-Auth**

- website-cms superadmin continues to manage **roles** in the CMS (global roles from superadmin dashboard).
- Role names/types that are shared with PHP-Auth (e.g. Superadmin, creator, viewer, client_admin) should match what PHP-Auth stores so that break-glass and audit stay consistent.
- Superadmin in website-cms = same concept as Superadmin in PHP-Auth (most powerful; only role that can access PHP-Auth).

**6. Admin-style roles (creator, viewer, etc.)**

- website-cms keeps managing who has access to admin section (creator, viewer, etc.).
- Optional: sync role assignments or membership to PHP-Auth (e.g. so PHP-Auth "user management" shows admin-style roles per org/app). If not syncing, at least log role changes to audit_log via step 3.

### 2.4 Break-Glass and Recovery

**7. Treat PHP-Auth as break-glass**

- Do not duplicate "emergency lockout" or "recover superadmin" inside website-cms.
- Document: for rogue users or lost superadmin access, use PHP-Auth to suspend users/roles and (if needed) use PHP-Auth's secret recovery mode to restore owner/superadmin.
- website-cms can optionally call an API to "apply" suspension from PHP-Auth (e.g. respect a "suspended" flag) or rely on PHP-Auth to revoke sessions; define one approach and document.

**8. Safeguards in website-cms**

- If website-cms has "add superadmin" / "delete user": no self-delete, no deleting the last superadmin; optional allowlist.
- Log all such actions to PHP-Auth audit (step 3).

### 2.5 Optional: Validation and User Listing

**9. Optional: validate API key or user**

- If you want website-cms to verify tenant app or user with PHP-Auth: call **validate-api-key** and/or **validate-user** (with org/app context) and enforce result.
- Not required for minimal integration (audit-only).

**10. GPUMs**

- website-cms continues to manage member (end-user) signup and auth.
- If PHP-Auth is to show "all GPUMs" across apps, either: (a) push member signup/login events to audit and optionally register members as users in PHP-Auth with GPUM role, or (b) document that GPUM list in PHP-Auth is only for users explicitly provisioned there; avoid duplicate source of truth without a clear rule.

### 2.6 Documentation and Security

**11. Document website-cms integration**

- Short doc: how website-cms **receives** Org/Application UUIDs and API key from PHP-Auth (no local key generation); how it sends audit events; how roles align with PHP-Auth; that break-glass and recovery are in PHP-Auth; that **auth does not carry over to/from PHP-Auth (separate login + MFA for PHP-Auth)** and that **auth persists across website-cms forks (one MFA for all forks)**; and where UUIDs and API key are stored (env/tenant_settings).

**12. Security**

- API key only in server env; no UUIDs or keys in client bundle.
- At session/commit: confirm no RLS or auth bypass left in place.

---

## Summary Table

| Concern | PHP-Auth app | website-cms app |
|--------|--------------|-----------------|
| **Data** | Keep `auth_users`; clean/delete other mock and obsolete tables; simplify roles to Superadmin, admin-style, GPUM | Store Org UUID, App UUID, API key per fork; optional sync of roles/members |
| **Old component apps** | Remove auth for former multi-tenant component apps; no multi-token/component access | N/A |
| **Roles** | Global roles (Superadmin, admin-style, GPUM); store roles used by website-cms and other apps | Superadmin manages roles in CMS; align names with PHP-Auth |
| **Access** | Only Superadmin can access PHP-Auth; MFA (TOTP) required; others → honeypot | Normal admin/member auth; break-glass in PHP-Auth |
| **MFA (TOTP)** | Form POST to verify; token-relay fallback on Vercel/serverless if Set-Cookie on redirect fails; standalone challenge/success; see §1.2.1 | Auth **persists across forks** (one login + MFA for all website-cms forks). **No carry-over** to/from PHP-Auth — PHP-Auth requires its own login + MFA; see §1.2.2 |
| **GPUMs** | Full table of GPUMs (end-user members with accounts); retain GPUM role | Members; optionally report to PHP-Auth for GPUM list/audit |
| **Break-glass** | Suspend users/roles across orgs, apps, website-cms, other superadmins; secret recovery to restore owner/superadmin | Use PHP-Auth for break-glass; no duplicate recovery in CMS |
| **UUIDs** | Show Organization and Application UUIDs on record cards for linking | Consume and store those UUIDs + API key per fork |
| **API keys** | **Generate and store** all API keys in `auth_applications` when Application is created; return key once; revoke/rotate from PHP-Auth | **Receive** key from PHP-Auth at registration; **store** in env (e.g. `AUTH_APP_API_KEY`); **do not create** keys locally |
| **Audit** | Single source; external endpoint for website-cms (and other apps) to POST audit events | Push all relevant auth/user events to PHP-Auth with `application_id` and `login_source` |
