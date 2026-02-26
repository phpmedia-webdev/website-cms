## Section 3: MFA fix applied in PHP-Auth (2026-02)

**This was the fix that actually worked** for PHP-Auth on Vercel/serverless. It differs from the original authplanlog.md §1.2.1 instructions (Option A / Option B).

### What we tried first (per §1.2.1)

- **Option A:** Form POST to verify; 303 redirect with Set-Cookie; success page reads cookies. Result: cookies did not persist on redirect in serverless, so session never upgraded; user looped back to challenge.
- **Option B:** Token relay — verify writes one-time token to DB, redirects to success?t=; success page (or consume endpoint) sets cookies on document response. Result: Supabase returned "Challenge and verify IP addresses mismatch" because challenge was created by one serverless instance and verify ran on another (different outbound IPs). Also saw "Supabase returned no session tokens" when mismatch occurred.

### The fix that worked: client-side challenge and verify

- **Challenge:** Create the MFA challenge in the **browser** using the Supabase client: `supabase.auth.mfa.listFactors()` then `supabase.auth.mfa.challenge({ factorId })`. No server-side POST to create the challenge.
- **Verify:** When the user submits the code, call **`supabase.auth.mfa.verify({ factorId, challengeId, code })` in the browser**. Do not form-POST to our server for verify. On success (no error), redirect to `/`. Supabase updates the client session internally; we do not rely on cookies or token relay for the upgrade.
- **Why it works:** Both challenge and verify run from the same origin (the user's browser), so Supabase sees the same IP and does not trigger the mismatch. No serverless IP variance, no cookie persistence issues, no token relay needed for the happy path.

### Comparison to original §1.2.1

| Aspect | §1.2.1 (Option A/B) | Fix we applied |
|--------|---------------------|----------------|
| Challenge creation | Server (API route) | **Client** (Supabase JS in browser) |
| Verify | Server (form POST to API) | **Client** (Supabase JS in browser) |
| Session upgrade | Cookies or token relay on success page | **Supabase client updates session in-place**; redirect to `/` |
| Serverless gotcha | Cookies may not persist; token relay still hit **IP mismatch** (challenge and verify on different instances) | **Avoided** — same “caller” (browser) for both |

So the plan’s Option A/B assumed challenge and verify would run server-side and that the only problem was cookie persistence. In PHP-Auth’s deployment, Supabase also enforces that challenge and verify come from the same IP; serverless broke that. Moving both operations to the client satisfied Supabase and removed the need for cookies or relay for the MFA step-up. The server-side verify/consume/session routes remain in the codebase for possible fallback or other use but are not used by the main MFA challenge flow.

Is the current MFA fix “better” overall?
Yes, for your setup it’s a better fit:
Fixes the real constraint: Supabase requires challenge and verify from the same IP. On serverless, different requests can use different IPs, so server-side challenge + server-side verify often fails. Doing both in the browser guarantees the same “caller” and removes that failure mode.
Simpler: No cookie persistence on redirects, no token relay or consume endpoint needed for the main flow. Session is updated in the Supabase client; you just redirect to /.
More robust on serverless: No dependence on how many instances run or which IP they use.
Trade-off: challenge and verify both go from the client to Supabase. That’s normal for a Supabase SPA; the user already has a valid session to create the challenge, and the code is one-time. If you needed extra server-side actions on MFA success (e.g. audit log), you’d do that in a separate API call after the client has upgraded.
Should you use this in the other tenant app (website-cms)?
If website-cms MFA is broken or flaky (IP mismatch, “no session tokens”, cookie/redirect issues on Vercel): yes — use the same pattern (client-side listFactors → challenge → user enters code → client-side verify → redirect). It’s the same fix that worked for PHP-Auth.
If website-cms MFA is already stable (e.g. Option B with cookies on the document response works there): you don’t have to change it, but moving to client-side challenge + verify would still be a good way to simplify and future‑proof and avoid serverless IP/cookie issues later.
So: the current MFA fix is the better approach for serverless + Supabase, and reusing it in the tenant app is recommended, especially if that app has or might have similar MFA issues.

---

## Website-CMS adoption (recommended pattern for forks)

**As of 2026-02,** the website-cms app uses the same client-side challenge + verify flow as PHP-Auth:

- **Challenge:** Created in the browser via `supabase.auth.mfa.challenge({ factorId })` (no call to `/api/auth/mfa/challenge` in the main flow).
- **Verify:** On submit, the client calls `supabase.auth.mfa.verify({ factorId, challengeId, code })` in the browser. On success, a short delay (400 ms) then `router.push(redirectTo)` so the next request sees the upgraded AAL2 session. No form POST to `/api/auth/mfa/verify` for the happy path.
- **Implementation:** `src/components/auth/MFAChallenge.tsx` — client-side only for listFactors, challenge, and verify; redirect after success.

The server-side API routes (`/api/auth/mfa/challenge`, `/api/auth/mfa/verify`) remain in the codebase for possible fallback or server-side use but are **not** used by the main MFA challenge flow. This app is the template for many forks; using client-side challenge + verify is the recommended MFA routine so forks get a serverless-robust flow without IP mismatch or redirect/cookie issues.
