# MFA Fix – Merged Plan (from MFA-fix-001, 002, 003)

This document merges and adapts recommendations from three agent summaries (Claude Opus, Claude Sonnet, GPT-4o) for resolving the MFA infinite loop on Next.js + Supabase + Vercel. **Our stack uses `@supabase/ssr`** (createServerClient, createBrowserClient), not `@supabase/auth-helpers-nextjs`; implementation details are adapted accordingly.

---

## 1. Root cause (all three agents)

- After MFA verification succeeds, the **session is not reliably seen as AAL2** on the next request.
- Either:
  - **Cookies are not applied** before the next navigation (Vercel/redirect timing), or
  - **Middleware runs** before the new session cookies are present and sends the user back to the MFA challenge.
- The loop: verify → redirect → middleware sees AAL1 → redirect to MFA again.

---

## 2. Themes from the three docs

| Theme | 001 (Opus) | 002 (Sonnet) | 003 (GPT-4o) |
|-------|------------|--------------|--------------|
| Session / AAL must persist after verify | ✓ getSession / refreshSession after verify | ✓ refreshSession(), verify AAL2, then redirect | ✓ JWT/session must reflect MFA completion |
| Middleware must use AAL from session | ✓ getAuthenticatorAssuranceLevel(), redirect by AAL | ✓ session.user.aal === 'aal2' | ✓ mfa_verified from session, not local state |
| Client-side verify | ✓ challengeAndVerify in handler; also client example | ✓ mfa.verify() on client, then refreshSession, window.location | — |
| Full page navigation after MFA | — | ✓ window.location.href (not router.push) | — |
| Short delay after verify | ✓ 1000ms before router.refresh | ✓ 500ms before redirect | ✓ 300ms for propagation |
| Explicit session refresh after verify | ✓ getSession(), refreshSession() if AAL not 2 | ✓ refreshSession(), check newSession.aal | ✓ refreshSession() |
| Redirect when already AAL2 on MFA page | ✓ If AAL2 and on MFA page → dashboard | ✓ If on /mfa-challenge and AAL2 → dashboard | — |

---

## 3. What we already have (current codebase)

- **Verify API:** POST to `/api/auth/mfa/verify`; uses `createServerClient` with request cookies; calls `supabase.auth.mfa.verify()`; on success builds **303 redirect to `/mfa/success?redirect=...`** and sets session cookies on that response (same pattern as auth callback). No DB, no token.
- **Success page:** Renders “Success!” and countdown, then client redirects to dashboard.
- **Middleware:** Uses `getCurrentUserFromRequest(request, cookieCarrier)`; gets `session.aal`; if protected route and `requiresAAL2` and `currentAAL !== 'aal2'`, redirects to `/mfa/challenge`. Skips this check when path is `/mfa/challenge`, `/mfa/success`, or admin MFA routes.
- **Challenge:** Form POST to verify API; challenge created via `/api/auth/mfa/challenge` (server-side).

**Gap:** We do **not** redirect away from `/mfa/challenge` or `/mfa/success` when the user **already has AAL2** (e.g. back button or cookies finally applied). Adding that reduces unnecessary re-entry to the MFA flow.

---

## 4. Merged plan – phases

### Phase A: Middleware – redirect when already AAL2 on MFA paths (low risk)

**Goal:** If the session already has AAL2 and the user is on an MFA page, send them to the dashboard so we don’t show the challenge again.

**Steps:**

1. In middleware, after resolving `user` and `session`, if path is one of:
   - `/mfa/challenge`, `/mfa/success`, `/admin/mfa/challenge`, `/admin/mfa/success`
   and `session?.aal === 'aal2'` and user is valid (e.g. tenant/superadmin checks already passed or N/A for this path), then **redirect to dashboard** (or to `redirect` query param if present and safe).
2. Keep existing logic: redirect to MFA challenge only when `needsAAL2 && currentAAL !== 'aal2'` and not already on an MFA path.

**Rationale:** Aligns with 001 and 002: “if AAL2 and on MFA page → dashboard.” Ensures we don’t leave the user on the challenge/success page when they’re already verified.

---

### Phase B: Try client-side MFA verify (recommended by 001 & 002)

**Goal:** Do verification in the browser so the Supabase client updates its own cookie storage; avoid server-side cookie handoff on Vercel.

**Steps:**

1. **Challenge:** Keep creating the challenge via **API** (`POST /api/auth/mfa/challenge`) so challenge is created with the same session/cookies the server sees (we already do this).
2. **Verify:** In the **browser**, call `supabase.auth.mfa.verify({ factorId, challengeId, code })` using the existing **browser** Supabase client (the one that uses cookies and `persistSession: true`).
3. **After verify:**
   - Optionally call `supabase.auth.refreshSession()` (or `getSession()`) and confirm `session.aal === 'aal2'`.
   - Wait a short delay (e.g. 300–500 ms) so the client has time to persist the session.
   - Use **full page navigation:** `window.location.href = redirectTo` (or `window.location.replace`), **not** `router.push()`, so the next request sends the updated cookies.
4. **Remove or simplify:** The form no longer POSTs to `/api/auth/mfa/verify` for the code; the verify API can remain for non-redirect use (e.g. API callers) or be simplified later.
5. **Success page:** Either skip it (redirect straight to dashboard from the challenge page after client verify) or keep it as a “Success!” + countdown then `window.location.href = redirectTo` for UX.

**Rationale:** 001 and 002 both suggest client-side verify so the session is updated in the client’s cookie storage; 002 stresses `window.location.href` and a short delay. This avoids relying on Set-Cookie on a server redirect, which has been unreliable on Vercel.

**Note:** Supabase’s TOTP example uses client-side `mfa.challenge()` and `mfa.verify()`. We can keep challenge creation on the server if we have a “same IP” or consistency requirement; verify in the client is still valid because the challenge is bound to the session the client is using.

---

### Phase C: If we keep server-side verify – strengthen response and redirect

**Goal:** If we continue to use the verify API and redirect with Set-Cookie, make the flow as robust as the auth callback.

**Steps:**

1. Ensure the verify API uses the **exact** same cookie-reading and cookie-setting pattern as `/api/auth/callback` (same `createServerClient` options, same way of applying `cookiesToSet` to the redirect response).
2. Redirect to a **single** target: either `/mfa/success?redirect=...` (current) or directly to the dashboard. If we redirect directly to dashboard, we can remove the success page from the flow.
3. Do **not** add a DB or token step; keep a single redirect + Set-Cookie response.
4. Optional: after `mfa.verify()`, call `supabase.auth.getSession()` (or refresh) in the same handler so the session we write to cookies is the latest; then set those cookies on the redirect.

**Rationale:** 003 and 001 emphasize that the updated session must be what’s stored and sent; our auth callback already works with redirect + Set-Cookie, so we mirror it.

---

### Phase D: Optional – debugging and checks

**Goal:** Confirm where the flow fails (cookie set vs middleware vs AAL).

**Steps:**

1. **Temporary logging (dev only):** In middleware, log (or expose in a dev-only banner) `session?.aal` and path when the user is on `/mfa/challenge` or `/mfa/success` so we can see whether the next request after verify has AAL2.
2. **Browser:** After verify, check Application → Cookies and confirm the Supabase auth cookies are present and updated on the next request.
3. **Vercel:** Ensure no caching of the verify response or of middleware; our middleware already uses no-store where appropriate.

**Rationale:** 001 and 003 suggest debugging session/AAL and cookies; this verifies whether the issue is “cookies not set” or “middleware not seeing them.”

---

## 5. Recommended order of work

1. **Phase A** – Implement “if on MFA path and AAL2 → redirect to dashboard” in middleware. Quick, low risk, and closes the loop when cookies are already set.
2. **Phase B** – Implement client-side verify with `window.location.href` and optional short delay + session check. Highest impact for Vercel without adding DB or token hacks.
3. If B is not desired (e.g. must keep server-only verify), do **Phase C** and ensure verify API mirrors the auth callback and optionally refresh session in the handler.
4. Use **Phase D** if the loop persists, to see whether the problem is cookie persistence or middleware logic.

---

## 6. What to avoid (from agents and our experience)

- Do **not** derive “needs MFA” or “MFA complete” from local component state that resets on reload; use **session.aal** (and server session) only (003).
- Do **not** use `router.push()` alone after MFA for the final redirect; use **window.location.href** (or replace) so the next request is a full load with cookies (002).
- Do **not** add back a one-time token table or session storage in our DB for MFA cookie handoff; keep the flow stateless or client-updated (our cleanup).

---

## 7. File reference (our codebase)

- Middleware AAL and MFA redirects: `src/middleware.ts`
- MFA challenge UI and submit: `src/components/auth/MFAChallenge.tsx`
- Verify API: `src/app/api/auth/mfa/verify/route.ts`
- Challenge API: `src/app/api/auth/mfa/challenge/route.ts`
- Success page: `src/app/mfa/success/page.tsx`
- Auth callback (pattern to mirror): `src/app/api/auth/callback/route.ts`
- Browser Supabase client: `src/lib/supabase/client.ts` (createClientSupabaseClient / getSupabaseClient)
- requiresAAL2 / getCurrentUserFromRequest: `src/lib/auth/mfa.ts`, `src/lib/auth/supabase-auth.ts`

---

*Merged from docs/reference/MFA-fix-001.txt, MFA-fix-002.txt, MFA-fix-003.txt. Adaptations applied for @supabase/ssr and existing routes.*
