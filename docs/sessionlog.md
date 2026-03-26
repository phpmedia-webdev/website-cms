# Session Log

**Purpose:** **MVP open-items checklist** — what still blocks **fork-deploy-ready** delivery. **Completed** work lives in [planlog.md](./planlog.md) (phase checkboxes) and [changelog.md](./changelog.md).

**Workflow:** See **`.cursor/rules/sessions.mdc`**. When you close an item, **check it off in [planlog.md](./planlog.md)** (matching phase) and **remove it from here** (or add a planlog-only checkbox if it belongs there). Session end → [changelog](./changelog.md) with **Context for Next Session**; changelog may cite **planlog** + chat, not only this file.

**Testing (unstyled / lost CSS):** **http://localhost:3000**; `Ctrl+Shift+R`; or delete `.next`, `pnpm run dev`, new tab.

**Specs:** [prd.md](./prd.md), [prd-technical.md](./prd-technical.md) (especially **Phase 18C** — Directory & messaging).

### Manual SQL — you run scripts in Supabase

**Database changes are not applied when you pull code.** Copy files from `supabase/migrations/` into **Supabase Dashboard → SQL Editor** and **Run** (numeric filename order).

**Applied on primary Supabase (2026-03-25):** **`207_tasks_contact_id.sql`** then **`208_tasks_project_id_nullable.sql`** — `tasks.contact_id`, nullable **`project_id`**, updated **`get_tasks_dynamic`** / **`get_task_by_id_dynamic`**. New forks or envs that are behind still run **207** then **208** in that order.
**Applied on primary Supabase (2026-03-26):** **`209_tasks_project_fk_set_null.sql`** and **`210_tasks_creator_follower_backfill.sql`** — safe project delete unlink behavior (`ON DELETE SET NULL`) and creator-follower backfill/report.
**Applied on primary Supabase (2026-03-26, evening):** **`214_message_center_mags_customizer.sql`** — `mags.allow_conversations`, GPUM MAG opt-in columns/tables, Customizer `message_center_*` seeds, `get_mags_dynamic` / `get_mag_by_id_dynamic` return `allow_conversations`. Other envs: run **214** in SQL Editor when behind.

- **`200_projects_project_number.sql`** — `projects.project_number` PROJ-YYYY-NNNNN + project list/detail RPCs.
- **`198_get_tasks_dynamic_preset_filters.sql`** — All Tasks presets (`exclude_status_slugs`, `due_before`).
- **`197_get_tasks_dynamic_exclude_archived_projects.sql`** — exclude tasks whose **project** is archived (confirm applied everywhere).


---

## MVP completion — **open** items (sections 0–5)

Use order **0 → 5** where dependencies apply (e.g. task threads depend on Phase 18C).

### 0. Standalone tasks conversion plan (DO FIRST)

Section 0 implementation is complete. See [changelog.md](./changelog.md) entry **2026-03-26 09:49 CT** for details; full manual QA matrix is deferred.

### 1. Tasks & Projects (remaining)

- [ ] **Assignee picker scope split (project-linked vs loose):** when `tasks.project_id` is set, scope assignee picker to that project's members for faster selection; when `tasks.project_id` is null (loose task), show full tenant directory. Keep behavior consistent across task detail/edit and follower APIs.
- [ ] **GPUM (if in MVP):** Member-area **Projects**, **Tasks**, **Support tickets** per [planlog Phase 19](./planlog.md#phase-19-project-management-module) — or **defer** and document in planlog.
- [ ] **GPUM calendar — task due-date layer parity:** when member area calendar/dashboard work starts, add a GPUM-safe task due-date overlay (month/week/day/agenda) with hover details and click-through to allowed task detail routes only. Respect GPUM visibility rules (`contact_id` linkage, assignee/follower access, and future `client_visible` / `internal_only` policy) so internal-only tasks never leak.
- [ ] **Phase 19 items you still want before fork:** e.g. standalone support-task refinements, **`project_id` on invoices**, punch-style time UI — keep as [planlog](./planlog.md) checkboxes and work them here when in scope.
- [ ] **Project detail — Attachments tab:** Replace placeholder with file uploads or linked documents (schema/API TBD).
- [ ] **Task assignee roles (Customizer first):** Add Customizer scope for **task follower / assignee roles** (e.g. `task_assignee_role` or `task_follower_role`), seed **creator**, **responsible**, **follower** as **core** (non-deletable slugs; labels/order/colors editable like **`project_role`**). Wire **Settings → Tasks** (or equivalent) and **link role pickers** (add assignee, responsible, etc.) to that scope instead of hard-coded strings where applicable.
- [ ] **Creator auto-assign + Assignees card order:** On **create task** (e.g. from All Tasks list), **auto-insert** the logged-in admin as **`task_followers`** with **creator** role; **API/UI:** creator row **not removable**. **Assignees card** order: **Creator** (and other role-grouped assignees) **first** → **linked contact** (`tasks.contact_id`) → **remaining assignees** by role. Align detail and edit surfaces.

**Task edit page (UI polish)**

- [ ] **Time logs — assignee display:** Avatar + name in the time list should use **full name** (same priority as elsewhere for “legal” / display name), not **nickname/handle-only**.
- [ ] **Assigned resources card:** Remove the **Edit** button. Replace **“Remove bundle”** (and equivalent remove actions for **single** resource rows) with a **trash / garbage can** icon control only (consistent for bundles and singles).

**Time model alignment (Tasks/Projects) — assessment + Do Next**

- **Current behavior:** Migrations **201** / **202** are **applied** (records): `planned_time` on `tasks`/`projects` (with legacy `proposed_time` sync via **201** where still present); list/detail RPCs return **`planned_time`** (**202**). App + direct writes use **`planned_time`**. **Project detail planned total** = sum of task `planned_time` (Option A). **Logged time** = sum of `task_time_logs`; **project logged** = rollup of those entries.
- Open follow-up only: add new items here if any planned-time regressions are found in future QA.

### 2. Resources

No extra sessionlog lines — **Phase 21** in planlog. Optional: [picker MVP-if-time](./planlog.md#event-resource-picker--mvp-if-time-permits).

### 3. Messaging & notifications (MVP)

Goal: **Tenant admins** get reliable **notifications / activity**; **GPUMs** get **support-style messaging**. Timeline + threads; cut over from **`crm_notes`** where spec says so.

- [ ] **Messaging system 2 more features:** Add unread/new indicators and bulk mark-as-read actions for message/notification workflows.
- [ ] **Wiring source of truth:** [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md)
- [ ] **Spec alignment:** [prd-technical §18C](./prd-technical.md#phase-18c-directory-and-messaging)
- [x] **MVP gate:** No new **`crm_notes`** writes for migrated kinds; writes → timeline / threads
- [ ] **Merged read API:** Single stream (timeline ∪ threads), sort, cursor, **GPUM** never sees `admin_only` rows
- [ ] **Triggers:** Timeline for MVP-critical events (forms, orders, assign, MAG, … — define minimal set)
- [ ] **Event reminders — cron & multi-channel:** [planlog Phase 20](./planlog.md#phase-20-calendar--reminders--personal-ics-feeds) (email, push, in-app, SMS when connected)
- [ ] **Blog comments:** Verify threads + moderation paths ([wiring doc](./reference/messages-and-notifications-wiring.md))
- [ ] **Product comments** + **approval workflow** (posts + products)
- [ ] **Admin — Comments management** (e.g. `/admin/content/comments`)
- [x] **Task comments:** **`conversation_threads`** / `thread_messages` (not new **`crm_notes`** volume for greenfield)
- [ ] **Tasks — hide from client (design + implement):** Edge case where a team member keeps a task **private** from the linked contact / GPUM — e.g. boolean **`client_visible`** / **`internal_only`** on `tasks`, default visible; **`contact_id`** remains “who we communicate with,” not “who may see the task.” Thread GPUM APIs, notifications, and any member task lists must respect the flag once added.
- [ ] **Support conversation:** GPUM ↔ tenant admin; UI entry points
- [ ] **UI:** Messages / notifications surface (admin + GPUM); contact timeline merge as needed
- [ ] **Cutover + backfill** from **`crm_notes`**; runtime app usage removed in current code paths, keep DB table temporarily for compatibility and optional backfill audit; document in [prd-technical](./prd-technical.md)
- [ ] **Fork migration note (important):** For new tenant/fork migrations, treat **`crm_notes`** as **legacy**. Keep it only for temporary compatibility/backfill windows; after timeline/thread backfill is complete in a fork, remove `crm_notes` from that fork’s required runtime migration path.

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

## Accounting (planned module — lightweight financials)

**Goal:** Track **money in** + **money out** and project-level margin (lightweight financials, not full accounting).

**Design notes (keep concise):**
- Use one canonical income model to avoid double counting (`payments` strategy must be explicit).
- Map Stripe order/invoice payment events to that model consistently.
- Keep expenses project-linkable (`project_id` nullable) and category-driven.
- Add project labor-rate support for margin rollups.
- Preserve tenant-safe access/RLS and simple admin navigation.

### Open checklist (Accounting)

- [ ] Lock **SSOT strategy** (physical `payments` for all vs `payments` for manual + union of `orders`).
- [ ] Migration(s): `payments`, `expenses`, `projects.labor_rate_per_hour` (names TBD); RLS; **Manual SQL** callout in chat + sessionlog.
- [ ] Server lib + API routes (admin).
- [ ] UI: Accounting nav + pages; project detail may embed summary widget.
- [ ] Feature slug + sidebar accordion (pattern: `sidebar-config.ts`, `Sidebar.tsx`).
- [ ] **Next:** phased **step plan** (tasks file or planlog subsection) after review.

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
| **Accounting** (planned: payments, expenses, labor rate, nav) | This file — **§ Accounting (planned module)** |
