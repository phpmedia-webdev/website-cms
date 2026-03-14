# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Testing after a code session (if the app looks unstyled / "lost CSS"):** (1) Use **http://localhost:3000** for both public and admin (not port 5000). (2) Hard refresh: `Ctrl+Shift+R` or disable cache in DevTools → Network and reload. (3) Restart dev: stop the server, delete the `.next` folder, run `pnpm run dev` again, then open a fresh tab to localhost:3000.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---
## Next up

- [ ] **Security review & fork deployment checklist** (see below; carries over to new fork)

---
## Pre-fork: Security review & fork deployment checklist

**Carries over to the new fork.** Two parts:

- [ ] **a. Security review** — Review the app for security concerns (auth, RLS, input validation, per-feature pass). See planlog → Code Review, Security & Modular Alignment; Error handling (404/500, membership denied); Performance as needed for v1.
- [ ] **b. Fork deployment checklist** — Create and document the checklist needed for deploying a fork of the application.
  - Test Automated Client Setup Script (`pnpm setup-client <schema-name>`)
  - Template (root) domain deployment: Vercel, env vars, superadmin user, test auth
  - Integrations: test script injection, enable/disable, superadmin-only access
  - Document and lock down the fork deployment checklist for future client launches (e.g. first fork: **phpbme**, domain **phpbme.com**)

---
## Paused / Later

_(Optional — move items to planlog when they become backlog.)_
