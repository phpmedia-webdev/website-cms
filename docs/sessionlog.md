# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Testing after a code session (if the app looks unstyled / "lost CSS"):** (1) Use **http://localhost:3000** for both public and admin (not port 5000). (2) Hard refresh: `Ctrl+Shift+R` or disable cache in DevTools → Network and reload. (3) Restart dev: stop the server, delete the `.next` folder, run `pnpm run dev` again, then open a fresh tab to localhost:3000.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---
## Next up

_(Clean slate — add focus items here as needed.)_

---
## MVP scan (to address)

**Summary:** PRD, planlog, and codebase were scanned to assess MVP status. The app has broad feature coverage (content, media, galleries, CRM, forms, membership, ecommerce, events, superadmin, gate/display, form protection). Several documentation and deployment items remain; no single critical missing feature blocks “basic business website” MVP if ecommerce is in scope.

**Findings — check off as addressed:**

- [ ] **5. Security review / polish:** Planlog lists Security review, Error handling (404/500, membership denied), and Performance (cache site mode, cache integrations, ISR). Before calling MVP "released," do a minimal security pass (auth, RLS, input validation) and decide which performance items are in-scope for v1. **Next session.**


- [ ] **6. Backlog items:** Anychat/VBout/PHP-Auth audit logging, Banners, Carousel shortcode remain in planlog Backlog. Confirm these are post-MVP; no change needed for MVP assessment.

---
## Paused / Later

_(Optional — move items to planlog when they become backlog.)_

---
## Fork deployment (Phase 00 — last)

**Purpose:** Process to perfect for launching a fork site. We will go through this when developing the first fork (**phpbme**, domain **phpbme.com**) and finalize the checklist steps for a fork deployment.

**Scope (to be refined during first-fork launch):**
- Test Automated Client Setup Script (`pnpm setup-client <schema-name>`)
- Template (root) domain deployment: Vercel, env vars, superadmin user, test auth
- Integrations: test script injection, enable/disable, superadmin-only access
- Document and lock down the fork deployment checklist for future client launches

