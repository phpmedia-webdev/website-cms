# Session Log

**Purpose:** **MVP open-items checklist** — what still blocks **fork-deploy-ready** delivery. **Completed** work lives in [planlog.md](./planlog.md) (phase checkboxes) and [changelog.md](./changelog.md).

**Workflow:** See **`.cursor/rules/sessions.mdc`**. When you close an item, **check it off in [planlog.md](./planlog.md)** (matching phase) and **remove it from here** (or add a planlog-only checkbox if it belongs there). Session end → [changelog](./changelog.md) with **Context for Next Session**; changelog may cite **planlog** + chat, not only this file.

**Testing (unstyled / lost CSS):** **http://localhost:3000**; `Ctrl+Shift+R`; or delete `.next`, `pnpm run dev`, new tab.

**Specs:** [prd.md](./prd.md), [prd-technical.md](./prd-technical.md) (especially **Phase 18C** — Directory & messaging).

### Manual SQL — you run scripts in Supabase

**Database changes are not applied when you pull code.** Copy files from `supabase/migrations/` into **Supabase Dashboard → SQL Editor** and **Run** (numeric filename order).

**Applied on primary Supabase (through 2026-03-26):** Migration queue is current through **`214`**, including **`197`** / **`198`** (All Tasks RPC presets + archived-project exclusion), **`200`** (project numbers), **`207`**–**`214`** (tasks **`contact_id`**, nullable **`project_id`**, standalone task FK/backfill, reminders + calendar visibility, Message Center / MAG **`214`**). **New forks or stale envs:** copy **`supabase/migrations/`** in **numeric filename order** and run any files not yet applied on that database.

---

## MVP completion — **open** items (sections 0–5)

Use order **0 → 5** where dependencies apply (e.g. task threads depend on Phase 18C).

### 0. Standalone tasks conversion

**Status:** Implementation complete. Manual QA matrix deferred. See [changelog.md](./changelog.md) **2026-03-26 09:49 CT** and [planlog Phase 19](./planlog.md#phase-19-project-management-module) (standalone support tasks, **`POST /api/tasks`**, etc.).

### 1. Tasks & Projects (remaining)

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

**Shipped (synced 2026-03-26):** Admin **Message Center** on **Dashboard** — `DashboardTabsClient` **Message Center** tab + `DashboardActivityStream` (thread-head rows ∪ timeline items, type filters, title search, deep links). **APIs:** `GET /api/admin/message-center`, unread count for tab, `PATCH` thread read. **MAG:** `allow_conversations` (CRM MAG detail), GPUM **messaging preferences** (member profile), post policy + support/task thread participant seeding. **DB:** migration **214** + Customizer `message_center_*` seeds. **Policy:** no new **`crm_notes`** for migrated kinds; task discussion on **`conversation_threads`**. Full detail: [changelog](./changelog.md) **2026-03-26 16:44 CT**, [planlog Phase 18C](./planlog.md#phase-18c-directory-unified-picker--messages--notifications), [plan-message-center-roadmap.md](./reference/plan-message-center-roadmap.md).

**Message Center — GUI / UX next steps (build from here)**

**GPUM Message Center MVP** — Product rules and v1.1 scope: [plan-gpum-message-center-mvp.md](./reference/plan-gpum-message-center-mvp.md). **Phases 0–3** are **shipped at functional v1** (2026-03-26–27): `gpum-message-center.ts`, `gpum-member-stream.ts`, `gpum-mag-eligibility.ts`, `GET /api/members/message-center`, **`MemberActivityStream`** on **`/members/messages`**. **Next focus:** Phase **4–5** below + broader §3 bullets; mirror [planlog Phase 18C](./planlog.md#phase-18c-directory-unified-picker--messages--notifications).

**GPUM pages — function, not template polish:** Implement **working flows and APIs** with plain, accessible UI (shared components ok). **Avoid** heavy visual/design work in this repo — **each tenant fork is bespoke**; forks own layout and styling.

#### GPUM Message Center MVP — execution checklist

**Phase 0 — Types and API contract**

- [x] **0.1** Normalized GPUM stream item type (discriminated union): `notification` | `announcement_feed` | `conversation_head` in `gpum-message-center.ts`.
- [x] **0.2** `GET /api/members/message-center` returns `items[]`, `streamItems[]`, `nextCursor`, `hasMore` — **`nextCursor` / `hasMore` still stubbed** (real cursor pagination = follow-up).
- [x] **0.3** **`getMemberActivity`** skips **`visibility === "admin_only"`** timeline rows; merged stream builds on that activity slice.

**Phase 1 — Server: merged “All” stream**

- [x] **1.1** `getMemberMessageCenterMergedStream`: notifications + announcement lines + **conversation_head** rollups (**support** + eligible **MAG** threads via `memberCanSeeMagGroupThread`).
- [x] **1.2** Dedup policy: feed row + in-thread message for same announcement remains acceptable; document when tightening (Phase **5.1**).
- [x] **1.3** **All / Conversations / Notifications** applied server-side (`filterMemberStreamItems` + route).

**Phase 2 — MAG eligibility helper**

- [x] **2.1** `memberCanSeeMagGroupThread` — membership + prefs + nickname gate (`gpum-mag-eligibility.ts`).
- [x] **2.2** Helper used in **stream** builder; **POST** thread messages enforced by **`assertCanPostThreadMessage`** (aligned MAG / opt-in rules).

**Phase 3 — Client: `/members/messages`**

- [x] **3.1** Stream + filter + search + date presets (functional layout).
- [x] **3.2** Rows with `threadId` open **inline** transcript (`GET /api/conversation-threads/.../messages`); other rows list-only / order deep link.
- [x] **3.3** Transcript + **reply** composer; failures show read-only error state.
- [ ] **3.4** **Partial — follow-up if product wants it:** **Message support** button + **conversation_head** rows cover support + eligible MAG threads; **no** dedicated **sheet picker** listing only Support + MAGs to start a **new** MAG thread outside existing heads.

**Phase 4 — Unread and light UX (not visual polish)**

- [ ] **4.1** Unread for member threads (`thread_participants` + member-safe mark-read if missing); surface **`unread`** on `conversation_head` in UI.
- [ ] **4.2** Empty states (gates, no messages).
- [ ] **4.3** `/members` dashboard: link or short preview + “See all” (no full duplicate implementation).

**Phase 5 — Docs and QA**

- [ ] **5.1** [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md) — GPUM stream vs drill-down, MAG gates, filters (sync with implemented API).
- [ ] **5.2** [planlog.md](./planlog.md) Phase 18C — keep checkboxes aligned (GPUM read API + UI v1 done; cursor + cutover + edge cases remain).
- [ ] **5.3** Manual QA: support, MAG on/off, opt-in off, missing nickname, **All** shows announcements without opening MAG, filters.

#### Next up (§3 — messaging / notifications)

**Priority next session:** **§1 — GPUM Phase 4** (thread unread + member mark-read), then empty states and `/members` dashboard discovery.

**1. GPUM Phase 4 — unread, empty states, dashboard discovery**

Admins already get unread styling and mark-read on **thread participants**; members do not yet get a first-class **“you have unread messages”** signal on conversation heads or a **member-safe** way to clear unread when they open a thread. Phase 4 closes that gap: compute or read **`last_read_at`** (or equivalent) for the **member’s** participation row, expose **unread** on `conversation_head` items in `GET /api/members/message-center`, and add **PATCH** (or POST) mark-read when the member views a thread—mirroring the admin pattern but **RLS- and API-safe** for GPUM. **Empty states** mean copy and UI when there are no threads, MAG conversations are gated (opt-in off, no nickname), or filters return nothing—so members are not staring at a blank card without explanation. **`/members` dashboard** should surface at least a **short preview** (e.g. last line + link) and **See all → `/members/messages`** so messaging is discoverable without bookmarking the messages route.

**2. GPUM Phase 5 — docs, QA, cursor pagination**

The **wiring doc** ([messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md)) should describe the **implemented** GPUM stream shape (`streamItems` kinds), how **filters** map to server behavior, **MAG eligibility** (`memberCanSeeMagGroupThread` vs **`assertCanPostThreadMessage`**), and where **announcement_feed** vs **conversation_head** differ—so the next fork and the next developer do not reverse-engineer from code. **Manual QA** should run a small matrix: support thread happy path; MAG with **allow_conversations** on/off; member **global + per-MAG** opt-in off; **missing nickname** (thread hidden from stream); **All** still shows notifications without forcing MAG entry; **Conversations** vs **Notifications** filters. **Cursor pagination**: today **`nextCursor` / `hasMore`** are stubs; once real volumes appear, implement stable ordering + cursor in **`getMemberMessageCenterMergedStream`** and the GET handler so the UI can load older pages without fetching hundreds of rows up front.

**3. Optional Phase 3.4 — “new conversation” picker (sheet)**

Today, **Support** is started via **Message support** (and existing support threads appear as heads); **MAG** group threads appear when the tenant already has a **mag_group** thread for that MAG. There is **no** dedicated UI that says “start or open a conversation” in a **single sheet** listing only **Support** + **eligible MAGs** (no DMs). If product wants clearer **intent** (“I want to talk to this MAG community”), add a modal/sheet that lists those destinations and either opens an existing head or creates/bootstraps the thread per existing server rules—still **no member-to-member DM** for MVP.

**4. Broader messaging MVP (below this checklist)**

These items are **not** GPUM Message Center polish; they are **platform** work that the PRD treats as part of notifications/messaging maturity: **timeline triggers** (what events insert timeline rows—forms, orders, assignments, MAG changes—so behavior is predictable). **Event reminders** (cron + email/in-app/PWA per [planlog Phase 20](./planlog.md#phase-20-calendar--reminders--personal-ics-feeds)). **Blog / product comments** (thread storage, moderation, optional **admin Comments** hub). **Tasks hidden from clients** (`client_visible` / `internal_only`) so internal work and threads do not leak to GPUM lists. **`crm_notes` cutover** for forks: document that new kinds live on **timeline + threads**, keep legacy table only as long as needed, and avoid new feature work that depends on **`crm_notes`** for those kinds.

**5. Admin product direction — chat vs feed**

**Unified activity + thread row** (current admin dashboard model) optimizes **scanning** everything at once; **SMS-style chat** optimizes **one continuous support (or MAG) transcript** without hunting. This is a **product** decision ([changelog](./changelog.md) **2026-03-26 23:53 CT**): it affects layout, density, and whether staff default to **CRM contact + expanded thread** vs a **single inbox**. Engineering follow-ons depend on that choice—e.g. **expandable support row** or a **right-hand chat panel** so admins can read the full thread **without** relying on search or leaving the dashboard. Until decided, keep improving the **current** model (contact scope, labels, composer defaults) without a large redesign.

---

- [ ] **GPUM UX model (product):** **SMS-style chat** vs **unified feed + thread row** — optional follow-on; transcript UI in Phase 3 can align either way ([changelog](./changelog.md) **2026-03-26 23:53 CT**).

**Recently shipped (admin Message Center surface):** Unread row styling, bulk mark read / mark visible unread, **View all** + filter menu (`admin-filters.ts`), **`GET /api/admin/message-center`** + mark-read batch, **contact-scoped** stream on CRM **Message Center** tab (`DashboardActivityStream` in `ContactRecordLayout`) + **`/admin/dashboard/message-center?contact_id=`** deep link, full page + sidebar + dashboard tab **Open full page**; legacy **`/admin/message-center`** → **`308`**. **Contact + expanded thread UX:** header **Add note** on non-Messages filters vs **Add message or note** on Messages; composer opens **internal note** vs **message** by context; bottom **Message** CTA + message-only dialog in inline conversation mode; transcript **`enrichAuthors`**, scroll/ordering fixes, staff vs member labeling in thread rows.
- [ ] **Support — GPUM surfaces:** Clear **entry points** to support / ticket threads from member area (not only API).
- [ ] **Docs / spec:** Keep [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md) + [prd-technical §18C](./prd-technical.md#phase-18c-directory-and-messaging) aligned as UI/API land.

**Still open (broader messaging MVP, non-GUI or later)**

- [ ] **Timeline triggers:** Minimal set (forms, orders, assign, MAG, …) — define and implement.
- [ ] **Event reminders — cron & multi-channel:** [planlog Phase 20](./planlog.md#phase-20-calendar--reminders--personal-ics-feeds)
- [ ] **Blog comments:** Verify threads + moderation paths ([wiring doc](./reference/messages-and-notifications-wiring.md))
- [ ] **Product comments** + **approval workflow** (posts + products)
- [ ] **Admin — Comments management** (e.g. `/admin/content/comments`)
- [ ] **Tasks — hide from client (design + implement):** **`client_visible`** / **`internal_only`** on `tasks`; threads + GPUM lists respect flag.
- [ ] **Cutover + backfill** from **`crm_notes`**; runtime paths already off **`crm_notes`** for migrated kinds; keep DB table temporarily; document in [prd-technical](./prd-technical.md)
- [ ] **Fork migration note:** Treat **`crm_notes`** as **legacy** for new forks; remove from required runtime path after backfill.

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
| GPUM Message Center MVP (steps) | [reference/plan-gpum-message-center-mvp.md](./reference/plan-gpum-message-center-mvp.md) + **§3 checklist** above |
| Tasks Customizer / slugs | Migration **187**; [changelog](./changelog.md) |
| Resources schema | Migration **183**; [planlog Phase 21](./planlog.md#phase-21-asset--resource-management) |
| Event exclusive-resource conflicts | [reference/event-resource-conflicts.md](./reference/event-resource-conflicts.md) |
| Resource time attribution | [reference/resource-time-attribution.md](./reference/resource-time-attribution.md) |
| Public vs admin module map | [mvt.md](./mvt.md) |
| Tenant fork setup | [tenant-site-setup-checklist.md](./tenant-site-setup-checklist.md) |
| **Accounting** (planned: payments, expenses, labor rate, nav) | This file — **§ Accounting (planned module)** |
