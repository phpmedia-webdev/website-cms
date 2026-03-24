# Session Log

**Purpose:** **MVP completion checklist** — handoff and what to build next until the app is **fork-deploy ready**. Detailed phased backlog stays in [planlog.md](./planlog.md).

**Workflow:** See **`.cursor/rules/sessions.mdc`**. Check items off **here** when done; **mirror** the same completions on matching [planlog](./planlog.md) lines (Phases **00**, **18C**, **19**, **21**, Code Review) where applicable. Session end → [changelog](./changelog.md) with **Context for Next Session**.

**Testing (unstyled / lost CSS):** **http://localhost:3000**; `Ctrl+Shift+R`; or delete `.next`, `pnpm run dev`, new tab.

**Specs:** [prd.md](./prd.md), [prd-technical.md](./prd-technical.md) (especially **§ Phase 18C** — Directory & messaging).

### Manual SQL — you run scripts in Supabase

**Database changes are not applied when you pull code.** Any new/changed file under `supabase/migrations/` must be copied into **Supabase Dashboard → SQL Editor** and **Run** (in numeric filename order). The assistant should **always say so explicitly** in chat (labeled **Manual SQL** / **You need to run**) and put the same warning in the migration file header when adding one.

**Outstanding (add a line when a new migration ships; delete after you run it):** **`198_get_tasks_dynamic_preset_filters.sql`** — All Tasks §1.3 (`exclude_status_slugs`, `due_before`). Remove after run. (**197** = archived-project exclusion — ensure applied on every tenant schema.)

---

## MVP completion (through fork-ready deploy)

Work in order **1 → 5** where dependencies apply (e.g. task comments depend on thread APIs; resources picklist aligns with events).

### 1. Tasks & Projects (MVP)

Goal: Tenant admins can run **projects + tasks** day-to-day; GPUM flows match MVP scope in planlog.

- [x] **Admin:** Projects list/detail, tasks (incl. All Tasks), create/edit/detail, assignees, time logs, project members + client org, linked events/calendar, transactions tab — **no critical gaps** for daily use.
- [x] **Project detail (admin) — donor-style layout (Mar 2026):** Overview hero (stats grid, logged/utilization, task progress + segments, team); breadcrumb **Activities / Projects / Project detail**; **Tabs:** Tasks · Events · Transactions · **Attachments** (placeholder UI; wiring later); Share/More disabled placeholders. **`src/app/admin/projects/[id]/ProjectDetailClient.tsx`.**
- [ ] **GPUM (if in MVP):** Member-area **Projects**, **Tasks**, **Support tickets** per [planlog Phase 19](./planlog.md#phase-19-project-management-module) — or explicitly **defer** and document in planlog.
- [ ] **Remaining Phase 19 open items** you want in MVP (e.g. support project naming, `project_id` on invoices/orders, optional punch-style time UI) — check off in [planlog](./planlog.md) as you complete them.
- [ ] **Directory:** Optional — align **project “add member”** with `GET /api/directory` where it reduces duplicate fetches ([planlog Phase 18C](./planlog.md#phase-18c-directory-unified-picker--messages--notifications)).

**Plan detail:** [planlog.md — Phase 19](./planlog.md#phase-19-project-management-module).

#### 1.1 All Tasks list — unified **Custom filters** modal & toolbar

**Goal:** One clear toolbar row; all advanced filters live behind a single modal; filtered state is obvious without crowding the row.

- [x] **Default task list scope (product):** Tasks have a normal final **`task_status` of Complete** (Customizer); **completed tasks stay in list views** so admins get a **recap / “where we are at”** picture for **ongoing work**. **When a project is archived** (`projects.archived_at` set — or equivalent), **exclude all of that project’s tasks** from **All Tasks** and the same family of list views. **Do not** hide completed tasks globally; only **archived-project exclusion** and **§1.3 presets** change what appears.
- [x] **Implementation:** Ensure **`get_tasks_dynamic`** / `GET /api/tasks` (or client filter only if full tenant scope is guaranteed) **drops tasks whose project is archived**; document in [mvt.md](./mvt.md) when done. **DB:** migration **`197_get_tasks_dynamic_exclude_archived_projects.sql`** (applied on main Supabase project).
- [x] **Toolbar layout (single row):** Left: **title search**; middle: **All Active** (default) / **My tasks** / **Overdue** (§1.3); right: **Custom filters** + **master reset** (↺ recap).
- [x] **Remove from the row:** Standalone **Projects**, **Assignees**, **Phase** buttons and the inline **Type** / **Status** selects — their controls move **into** the unified modal (reuse existing picker bodies: project checklist, assignee directory-style picker, phase multi-select, type & status as in-row selects *inside* the modal or equivalent).
- [x] **Unified modal:** One scrollable dialog with **sections** (headings): Projects · Assignees · Phase · Type · Status. Reuse current state shape and `buildTasksQuery` / `GET /api/tasks` apply pattern — **no duplicate source of truth**; modal only edits the same React state the row used before. **Apply** (or auto-apply on change + Close) per UX preference; **Clear** per section optional; **Reset all** can match toolbar reset or call same handler.
- [x] **Custom filters button — filtered state:** Icon (e.g. funnel) reflects **active filters**: any non-default for projects, assignees, phase, type, status (and optionally title search if you want it to light the icon — **decide explicitly**). Badge with **count of active dimensions** optional. `aria-pressed` / `aria-expanded` when modal open. **Decision:** title search does **not** light the funnel (only modal dimensions); badge = count of active dimensions (1–5).
- [x] **Accessibility & mobile:** Modal focus trap, section labels, sticky footer with primary actions if the sheet is long.
- [x] **Docs:** Note in [mvt.md](./mvt.md) (All Tasks / `AllTasksListClient`) when shipped.

#### 1.2 All Tasks list — column header sorting (asc/desc) & **Project** “group” sort

**Goal:** Standard sortable columns; **Project** is special — it clusters tasks by project name, with a fixed **within-project** order so rows read like a pipeline.

- [x] **Sortable headers:** Each data column header is a **control** (button or `role="columnheader"` + keyboard): first click **asc**, second **desc**, show **↑/↓** (or equivalent) on the active column. **Default sort:** **Due date** ascending (nulls last); tie **title** then **task number**. **Shipped:** button headers + `aria-sort` + `aria-label`; **`DEFAULT_ALL_TASKS_SORT`** in `all-tasks-sort.ts`.
- [x] **Standard columns (single key × direction):** **Title**, **Assignee** (define tie-breaker: e.g. lexicographic join of assignee labels), **Phase** (order = **Customizer / `taskPhaseOptions` index**, unknown slugs last), **Type** / **Status** (same Customizer-order pattern as today’s option lists), **Due date** (nulls **last** in both directions unless product says otherwise), **Progress** (same % logic as the cell; no estimate → sort **after** rows with estimate when ascending).
- [x] **Project column — special composite sort:** Primary: **project name** A→Z or Z→A per user toggle. **Within the same project**, always: **Phase** by Customizer order (ascending workflow order), then **Due date** ascending with **nulls last**, then **Title** (or `task_number`) as final tie-breaker. **UI:** When **Project** is the active sort, a **group header row** (full width) precedes each project’s tasks; task order under it matches phase → due → title. Tooltip on Project header describes grouping + composite order.
- [x] **Client-side vs server:** MVP sorts **`displayTasks`** (after title search) in **`AllTasksListClient`** — **no API change** unless a later phase needs server-side sort for huge lists. **Code:** `src/lib/tasks/all-tasks-sort.ts` + `AllTasksListClient`.
- [x] **QA (implementation):** **Assignee** column sort uses sorted label join (`assigneeSortKey` — multi-assignee); missing phase/type/status sort last via `UNKNOWN_INDEX`; null due → nulls last; no estimate → `compareProgress`; **Project** desc reverses project name only; within-project order stays phase → due → title (`compareProjectComposite`). **Optional:** quick UI pass with messy real data.

#### 1.3 All Tasks list — **preset views** (toolbar) & layering rules

**Goal:** Three one-click presets (**All Active** default, **My tasks**, **Overdue**) that set **filter + sort** defaults; users can **refine** with the custom filter modal and title search **without** the preset wiping those choices (except **All Active** / **Overdue** clear **assignee** selection when applied). **Master reset** (↺) clears modal filters + title search + sort → **`DEFAULT_ALL_TASKS_SORT`**, sets **`tasksPreset` → `none`**, refetches **full recap** (all statuses **including completed**; archived projects still excluded — **197**).

**Exception vs default list (§1.1):** **SSR + landing** use **`exclude_status_slugs=completed`** so the first paint matches **All Active**. **All Active**, **My tasks**, and **Overdue** all **exclude completed** (`TASK_STATUS_SLUG_COMPLETED`). **Column sort** clears presets → `tasksPreset` **`none`**, refetch **without** exclude — **completed** tasks show again until the user picks **All Active** (or another preset). **Archived** projects never contribute rows (**197**).

**Workflow rules (product):**

- [x] **Presets are a starting point:** Applying a preset sets its **filter** and **sort** (`PRESET_FLAT_DUE_SORT`); it does **not** block **Custom filters** or **title search** (modal dimensions merge on **Apply**). **My tasks** highlight drops to **All Active** if assignee set is no longer exactly the current user (team id only).
- [x] **Title search stacks:** API/query from modal + presets; title filter **client-side** on loaded rows.
- [x] **Master reset only:** Clears modal filters, **title search**, **preset** → **`none`** (recap: **include completed**), **sort** → **`DEFAULT_ALL_TASKS_SORT`** (due ↑, title tie). **Reset enabled** when not already at that baseline **or** when **All Active** / other preset is active (so users can jump from default landing to recap). **Decision:** reset **includes** column sort.
- [x] **Preset button state:** **`secondary`** when active; cleared on **column header** click (`tasksPreset` → **`none`** + **refetch** without preset RPC params) or superseded by another preset. **Modal Apply** keeps the current preset when still valid (**Overdue**, **All Active**, etc.).

**Preset: All Active** (default)

- [x] **Filter:** **`exclude_status_slugs=completed`** only (no assignee / no `due_before`). Same RPC scope as list: non-archived projects only (**197**).
- [x] **Sort:** **`PRESET_FLAT_DUE_SORT`** — due ↑ nulls last; title then task number.
- [x] **UI:** First toolbar preset; **Apply** on click clears assignee selection; refines with **Filters** / title search.
- [x] **SSR:** `tasks/page.tsx` loads initial bundle with **`getAdminTasksListBundle({ exclude_status_slugs: [completed] })`**.

**Preset: My tasks**

- [x] **Filter:** `assignee_user_ids=<currentUserId>` (same RPC path as today: followers / responsible / creator). **`exclude_status_slugs=completed`** (`TASK_STATUS_SLUG_COMPLETED`). **MVP:** team **`user_id` only** — not contact assignees.
- [x] **Sort (flat list — not project-grouped):** **`PRESET_FLAT_DUE_SORT`** (= default) — due ↑ nulls last; tie title A→Z then task number (`all-tasks-sort` **dueDate** branch).
- [x] **API:** `GET /api/tasks` with above params + other modal filters when set.

**Preset: Overdue**

- [x] **Filter:** Server **`due_before`** = **local calendar `YYYY-MM-DD` today** from the browser; RPC `due_date < due_before` and `due_date IS NOT NULL`. **`exclude_status_slugs=completed`**.
- [x] **Sort (flat — not grouped):** Same as **My tasks** (due ↑ oldest first, tie title, tie task number).
- [x] **Implementation:** Migration **`198_get_tasks_dynamic_preset_filters.sql`** — `exclude_status_slugs`, `due_before` on **`get_tasks_dynamic`**.

**Shared implementation checklist**

- [x] **`currentUserId`** from **`getCurrentUser()`** in `tasks/page.tsx` → **`AllTasksListClient`**.
- [x] **Column header** after preset: **`tasksPreset`** → `none` + **refetch** without preset RPC params; sort toggles per §1.2.
- [ ] **QA:** **All Active** default paint; preset → modal add project filter → results narrow; title search + **Overdue**; column sort shows completed; **All Active** again hides them; master reset (↺) → **recap** (`none`, includes completed) + clears search/filters; from recap baseline, reset disabled until filters/preset/sort/search change.

---

### 2. Resources (MVP picklist; bundles; time attribution; future full asset manager)

Goal: One **`resources`** master registry (with **Customizer `resource_type`** slugs via **Settings → Resources** / `getCalendarResourceTypes`). **Events** and **tasks** attach real rows through **`event_resources`** / **`task_resources`**. **Bundles** are **virtual** definitions (reusable; same physical resource can appear in multiple bundles). Pickers show **bundles first**, then **individual** resources. **Not every master row is pickable** (e.g. office supplies for asset tracking only). **Time usage** rolls up from **event intervals** and **task time** (see **§2.4**). **Admin hub:** extend existing **Activities → Events → Resources** page (`/admin/events/resources`).

**Plan detail:** [planlog.md — Phase 21](./planlog.md#phase-21-asset--resource-management). Schema flags: migration **`183_resources_asset_and_scheduling.sql`** (`is_schedulable_calendar`, `is_schedulable_tasks`).

#### 2.1 Picker UI (events + tasks) — sectional like Directory participants

- [x] **Grouped dropdown** (same pattern as `DirectoryParticipantPicker` / `AutoSuggestMulti` **groups**): **first section header — Bundles**; **second section header — Resources** (individual items).
- [x] **Composite IDs** in picker: e.g. `bundle:<bundle_id>` vs `resource:<resource_id>` so selection handlers can expand **Bundles** vs add a single resource.
- [x] **Resource types:** **Customizer** labels via **`GET /api/settings/calendar/resource-types`** + **`resource-picker-groups.ts`** (`buildResourceAutoSuggestGroups`); event/task pickers + events filter resource list show **label**, fallback **slug**.
- **MVP if time permits — event picker proactive hints** (**ghost/overlap** + **busy exclusive**): not sessionlog checkboxes; track in [planlog — Event resource picker — MVP if time permits](./planlog.md#event-resource-picker--mvp-if-time-permits) (with **§2.5** save-time conflicts + [event-resource-conflicts.md](./reference/event-resource-conflicts.md)).

#### 2.2 Bundles (virtual collections) — expand to junction rows; editable snapshot

- [x] **Terminology:** Product/UI name = **Bundle**; schema tables = **`resource_bundles`**, **`resource_bundle_items`** (`bundle_id`, `resource_id`, optional `sort_order`). Same **`resource_id`** may appear in **multiple** bundle definitions. *(Live after migration **195** applied in SQL Editor.)*
- [x] **Apply bundle** on event/task: picker expands to **one `bundle_instance_id` per apply**; each member → **`event_resources`** / **`task_resources`** (dedupe by `resource_id` in draft). **No retroactive change** when bundle definition edits later (snapshot for that booking).
- [x] **Rolled-up UI:** **`ResourceAssignmentsRollupList`** — one collapsible block per **`bundle_instance_id`** (title = bundle name when **`source_bundle_id`** on draft rows, else **Bundle**); expand → member list with **remove**; **Remove bundle** clears instance; singles listed separately. **Events:** form tab **Assigned** panel; **tasks:** bento + modify modal.
- [x] **Parity:** same rollup + picker behavior on **event** and **task** surfaces.

#### 2.3 Master table — who appears in pickers (path to full asset manager)

- [x] **Use migration 183:** **`is_schedulable_calendar`** → event pickers; **`is_schedulable_tasks`** → task pickers (plus `archived_at` / `asset_status` as needed). Server: **`resourcePassesPickerContext`** in **`participants-resources.ts`**; **task** = calendar-on **or** task-on.
- [x] **Non-bookable rows** (e.g. office products): **both false** where appropriate; still manageable on **Resource management** admin page (full **`GET /api/events/resources`** without `context`).
- [x] **APIs:** **`GET /api/events/resources`** and **`GET /api/events/bundles`** — query **`context=calendar|task`** for picker lists; omit for full registry. Clients: **`EventParticipantsResourcesTab`**, **`EventsFilterBar`**, **`TaskResourcesSection`** (dual fetch: full + `task` for picker).
- [x] **Manual QA:** Archiving a registry row hides it from calendar/task pickers (and event resource filter); full list still on Resource manager without `context`.
- [x] **Follow-on:** **`get_resources_dynamic`** + app reads aligned with **`GET /api/events/resources`** + **`?context=calendar|task`** (migration **196** applied in SQL Editor — optional `picker_context`; **`getResources()`** uses **`getResourcesAdmin()`** tenant table read). **Refs:** `196_get_resources_dynamic_picker_alignment.sql`, `participants-resources.ts`, task **`GET /api/tasks/[id]/resources`** enrichment.

**Next (Resources MVP):** **§3** messaging — or close Resources MVP slice. **MVP-if-time picker UX:** [planlog — Event resource picker](./planlog.md#event-resource-picker--mvp-if-time-permits). **Refs:** [event-resource-conflicts.md](./reference/event-resource-conflicts.md), [resource-time-attribution.md](./reference/resource-time-attribution.md).

#### 2.4 Time attribution to resources (usage / “most used”)

- [x] **Events (documented MVP):** **Analytics** / **`computeResourceUsageAnalytics`** — expanded occurrences in range; duration **(end − start)** per occurrence; **equal split** across master **`event_resources`**; float minutes, **2 dp** in API/UI. Not a full “validate every future recurrence instance” product rule in one pass — see [resource-time-attribution.md](./reference/resource-time-attribution.md).
- [x] **Tasks (documented MVP):** **Analytics** — **`task_time_logs`** in date range summed per task ÷ **current** **`task_resources`** (not per-log historical snapshot). **Deferred:** completion-only snapshot or persisted **`resource_usage_*`** — [planlog Phase 21](./planlog.md#phase-21-asset--resource-management).
- [x] **Admin usage preview (dynamic):** Resource manager **Analytics** tab + **`GET /api/events/resources/usage`** — top resources, date range, type/resource filters; methodology string in UI. **Optional later:** persist **`resource_usage_*`** for audited rollups (planlog Phase 21 follow-on).

#### 2.5 Event booking — availability + conflict check

- [x] **Keep** **`events` + `event_resources`** as booking source of truth (no separate booking table required for MVP).
- [x] **Save-time conflict check** for overlapping **exclusive** resources (`resources.is_exclusive !== false`): extended **`POST /api/events/check-conflicts`** with **`resource_ids`** + **`resource_conflicts`**; event form **Scheduling conflict** dialog lists **which resource** conflicts with **which other event** and **when**; **`getResourceConflicts`** in **`events.ts`** (same recurrence/occurrence pattern as participants). **Server:** **`PUT` / `POST`** **`/api/events/[id]/resources`** return **409** + **`resource_conflicts`**. **User-facing detail + API shape:** [event-resource-conflicts.md](./reference/event-resource-conflicts.md).

#### 2.6 Admin — Resource management page

- [x] **`/admin/events/resources`** — **Resource manager**: **Resources** tab (registry CRUD + **183** flags, types, archive) + **Bundles** tab (definitions + items). APIs: **`/api/events/bundles`** (+ `[id]`, `[id]/items`); registry list via **`getResourcesAdmin`**.
- [x] **Sidebar/copy:** **Activities → Resources** — optional **`description`** tooltip on sidebar item (`sidebar-config.ts`); page intro clarifies registry vs pickers, bundles, Analytics, inventory fields, sidebar location.

#### 2.7 Task UI — Resources bento

- [x] **`task_resources`** migration (**`195`**) **applied** + **`participants-resources.ts`** helpers + **`GET/POST/PUT/DELETE /api/tasks/[id]/resources`** + **`TaskResourcesSection`** on task detail/edit — grouped picker + §2.2 rollup.
- [x] **Bundle definitions CRUD:** **Resource manager** only (`/admin/events/resources` → **Bundles**). No separate bundle-definition REST on task routes for MVP (optional later if product wants).

**Defer (post-MVP):** Full usage analytics UI, project rollups, nested bundles, optional unified booking view.

**Quick refs:** [event-resource-conflicts.md](./reference/event-resource-conflicts.md); [resource-time-attribution.md](./reference/resource-time-attribution.md); `src/app/admin/settings/resources/ResourcesSettingsClient.tsx` (resource types); `GET /api/settings/calendar/resource-types`; `/api/events/resources` (+ **`?context=calendar|task`** for pickers); `POST /api/events/check-conflicts` (**`resource_ids`**, **`resource_conflicts`**); `src/lib/supabase/events.ts` (`getResourceConflicts`); `src/lib/resources/resource-usage-analytics.ts`; `src/lib/supabase/participants-resources.ts` (`resourcePassesPickerContext`, `getEventsResourceAssignments`); `src/lib/events/resource-picker-groups.ts`; `src/components/events/ResourceAssignmentsRollupList.tsx`; `src/components/dashboard/sidebar-config.ts` (**Activities** / **Resources** tooltip); `src/components/pickers/DirectoryParticipantPicker.tsx` (grouped picker pattern).

---

### 3. Messaging & notifications (MVP) — admin awareness + GPUM support

Goal: **Tenant admins** get a reliable **notifications / activity** picture; **GPUMs** get **support-style messaging**. **Former contact notes** and new writes of migrated types go to **`contact_notifications_timeline`** and **`conversation_threads` / `thread_messages`**; **`crm_notes`** deprecated for those types after cutover + backfill.

- [ ] **Wiring source of truth:** Track implementation and checkoffs in [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md) (store mapping + API/UI wiring).
- [ ] **Spec source of truth:** Keep model/rules aligned with [prd-technical §18C](./prd-technical.md#phase-18c-directory-and-messaging) (enums, visibility, participants, cutover).
- [ ] **MVP gate:** For migrated kinds, no new writes to **`crm_notes`**; writes must land in timeline/threads.
- [ ] **Merged read API:** Single stream (timeline ∪ threads), sort, **cursor**, **visibility** so GPUM never sees `admin_only` timeline rows (enforce in API per [prd-technical §18C](./prd-technical.md#phase-18c-directory-and-messaging)).
- [ ] **Triggers:** Timeline rows for MVP-critical events (forms, orders, task/project assign, MAG, etc. — define minimal set and implement).
- [ ] **Event reminders — cron & multi-channel delivery:** Enable **scheduled sends** via cron (**`/api/cron/event-reminders`**, **`CRON_SECRET`**, **`vercel.json`** crons, env docs) per [planlog Phase 20](./planlog.md#phase-20-calendar--reminders--personal-ics-feeds). **Channels to support:** **email**, **browser** (web push), **in-app** (PWA), **SMS** when an SMS provider is connected — align with per-user prefs, dedupe, and persistence (**`event_reminder_deliveries`** / schema in Phase 20).
- [ ] **Blog comments:** **Threads** only (`thread_type = blog_comment`); already wired — verify moderation + public/admin paths ([wiring doc](./reference/messages-and-notifications-wiring.md)).
- [ ] **Product comments:** Allow commenting on products (same moderation/approval model as posts where applicable).
- [ ] **Comments — approval / moderation (posts + products):** Decide **workflow** (e.g. pending → approved / rejected / spam), **roles** (who may approve), and **public vs admin** visibility while pending; implement consistently for **blog** and **product** comment threads.
- [ ] **Admin — Comments management (Content):** New **Content** top-level admin route (e.g. **`/admin/content/comments`**) — unified queue or tabs for **post** and **product** comments (list, filter, approve/reject). **Gate with admin/content roles** so moderation is not exposed on GPUM-only surfaces; link from Content nav when shipped.
- [ ] **Task comments:** **`conversation_threads`** / `thread_messages` per task (not `crm_notes` + `conversation_uid` for new work).
- [ ] **Support conversation:** GPUM ↔ tenant admin thread model (participants, thread_type); UI entry points on both sides.
- [ ] **UI:** **Messages and notifications** tab/surface (admin + GPUM), filters, thread drill-in; contact detail timeline merge/filters as needed.
- [ ] **Cutover:** Stop new **`crm_notes`** writes for migrated kinds; **backfill** historical notes → timeline and/or threads; document deprecation in [prd-technical](./prd-technical.md).

**Plan detail:** [planlog.md — Phase 18C](./planlog.md#phase-18c-directory-unified-picker--messages--notifications). **Wiring checklist:** [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md).

---

### 4. Auth — shared identity UX (forks)

Goal: Users understand **one Auth account** can apply across forks **without** weakening security (no enumeration on cold pages).

- [ ] **Cold pages:** `/login`, `/register`, forgot-password — short, generic copy per [prd.md — Shared identity UX](./prd.md#shared-identity-ux-forks).
- [ ] **Transactional email:** Signup/welcome, reset — PHP-Auth / shared-account wording where helpful; no tenant directory in email.
- [ ] **Signed-in help:** `/members/account`, Security, admin profile — fuller scope explanation.
- [ ] **Profile labels:** Global vs **this site only** where relevant.

**Plan detail:** [planlog.md — Phase 00](./planlog.md#phase-00-supabase-auth-integration) (Shared identity UX bullets).

---

### 5. Pre-fork: review, security, finalization

Goal: Safe to **deploy new forks** from the template. **Public site** stays reliable during ongoing CMS work — know which code can affect visitors vs admin-only surfaces.

**Align [mvt.md](./mvt.md) with template MVP (fork-ready)**

The MVT doc is the **deployment + integration contract**: module map, **fork/donor** workflow, and **shared-critical** paths. Before calling the template MVP fork-ready, bring it in line with the **current** app (this checklist + edits to `mvt.md` as needed).

- [ ] **Fork deployment section:** [mvt.md — Fork deployment & donor integration](./mvt.md#fork-deployment--donor-integration) is present and accurate; template uses placeholders where no client exists; **site record table** fields understood for client forks.
- [ ] **Module surface tier table:** [mvt.md — Module surface tier](./mvt.md#module-surface-tier-public-vs-admin) matches how this repo actually splits **public vs admin vs shared**; update rows if a module’s surface changed.
- [ ] **Shared-critical paths table:** Matches `middleware`, layouts, Supabase client, `site-mode`, global styles — add/remove rows if code moved.
- [ ] **Code sitemap / per-module sections:** High-traffic paths (API routes, new modules) reflected in [mvt.md](./mvt.md) **At a glance** and **Code sitemap** so donor porting and upgrades stay oriented.
- [ ] **Donor workflow documented:** `docs/donor-code/` purpose (reference-only until ported to `src/`) is clear in MVT; client forks fill **Donor design path** + **porting checklist** when applicable.

**Public vs admin — module boundaries (WordPress-style split)**

- [ ] **Module classification in [mvt.md](./mvt.md):** Use the **Module surface tier** table; extend or add footnotes if a module needs nuance beyond a single tier.
- [ ] **Dependency boundary audit:** Public routes under `src/app/(public)/` must **not** import admin-only code (`src/app/admin/*`, admin-only components, admin-only lib barrels). Fix or document any accidental cross-imports.
- [ ] **Shared-critical inventory:** List (in `mvt.md` or a short `docs/reference/` note) files/paths where a change can break **both** sides; require stricter review and public smoke tests when touched.
- [ ] **Pre-merge guardrails:** PRs that touch **Shared-critical** paths get extra review + minimal **public** smoke check before merge to production.
- [ ] **Route / API ownership:** Know which `src/app/api/*` routes serve **public** vs **admin/member** flows; keep boundaries documented next to [mvt.md](./mvt.md) code sitemap (extend table if needed).
- [ ] **Build / release policy:** Do **not** deploy commits that fail `pnpm run build`; do heavy CMS work on branches + preview deploys until green — public uptime depends on a passing build for this single-app model.
- [ ] **Public uptime smoke suite:** Before each production release, run a minimal check (e.g. `/`, key pages, blog post, form submit, media/gallery as applicable). Adjust list per tenant.
- [ ] **Fork readiness:** Each new fork gets the same **boundary + smoke** expectations; align with [tenant-site-setup-checklist.md](./tenant-site-setup-checklist.md) where applicable.

**Security, review, ops**

- [ ] **Code review pass:** High-risk paths (auth, CRM, tasks, messaging APIs, RLS assumptions).
- [ ] **Security:** Input validation, RLS vs API enforcement (esp. GPUM + timeline visibility), secrets, admin/member boundaries.
- [ ] **Performance spot-check:** No regressions on hot paths; see [planlog — Performance & Caching](./planlog.md#performance--caching-load-times) if needed.
- [ ] **Fork checklist:** Env vars, migrations run order, superadmin, smoke test ([planlog Phase 00](./planlog.md#phase-00-supabase-auth-integration) — setup script / template deployment when applicable).

**Plan detail:** [planlog.md — Code Review](./planlog.md#code-review-security--modular-alignment) & **Performance & Caching**.

---

## Post-MVP (do not block fork MVP)

All **future** work lives in [planlog.md](./planlog.md): Phase **20** (calendar reminders / ICS), Phase **21** follow-on (full asset manager, usage APIs), Phase **22** (accounting), site analytics, shortcode/library extras, banners/carousel, RAG, etc.

---

## Reference

| Topic | Where |
|--------|--------|
| Directory & messaging spec | [prd-technical § Phase 18C](./prd-technical.md#phase-18c-directory-and-messaging) |
| Messages vs notifications wiring | [reference/messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md) |
| Tasks Customizer / slugs | Migration **187**; [changelog](./changelog.md) |
| Resources schema | Migration **183** |
| Event exclusive-resource conflicts (UX + API) | [reference/event-resource-conflicts.md](./reference/event-resource-conflicts.md) |
| Resource time attribution (Analytics / usage API) | [reference/resource-time-attribution.md](./reference/resource-time-attribution.md) |
| Public vs admin module map | [mvt.md](./mvt.md) — tag modules **Public-critical** / **Admin-only** / **Shared-critical** |
| Tenant fork setup | [tenant-site-setup-checklist.md](./tenant-site-setup-checklist.md) |
