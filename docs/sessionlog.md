# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Testing after a code session (if the app looks unstyled / "lost CSS"):** (1) Use **http://localhost:3000** for both public and admin (not port 5000). (2) Hard refresh: `Ctrl+Shift+R` or disable cache in DevTools → Network and reload. (3) Restart dev: stop the server, delete the `.next` folder, run `pnpm run dev` again, then open a fresh tab to localhost:3000.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---
## Next up

**Customizer + Projects/Tasks (next session)** — Rewire Projects and Tasks to use the new **customizer** settings and continue UI enhancement.

**Implementation order (start here):**

- [ ] **Projects & Tasks — customizer:** Rewire Projects and Tasks to use the new customizer settings (project_type, project_status, project_role; task_type, task_status, task_phase from `customizer` table / GET-PUT by scope). Ensure admin UI (dropdowns, badges, filters) reads from customizer and continues UI enhancement there.
- [ ] **Projects and Tasks UI Enhance** — *Shipped:* admin **projects list** refresh (table: type dot, dates, client + avatars, status/type pills, member avatars, task-segment progress). *Still open:* tasks list/detail polish, project detail progress vs list, presets, etc.
- [ ] **Custom view presets (optional):** user_view_presets table; API; View dropdown on projects/tasks lists.
- [ ] **Add Reconcile with Stripe feature for Products** — Same as for transactions; add to Products page action dropdown.
- [x] **Sidebar — Content consolidation:** One top-level Content with sub-items Text Blocks, Media, Galleries; remove separate Media top-level.
- [x] **Feature registry, sidebar gating & roles (Phase 19):** projects in registry; sidebar gating; roles.

**Workflow:** Check off here → sync to planlog cleanup items → at session end, changelog + remove completed from here.

---

## Taxonomy updates

**Goal:** One home section per category (drop multi-section for categories); global `display_order` on category rows for scoped drag-and-drop + Save; tags remain multi-section / global. Pickers and scoped lists use hierarchy + sibling order; full list can sort by name/slug or by section order then tree.

- [x] **Schema — category home + order:** Migration `175_taxonomy_category_home_order.sql` adds `home_section_name`, `display_order`; updates `get_taxonomy_terms_dynamic`. Run in Supabase SQL Editor. Slug remains globally unique for now.
- [x] **Data migration — single section per category:** Included in 175: backfill home, `display_order`, rebuild `category_slugs` per section, `suggested_sections` = `[home]`.
- [x] **Category edit modal — single section:** Categories use one “Home taxonomy section” select; tags keep multi-section checkboxes. Save rebuilds all sections’ `category_slugs`.
- [ ] **Taxonomy Sections tab:** Section edit still allows manual category_slugs — may diverge from home model until tightened.
- [x] **Taxonomy Sections list — column semantics:** Categories column = count of terms with `home_section_name` = row; Tags = `tag_slugs.length` (tooltips on headers).
- [x] **Categories list — drag-and-drop (scoped):** Filter by section → drag handle reorders siblings → **Save order** updates `display_order` + rebuilds slugs.
- [ ] **Consumers — pickers & APIs:** Order category pickers by `display_order` then name (tasks/projects/content) — next pass.

---

## Site Visitor Analytics

*(After Phase 19 expansion; before pre-fork.)* Scope: schema, tracking, API, admin dashboard graph, GPUM page views in activity stream.

- [ ] **Site Visitor Analytics — schema:** Table(s) for visitor events or aggregates (tenant-scoped). Optional: member page views (contact_id, path, visited_at) for GPUM. Migration; RLS.
- [ ] **Site Visitor Analytics — tracking:** Record public page visits (API or middleware); minimal data (path, date). No PII for anonymous. When logged-in GPUM: optionally record with contact_id for activity stream.
- [ ] **Site Visitor Analytics — API:** Endpoints for aggregated stats (date range, path) for admin.
- [ ] **Site Visitor Analytics — dashboard:** Admin dashboard widget/section with visitor statistics and graph.
- [ ] **Site Visitor Analytics — GPUM page views in activity stream:** Record GPUM page views; include in getMemberActivity so "Viewed: …" shows in member activity stream (and admin contact view). Content pages only if desired.
- [ ] **Admin Level Tool** This tracking info shows in the admin activity stream - not the GPMU members stream
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
- **Support project (per GPUM):** Created when GPUM starts a support process (first ticket), not on member creation. **Status** = perpetual (lives with the life of the client). **Category** = Support Ticket (taxonomy). One perpetual Support project per GPUM; all their support_ticket tasks link to it.
- **Conversation = thread:** One unified activity-stream concept: a conversation is a comment thread, support ticket thread, or message thread. Identified by `conversation_uid` (task threads use `task:${taskId}`). Get/set by conversation_uid; same createNote flow.

---
## Paused / Later

- **Member area (GPUM) UI** — Projects, Support Tickets, Tasks in member area: do later (after current step plan). Planlog Phase 19 has the spec.

_(Optional — move items to planlog when they become backlog.)_
