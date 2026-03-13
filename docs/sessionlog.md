# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Testing after a code session (if the app looks unstyled / "lost CSS"):** (1) Use **http://localhost:3000** for both public and admin (not port 5000). (2) Hard refresh: `Ctrl+Shift+R` or disable cache in DevTools → Network and reload. (3) Restart dev: stop the server, delete the `.next` folder, run `pnpm run dev` again, then open a fresh tab to localhost:3000.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---
## Next up

### Other / Backlog

- [ ] **Gate system: hide vs ghost:** Extend the gating system to support **hiding** features and nav links (in addition to current ghosting). Goal: clean admin UI for tenants with limited features, and avoid loading module code when the feature is not enabled. Allow per-tenant configuration so some tenants see a minimal nav (hide unused modules) while others can keep ghosted entries for upsell. Design: e.g. hide mode vs ghost mode per feature or per tenant; ensure sidebar/nav and route guards respect hide so hidden modules are not loaded.
- [ ] **Forms: captcha, rate limiting, and other protections:** Review and add protections for public forms (e.g. Contact). Options to evaluate: captcha (reCAPTCHA, hCaptcha, Turnstile, or similar) to reduce bots; rate limiting per IP or per session on form submit API; optional honeypot fields; and any other anti-spam/abuse measures. Document choices and implement per-form or global form settings where appropriate.

---
## Paused / Later

- [ ] Anychat, VBout, PHP-Auth audit logging, superadmin add/delete user (see planlog).
- [ ] **Banners** - A programmable display block that can show html5 content on a schedule. Usually at top of home page.
- [ ] **Carousel shortcode item** Build a shortcode that generates a carousel (pan slider) from objects like images or content.
