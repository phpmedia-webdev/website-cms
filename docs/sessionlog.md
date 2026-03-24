# Session Log

**Purpose:** **MVP open-items checklist** — what still blocks **fork-deploy-ready** delivery. **Completed** work lives in [planlog.md](./planlog.md) (phase checkboxes) and [changelog.md](./changelog.md).

**Workflow:** See **`.cursor/rules/sessions.mdc`**. When you close an item, **check it off in [planlog.md](./planlog.md)** (matching phase) and **remove it from here** (or add a planlog-only checkbox if it belongs there). Session end → [changelog](./changelog.md) with **Context for Next Session**; changelog may cite **planlog** + chat, not only this file.

**Testing (unstyled / lost CSS):** **http://localhost:3000**; `Ctrl+Shift+R`; or delete `.next`, `pnpm run dev`, new tab.

**Specs:** [prd.md](./prd.md), [prd-technical.md](./prd-technical.md) (especially **Phase 18C** — Directory & messaging).

### Manual SQL — you run scripts in Supabase

**Database changes are not applied when you pull code.** Copy files from `supabase/migrations/` into **Supabase Dashboard → SQL Editor** and **Run** (numeric filename order).

**Outstanding (delete each line after you run on every tenant schema that needs it):**

- **`198_get_tasks_dynamic_preset_filters.sql`** — All Tasks presets (`exclude_status_slugs`, `due_before`).
- **`197_get_tasks_dynamic_exclude_archived_projects.sql`** — exclude tasks whose **project** is archived (confirm applied everywhere).

---

## Shipped MVP slices (see planlog — not duplicated here)

| Area | Where it’s tracked |
|------|-------------------|
| Admin **projects** (list, donor-style **detail**, members, client, events, transactions) | [planlog — Phase 19](./planlog.md#phase-19-project-management-module) |
| Admin **tasks** + **All Tasks** (modal, presets, sort, **197/198**) | [planlog — Phase 19](./planlog.md#phase-19-project-management-module) |
| **Resources** (registry, bundles, pickers, conflicts, task/event assignment, usage API) | [planlog — Phase 21](./planlog.md#phase-21-asset--resource-management) |
| Event picker **ghost / busy** hints (if time) | [planlog — MVP if time permits](./planlog.md#event-resource-picker--mvp-if-time-permits) |

---

## MVP completion — **open** items (sections 1–5)

Use order **1 → 5** where dependencies apply (e.g. task threads depend on Phase 18C).

### 1. Tasks & Projects (remaining)

- [ ] **GPUM (if in MVP):** Member-area **Projects**, **Tasks**, **Support tickets** per [planlog Phase 19](./planlog.md#phase-19-project-management-module) — or **defer** and document in planlog.
- [ ] **Phase 19 items you still want before fork:** e.g. support project naming / type, **`project_id` on invoices**, punch-style time UI — keep as [planlog](./planlog.md) checkboxes and work them here when in scope.
- [ ] **Directory (optional):** Align project **add member** with `GET /api/directory` where it reduces duplicate fetches ([planlog Phase 18C](./planlog.md#phase-18c-directory-unified-picker--messages--notifications)).
- [ ] **Project detail — Attachments tab:** Replace placeholder with file uploads or linked documents (schema/API TBD).
- [ ] **QA — All Tasks:** Full manual pass: default paint; preset + modal filters; **Overdue** + title search; column sort vs completed visibility; master reset (↺) recap.

### 2. Resources

No extra sessionlog lines — **Phase 21** in planlog. Optional: [picker MVP-if-time](./planlog.md#event-resource-picker--mvp-if-time-permits).

### 3. Messaging & notifications (MVP)

Goal: **Tenant admins** get reliable **notifications / activity**; **GPUMs** get **support-style messaging**. Timeline + threads; cut over from **`crm_notes`** where spec says so.

- [ ] **Wiring source of truth:** [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md)
- [ ] **Spec alignment:** [prd-technical §18C](./prd-technical.md#phase-18c-directory-and-messaging)
- [ ] **MVP gate:** No new **`crm_notes`** writes for migrated kinds; writes → timeline / threads
- [ ] **Merged read API:** Single stream (timeline ∪ threads), sort, cursor, **GPUM** never sees `admin_only` rows
- [ ] **Triggers:** Timeline for MVP-critical events (forms, orders, assign, MAG, … — define minimal set)
- [ ] **Event reminders — cron & multi-channel:** [planlog Phase 20](./planlog.md#phase-20-calendar--reminders--personal-ics-feeds) (email, push, in-app, SMS when connected)
- [ ] **Blog comments:** Verify threads + moderation paths ([wiring doc](./reference/messages-and-notifications-wiring.md))
- [ ] **Product comments** + **approval workflow** (posts + products)
- [ ] **Admin — Comments management** (e.g. `/admin/content/comments`)
- [ ] **Task comments:** **`conversation_threads`** / `thread_messages` (not new **`crm_notes`** volume for greenfield)
- [ ] **Support conversation:** GPUM ↔ tenant admin; UI entry points
- [ ] **UI:** Messages / notifications surface (admin + GPUM); contact timeline merge as needed
- [ ] **Cutover + backfill** from **`crm_notes`**; document in [prd-technical](./prd-technical.md)

**Plan detail:** [planlog Phase 18C](./planlog.md#phase-18c-directory-unified-picker--messages--notifications).

### 4. Auth — shared identity UX (forks)

- [ ] **Cold pages:** `/login`, `/register`, forgot-password — copy per [prd.md](./prd.md#shared-identity-ux-forks)
- [ ] **Transactional email:** Signup/welcome, reset — PHP-Auth wording; no tenant directory in email
- [ ] **Signed-in help:** `/members/account`, Security, admin profile
- [ ] **Profile labels:** Global vs **this site only**

**Plan detail:** [planlog Phase 00](./planlog.md#phase-00-supabase-auth-integration).

### 5. Pre-fork: review, security, finalization

**Align [mvt.md](./mvt.md)** with fork-ready template (deployment, module tier, shared-critical paths, donor workflow).

- [ ] Fork deployment section accurate
- [ ] Module surface tier table matches repo
- [ ] Shared-critical paths table current
- [ ] Code sitemap / per-module sections current
- [ ] Donor workflow documented in MVT
- [ ] Public vs admin boundary audit (`(public)` must not import admin-only code)
- [ ] Shared-critical inventory + pre-merge guardrails
- [ ] Route/API ownership documented
- [ ] Build / release policy (green `pnpm run build` before production)
- [ ] Public uptime smoke suite per tenant
- [ ] Fork checklist + [tenant-site-setup-checklist.md](./tenant-site-setup-checklist.md)

**Security, review, ops**

- [ ] Code review pass (auth, CRM, tasks, messaging APIs, RLS)
- [ ] Security: validation, RLS vs API, secrets, boundaries
- [ ] Performance spot-check — [planlog — Performance & Caching](./planlog.md#performance--caching-load-times)
- [ ] Fork checklist: env, migrations order, superadmin, smoke

**Plan detail:** [Code Review](./planlog.md#code-review-security--modular-alignment) & **Performance & Caching**.

---

## Post-MVP

All **future** work: [planlog.md](./planlog.md) — Phase **20**, **21** follow-on, **22**, analytics, shortcodes, RAG, etc.

---

## Reference

| Topic | Where |
|--------|--------|
| Directory & messaging spec | [prd-technical § Phase 18C](./prd-technical.md#phase-18c-directory-and-messaging) |
| Messages vs notifications wiring | [reference/messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md) |
| Tasks Customizer / slugs | Migration **187**; [changelog](./changelog.md) |
| Resources schema | Migration **183**; [planlog Phase 21](./planlog.md#phase-21-asset--resource-management) |
| Event exclusive-resource conflicts | [reference/event-resource-conflicts.md](./reference/event-resource-conflicts.md) |
| Resource time attribution | [reference/resource-time-attribution.md](./reference/resource-time-attribution.md) |
| Public vs admin module map | [mvt.md](./mvt.md) |
| Tenant fork setup | [tenant-site-setup-checklist.md](./tenant-site-setup-checklist.md) |
