# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Testing after a code session (if the app looks unstyled / "lost CSS"):** (1) Use **http://localhost:3000** for both public and admin (not port 5000). (2) Hard refresh: `Ctrl+Shift+R` or disable cache in DevTools → Network and reload. (3) Restart dev: stop the server, delete the `.next` folder, run `pnpm run dev` again, then open a fresh tab to localhost:3000.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---
## Next up

**Phase 19: Project Management Module** (from [planlog.md](./planlog.md)). Schema, RPC/API, and core Admin UI done. Scope in [prd.md](./prd.md).

- [ ] **Admin UI — time tracking:** Task proposed_time, actual_time; optional punch-style entries UI.
- [ ] **Integration — activity stream:** Log task created/completed, project status changes. Filter by project access (MAG).
- [ ] **Integration — support tickets:** GPUM submits ticket (task type support_ticket) via member area; auto-create or reuse perpetual Support project for that GPUM; create task with task_type = support_ticket.
- [ ] **Integration — e-commerce:** Order optional project_id; project detail shows linked orders; optional actual vs potential_sales.
- [ ] **Integration — calendar:** Event project_id; project detail shows linked events; event visibility respects project MAG.
- [ ] **Member area (GPUM):** (1) Projects — list/detail for GPUM (MAG); (2) Support Tickets; (3) Tasks. Feature registry, sidebar gating, and roles for projects at end of phase.
- [ ] **Feature registry, sidebar gating & roles:** Add **projects** to feature registry; ensure sidebar gating; adjust roles as needed.
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
## Reference (design locked / Phase 19)

- **Invoicing (locked):** Schema, number generator, shared sequence with orders, flow, customer identifiers — see changelog 2026-03-14 entry and planlog Phase 19 as needed.
- **Phase 19 (Project Management):** Taxonomy for projects/tasks, MAG parent/child (done), CRM Organizations (done). Remaining: Project Management (projects + tasks) step-by-step in planlog.

---
## Paused / Later

_(Optional — move items to planlog when they become backlog.)_
