# Session Log

**Purpose:** **MVP open-items checklist** — what still blocks **fork-deploy-ready** delivery. **Completed** work lives in [planlog.md](./planlog.md) (phase checkboxes) and [changelog.md](./changelog.md).

**Workflow:** See **`.cursor/rules/sessions.mdc`**. When you close an item, **check it off in [planlog.md](./planlog.md)** (matching phase) and **remove it from here** (or add a planlog-only checkbox if it belongs there). Session end → [changelog](./changelog.md) with **Context for Next Session**; changelog may cite **planlog** + chat, not only this file.

**Testing (unstyled / lost CSS):** **http://localhost:3000**; `Ctrl+Shift+R`; or delete `.next`, `pnpm run dev`, new tab.

**Specs:** [prd.md](./prd.md), [prd-technical.md](./prd-technical.md) (especially **Phase 18C** — Directory & messaging).

### Manual SQL — you run scripts in Supabase

**Database changes are not applied when you pull code.** Copy files from `supabase/migrations/` into **Supabase Dashboard → SQL Editor** and **Run** (numeric filename order).

**Task features shipped in code (run when not yet applied):** **`207_tasks_contact_id.sql`**, **`208_tasks_project_id_nullable.sql`** (order: **207** then **208** after **207** deps).



---

## MVP completion — **open** items (sections 1–5)

Use order **1 → 5** where dependencies apply (e.g. task threads depend on Phase 18C).

### 1. Tasks & Projects (remaining)

- [ ] **GPUM (if in MVP):** Member-area **Projects**, **Tasks**, **Support tickets** per [planlog Phase 19](./planlog.md#phase-19-project-management-module) — or **defer** and document in planlog.
- [ ] **Phase 19 items you still want before fork:** e.g. support project naming / type, **`project_id` on invoices**, punch-style time UI — keep as [planlog](./planlog.md) checkboxes and work them here when in scope.
- [ ] **Project detail — Attachments tab:** Replace placeholder with file uploads or linked documents (schema/API TBD).
- [ ] **Task assignee roles (Customizer first):** Add Customizer scope for **task follower / assignee roles** (e.g. `task_assignee_role` or `task_follower_role`), seed **creator**, **responsible**, **follower** as **core** (non-deletable slugs; labels/order/colors editable like **`project_role`**). Wire **Settings → Tasks** (or equivalent) and **link role pickers** (add assignee, responsible, etc.) to that scope instead of hard-coded strings where applicable.
- [ ] **Creator auto-assign + Assignees card order:** On **create task** (e.g. from All Tasks list), **auto-insert** the logged-in admin as **`task_followers`** with **creator** role; **API/UI:** creator row **not removable**. **Assignees card** order: **Creator** (and other role-grouped assignees) **first** → **linked contact** (`tasks.contact_id`) → **remaining assignees** by role. Align detail and edit surfaces.

**Task edit page (UI polish)**

- [ ] **Time logs — assignee display:** Avatar + name in the time list should use **full name** (same priority as elsewhere for “legal” / display name), not **nickname/handle-only**.
- [ ] **Assigned resources card:** Remove the **Edit** button. Replace **“Remove bundle”** (and equivalent remove actions for **single** resource rows) with a **trash / garbage can** icon control only (consistent for bundles and singles).

**Time model alignment (Tasks/Projects) — assessment + Do Next**

- **Current behavior:** Migrations **201** / **202** are **applied** (records): `planned_time` on `tasks`/`projects` (with legacy `proposed_time` sync via **201** where still present); list/detail RPCs return **`planned_time`** (**202**). App + direct writes use **`planned_time`**. **Project detail planned total** = sum of task `planned_time` (Option A). **Logged time** = sum of `task_time_logs`; **project logged** = rollup of those entries.
- [x] **Naming consistency:** Sweep remaining UI for **Estimated/Proposed** → **Planned** where missed.
- [x] **Follow-up migration (optional):** Drop `proposed_time` + sync triggers after all envs use `planned_time` only; remove `proposed_time` body aliases from APIs.
- [x] **Project logged-time rollup:** Keep dynamic sum from `task_time_logs`; add cached columns only if needed.
- [x] **QA:** task detail/edit, All Tasks, project detail, APIs — spot-check `planned_time` vs RPC/UI parity.

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
- [ ] **Tasks — hide from client (design + implement):** Edge case where a team member keeps a task **private** from the linked contact / GPUM — e.g. boolean **`client_visible`** / **`internal_only`** on `tasks`, default visible; **`contact_id`** remains “who we communicate with,” not “who may see the task.” Thread GPUM APIs, notifications, and any member task lists must respect the flag once added.
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

## Accounting (planned module — lightweight financials)

**Goal:** Track **money in** + **money out** and project-level margin — **not** a full GL/accounting module. See discussion in recent chat (income SSOT, orders vs invoices, off-Stripe receipts, labor rate).

### Review plan — what we need

**New Idea** All income has an invoice for tracking Money in the register. Invoices can have multiple payments applied.
The plan is to have a single transactional register for income and expenses. filtering by any range will show a quick P&L.
Verify how Stripe orders/invoices are mapped. 

| Area | Intent |
|------|--------|
| **`payments`** (canonical **income** / cash-in) | **Single table** as SSOT for reporting: each row = one **received** amount. Link **`contact_id`** (who paid — optional but recommended for CRM). Link **`project_id`** for profitability. **Stripe:** `order_id` and/or `invoice_id` nullable FKs + `stripe_*` ids for idempotency (avoid double rows). **Off-Stripe (cash, Venmo, check, wire):** rows with **no** order/invoice, method + note. **Rule:** define whether rows are **only** manual/off-Stripe + **view/RPC unions** paid `orders`, or **backfill** every paid order into `payments` — pick one to avoid double-counting. |
| **`expenses`** (ledger) | **amount**, **currency**, **incurred_at**, **description**, **vendor** (text or FK later), **`project_id`** (nullable = overhead), **category** via **Customizer** slug (e.g. `expense_category`), optional **receipt_url**, audit fields. |
| **Projects** | **`labor_rate_per_hour`** (numeric, nullable) × **logged time** (existing time logs) = internal labor cost in margin. |
| **Reporting** | RPC or SQL view: **project income** = sum(`payments` for project) + **expense** sum + **labor**; **contact** = filter `payments` by `contact_id`. Document **no double count** with raw `orders` if union is used. |
| **Admin nav** | New section or sub-nav: **“Accounting”** or **“Financials”** (label TBD) — e.g. routes under `/admin/accounting/...` for **Payments** (list, add manual), **Expenses**, optional **Project P&L** summary. Wire **`sidebar-config.ts`** + **feature registry** gate if needed. |
| **RLS** | Policies consistent with project + CRM admin access. |

### Things easy to overlook (decide in design)

- **Refunds / chargebacks** — negative amount or separate `payment_adjustments` (defer if v1 is gross-only).
- **Multi-currency** — store currency per row; FX to base currency deferred or manual.
- **Paid manual invoice** — today creates **both** `invoices` and **`orders`**; `payments` must reference **one** economic event (usually `order_id` after webhook, or invoice-only rule).
- **Backfill** — existing tenants: script or optional migration from paid `orders` into `payments`.
- **MVT / prd-technical** — short **Income rules** subsection when implemented.

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
