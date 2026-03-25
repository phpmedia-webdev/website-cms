# Changelog

All notable changes to this project will be documented in this file.

**When adding an entry:** Use the developer’s session-start date if announced in the conversation; otherwise run `powershell -Command "Get-Date -Format 'yyyy-MM-dd HH:mm CT'"` and use that. Do not use user_info or other context for the date.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For planned work and backlog items, see [planlog.md](./planlog.md). For **open** MVP items (fork-ready handoff), see [sessionlog.md](./sessionlog.md); completed work is checkmarked in planlog and recorded here.

## [Unreleased]

### 2026-03-25 11:14 CT — Session wrap: project detail polish, planned time migrations, git push policy

- **Context for Next Session:** **Manual SQL** — run **`201_tasks_projects_planned_time_transition.sql`** then **`202_rpc_planned_time_column.sql`** on each tenant schema (order matters); remove those lines from [sessionlog.md](./sessionlog.md) when applied everywhere. **Test:** Project **detail** — overview hero, date/progress metrics, client/team bento row, six tabs (Message Center + Deliverables placeholders). **Task** detail/edit — planned vs logged time labels; resources read-only if that shipped here. **All Tasks** / project APIs — `planned_time` fields after DB migration. **Git:** Pre-push build hook **removed**; `pnpm run setup-git-hooks` only deletes a legacy `.git/hooks/pre-push`. Pushes do not run `pnpm run build` locally unless you choose to. See `.cursor/rules/sessions.mdc` + `coding.mdc`. **Next:** Attachments / Message Center / Deliverables wiring; naming sweep Estimated→Planned; optional `proposed_time` removal migration.
- **Completed:**
  - **Project detail (`ProjectDetailClient.tsx`):** Overview metrics row — Start · Due · **Progress** (task completion % + compact bar, `completed` slug) · Completed; removed duplicate long task-progress bar under profitability block; **Client & team** single bento card (25%/75%, vertical divider, avatar columns, team `justify-start`); tabs reordered — **Message Center** (placeholder), Tasks, Events, Transactions, Attachments, **Deliverables** (placeholder); default tab Message Center.
  - **Planned time (app + SQL):** Migrations **`201_tasks_projects_planned_time_transition.sql`**, **`202_rpc_planned_time_column.sql`** — `planned_time` on tasks/projects, RPC alignment; related updates across **`projects.ts`**, project/task API routes, project new/edit/detail flows, **AllTasksListClient**, **TaskTimeLogsSection**, **TaskResourcesSection** / read-only detail, **globals.css** task-bento tweaks, related pages (**`page.tsx`**, task edit/new clients) as in working tree.
  - **Git / rules:** Deleted **`scripts/git-hooks/pre-push`**; **`scripts/setup-git-hooks.cjs`** removes legacy pre-push only; **`scripts/git-hooks/README.md`**. **`.cursor/rules/sessions.mdc`** — session end: commit+push without mandatory local production build; **`.cursor/rules/coding.mdc`** — Git push policy for assistants.
  - **Docs:** [sessionlog.md](./sessionlog.md) Manual SQL list (**201** + **202**); [planlog.md](./planlog.md) Phase 19 project detail tabs line.

### 2026-03-24 22:07 CT — Ops note: stuck `preferences/route.ts` on Windows (EPERM)

- **Note (no code change):** On one dev machine, `src/app/api/settings/notifications/preferences/route.ts` could not be read or deleted from normal Windows (including `EPERM` during `next build` / pre-push). **Safe Mode** + **Command Prompt** was required to remove the file; then restore with `git checkout HEAD -- src/app/api/settings/notifications/preferences/route.ts` and run `pnpm run build` before push. If builds fail on a single route file with `EPERM`, check ACLs, Controlled Folder Access, and AV locks—not application logic.

### 2026-03-24 16:29 CT — Project detail & edit: client/team layout, mandatory client, detail cleanup

- **Context for Next Session:** **Manual SQL** unchanged — still run outstanding migrations listed in [sessionlog.md](./sessionlog.md) (**200**, **198**, **197**, **199** if any env behind). **Test:** Admin project **detail** — Client | Team column layout, **Manage members** link, pills, no taxonomy block; **edit** — cannot save without client; **Set client** + **Add member** (team/contact). **New project** can still be created without client; first **edit** save enforces client. **Next:** Attachments tab (sessionlog §1); Accounting module notes in sessionlog; optional **new project** flow to require or prompt for client.
- **Completed:**
  - **`ProjectEditClient.tsx`:** **Client & members** — 25% / 75% grid; **Set client** dialog (contact or organization; org optional bulk-add contacts); **Add member** limited to **team** + **CRM contact**; **Save** blocked until `contact_id` or `client_organization_id` is set; removed standalone **Clear client**; primary contact excluded from “additional members” list when client is a contact.
  - **`ProjectDetailClient.tsx` + `[id]/page.tsx`:** **Client | Team** header (**Client** / **Team** labels + **Manage members**); borderless two-column content; large client initials circle + truncated name + Contact/Organization hint; team uses existing **pill** styling; `clientDisplayName` resolved on server; primary contact hidden from team column when client is contact; removed **Utilization** overview stat; removed **Categories & tags** from detail (chips + assignment card) and dropped `getTaxonomyTermsForContentDisplay` for this page; earlier layout items retained (e.g. Type **TermBadge**, team block under description).
  - **`page.tsx` (detail):** Restored `getOrganizationById` / `getContactById` for client label only where needed.
  - **Docs:** [planlog.md](./planlog.md) Phase 19 (project UI members/client/edit bullets), [mvt.md](./mvt.md) projects tree line.

### 2026-03-24 13:19 CT — Projects schema: `start_date`, `due_date`, `completed_date` (migration 199)

- **Context for Next Session:** **Manual SQL — you need to run:** `supabase/migrations/199_projects_start_due_completed_dates.sql` in Supabase SQL Editor (per tenant schema; replace `website_cms_template_dev` if needed). Until applied, `listProjects` / `getProjectById` RPC shape and inserts/updates expect the **new** column names and will fail against old DBs. Remove the **199** line from [sessionlog.md](./sessionlog.md) when done on all envs.
- **Completed:**
  - **DB (`199_projects_start_due_completed_dates.sql`):** Rename `projects.proposed_start_date` → `start_date`, `proposed_end_date` → `due_date`; add nullable `completed_date`; replace partial indexes; `get_projects_dynamic` / `get_project_by_id_dynamic` return `start_date`, `due_date`, `completed_date`.
  - **App:** `Project` / insert / update / `createProject` / `updateProject` / task auto-extend uses `due_date`; REST `POST/PUT` bodies use `start_date`, `due_date`, `completed_date`; admin new/edit/detail + projects list row field `dueDate`; preset copy references due date.
  - **Docs:** [planlog.md](./planlog.md) Phase 19 schema bullets, [sessionlog.md](./sessionlog.md) Manual SQL outstanding.

### 2026-03-23 22:50 CT — Session wrap: project detail layout; All Tasks §1.1–1.3 + RPC presets; projects list

- **Context for Next Session:** **Manual SQL:** Run **`197_get_tasks_dynamic_exclude_archived_projects.sql`** and **`198_get_tasks_dynamic_preset_filters.sql`** in Supabase SQL Editor if any fork/env is missing them; then clear/update the outstanding line in [sessionlog.md](./sessionlog.md) (§1.3 / Manual SQL). **QA:** Sessionlog §1.3 preset + reset behaviors with real data. **Next product:** Wire **Attachments** on project detail (currently placeholder); §3 messaging / planlog picker MVP-if-time. **Key files:** `ProjectDetailClient.tsx`, `AllTasksListClient.tsx`, `all-tasks-sort.ts`, `admin-task-list.ts`, `api/tasks/route.ts`, `ProjectListTable.tsx`, `supabase/migrations/197_*.sql`, `198_*.sql`.
- **Completed:**
  - **Admin project detail (`ProjectDetailClient.tsx`):** Donor-style layout reimplemented under `src/` (no donor imports): `max-w-6xl` overview — id snippet, status/type badges, client, description, 4-card stats (type/start/end/est.), logged time + utilization, task progress bar + `ProjectProgressSegments`, team chips, footer (time bar, potential sales, MAG); breadcrumb **Activities / Projects / Project detail**; disabled **Share** / **More** placeholders; **Radix Tabs**: Tasks, Events, Transactions, **Attachments** (empty-state copy for later wiring); taxonomy assignment card kept below overview; existing task/event/transaction data paths unchanged.
  - **All Tasks (`AllTasksListClient`, `tasks/page.tsx`, `GET /api/tasks`, `admin-task-list.ts`, `all-tasks-sort.ts`):** §1.1 unified **Custom filters** modal + single-row toolbar (funnel state, title search does not light funnel); §1.2 sortable column headers + **Project** grouped sort; §1.3 presets **All Active** (SSR `exclude_status_slugs`), **My tasks**, **Overdue** (`due_before`) + master reset; **`get_tasks_dynamic`** — migration **197** (exclude tasks in archived projects), **198** (`exclude_status_slugs`, `due_before`).
  - **Projects list (`ProjectsListClient`, `ProjectListTable`, `ProjectProgressSegments`):** Toolbar/table aligned with All Tasks styling; column order and widths; title truncate; centered type/status; progress segments.
  - **Docs / rules:** `sessionlog.md`, `planlog.md`, `mvt.md` synced; `.cursor/rules` (coding, sessions, supabase) updates bundled with this commit where modified.

### 2026-03-23 17:48 CT — Calendar hover tooltips (time, location, resources on admin)

- **Context for Next Session:** Admin **Calendar Events** and **public** events page use **native browser `title` tooltips** on all views (month, week, day, agenda + month popup). Admin tooltips include **assigned resource names** from **`GET /api/events/assignments`** (`resourceNamesByEvent`). **Next:** §3 messaging or planlog picker MVP-if-time. **Key files:** `EventsCalendar.tsx`, `AgendaWithDescription.tsx`, `EventsPageClient.tsx`, `PublicCalendarPageClient.tsx`, `api/events/assignments/route.ts`, `lib/events/calendar-event-hover.ts`.
- **Completed:**
  - **`GET /api/events/assignments`:** Response adds **`resourceNamesByEvent`** (sorted labels; uses **`getResourcesAdmin`** for ids in range).
  - **`buildCalendarEventHoverText`:** Shared formatter; **` · `**-joined single line (Windows `title` often drops lines after `\n`).
  - **`EventsCalendar`:** `eventHoverDetailByEventId` prop, **`hoverDetail`** on **`RBCEvent`**, **`tooltipAccessor`** → RBC **`EventCell`** `.rbc-event-content` `title` (fixes month/week/day only showing event title; `eventPropGetter.title` is ignored by RBC).
  - **Agenda:** **`title` on `<tr>`** + event component `title` (forked agenda path).
  - **Admin:** Always fetch assignments when events loaded (powers filters + tooltips). **Public:** hover uses same formatter without resources (no private assignment API).
  - **`mvt.md`:** Calendar hover note under Events.

### 2026-03-23 17:20 CT — §2.3: align resource catalog with REST picker rules (196 + getResources)

- **Context for Next Session:** Resources **§2.3** follow-on **done**; migration **196** **applied on tenant** (SQL Editor). **Next:** **§3** messaging or planlog picker MVP-if-time. **Key files:** `196_get_resources_dynamic_picker_alignment.sql`, `participants-resources.ts`, `api/tasks/[id]/resources/route.ts`, `sessionlog.md` §2.3, `mvt.md`. **Other forks:** run **196** when not yet applied.
- **Completed:**
  - **`getResources()`:** Uses **`getResourcesAdmin()`** (tenant table) instead of unfiltered **`get_resources_dynamic`** RPC — same columns as Resource manager / REST registry.
  - **Migration 196:** **`get_resources_dynamic(schema_name, picker_context)`** — `NULL` = full registry; **`calendar`** \| **`task`** = filters aligned with app (`archived_at`, not **retired**, schedulability flags). **Applied on tenant** (confirm other envs as needed).
  - **Task resources GET:** Enrichment catalog via **`getResourcesAdmin()`**.
  - **Docs:** `sessionlog.md` §2.3 checked; `planlog.md` Phase 21 API bullet; `mvt.md` migrations + RPC note.

### 2026-03-23 17:05 CT — Docs: event picker ghost + busy hints → planlog MVP-if-time

- **Context for Next Session:** **§2.1** shipped picker items stay checked; **ghost/overlap** + **busy exclusive** proactive hints live under **planlog** [Event resource picker — MVP if time permits](./planlog.md#event-resource-picker--mvp-if-time-permits) for fork MVP when time allows. **Next:** **§2.3** `get_resources_dynamic` follow-on, **§3** messaging, or picker UX from planlog. **Key files:** `docs/planlog.md`, `docs/sessionlog.md` §2.1/Next, `docs/reference/event-resource-conflicts.md`.
- **Completed:**
  - **`planlog.md`:** New **### Event resource picker — MVP if time permits** (two checkboxes); MVP table row **2. Resources** links it; Phase **21** points there (removed duplicate busy-only bullet).
  - **`sessionlog.md`:** §2.1 ghost checkbox removed; MVP-if-time pointer + **Next (Resources MVP)** updated.
  - **`event-resource-conflicts.md`:** Deferred note covers both hints + planlog anchor.

### 2026-03-23 16:49 CT — §2.4 + §2.6: time-attribution doc, Resources sidebar tooltip, copy

- **Context for Next Session:** Resources **§2.4** / **§2.6** checklist items closed with **docs + UX**. **Next:** **§2.1** ghost picker, **§2.3** RPC follow-on, or **§3** messaging. **Key files:** `docs/reference/resource-time-attribution.md`, `sidebar-config.ts`, `Sidebar.tsx`, `events/resources/page.tsx`, `sessionlog.md` §2.
- **Completed:**
  - **`resource-time-attribution.md`:** Events (expanded occurrences, equal split, rounding) + tasks (logs in range ÷ current assignments); deferred snapshot / persisted usage.
  - **Sidebar:** **`SubNavItem.description`**; **Activities → Resources** tooltip; effective links use `title={description}`.
  - **Resource manager page:** Intro copy (registry, pickers, bundles, Analytics, Activities location).
  - **Docs:** `sessionlog.md` §2.4/2.6, `planlog.md`, `mvt.md`.

### 2026-03-23 16:39 CT — Docs: event resource conflicts reference; defer picker busy state

- **Context for Next Session:** **§2.5** conflict behavior is documented in **`docs/reference/event-resource-conflicts.md`**. **Picker busy/dim** for exclusives → **planlog** Phase 21 follow-on (removed from **sessionlog** §2.5). **Next:** **§2.4** / **§2.6** / **§3** per sessionlog.
- **Completed:**
  - **`event-resource-conflicts.md`:** When checks run, dialog vs **409** payload, exclusive vs non-exclusive, recurrence, related files; deferred picker note.
  - **`sessionlog.md`:** §2.5 enriched + link to reference; optional picker bullet removed; **Next** + Reference table + quick refs.
  - **`planlog.md`:** New **Follow-on — event resource picker busy state**; UI picker bullet disambiguated (§2.1 ghost vs busy exclusive).

### 2026-03-23 16:28 CT — §2.5 exclusive resource overlap / conflict check (events)

- **Context for Next Session:** **§2.5** save-time + API enforcement for **exclusive** **`resources`** is done. **Next:** **§2.4** attribution notes, **§2.6** sidebar copy, or **§3** messaging backlog. **Key files:** `events.ts` (`getResourceConflicts`), `check-conflicts/route.ts`, `EventFormClient.tsx`, `api/events/[id]/resources/route.ts`. **Docs:** see **2026-03-23 16:39 CT** — [event-resource-conflicts.md](./reference/event-resource-conflicts.md).
- **Completed:**
  - **`getResourceConflicts`:** Overlap with expanded calendar events; **`is_exclusive !== false`** only; uses **`getEventsResourceAssignments`** + **`getResourcesAdmin`**.
  - **`POST /api/events/check-conflicts`:** Optional **`resource_ids`**; response **`resource_conflicts`** (parallel to participant **`conflicts`**).
  - **`EventFormClient`:** Runs check when there are resource assignments and/or participants; **Scheduling conflict** dialog lists both.
  - **`PUT` / `POST` `/api/events/[id]/resources`:** **409** + **`resource_conflicts`** body on exclusive double-book.
  - **Docs:** `sessionlog.md` §2.5, `planlog.md` Phase 21 API bullet.

### 2026-03-23 16:14 CT — §2.2 bundle rollup list (events + tasks)

- **Context for Next Session:** **§2.2** rolled-up **Assigned** UI is in place. **Next:** **§2.5** availability + conflict check on save (and optional picker ghost), or **§2.4** attribution documentation. **Key files:** `ResourceAssignmentsRollupList.tsx`, `EventParticipantsResourcesTab.tsx`, `TaskResourcesSection.tsx`, `task-resources-api.ts` (draft `source_bundle_id`).
- **Completed:**
  - **`ResourceAssignmentsRollupList`:** One collapsible group per **`bundle_instance_id`**; **Remove bundle** / per-resource remove; singles as flat rows; **`variant="compact"`** for task tile.
  - **Draft field `source_bundle_id`:** Set when applying a bundle from picker (client-only label → bundle definition name); PUT routes unchanged (strip extra keys).
  - **Events:** **Assigned** panel under resource picker on participants/resources tab.
  - **Tasks:** Bento + **Modify resources** modal use the same rollup + grouped picker.
  - **Docs:** `sessionlog.md` §2.2, `planlog.md`, `mvt.md`.

### 2026-03-23 16:03 CT — §2.1 resource picker: Customizer type labels (shared helper)

- **Context for Next Session:** **§2.1** core items done (groups, composite ids, Customizer labels). **Optional:** §2.1 ghost/unavailable in event picker when start/end known (**§2.5**). **Next:** **§2.2** — rolled-up **`bundle_instance_id`** rows (collapse/expand), parity event vs task. **Key files:** `resource-picker-groups.ts`, `EventParticipantsResourcesTab.tsx`, `TaskResourcesSection.tsx`, `EventsFilterBar.tsx`.
- **Completed:**
  - **`src/lib/events/resource-picker-groups.ts`:** `buildResourceAutoSuggestGroups`, `parseCalendarResourceTypesPayload`, `resourceTypeLabelMap` — picker option labels use **Customizer** `resource_type` **label**, search matches slug + label.
  - **Event / task resource pickers** + **events filter** modal: parallel fetch **`GET /api/settings/calendar/resource-types`**.
  - **Docs:** `sessionlog.md` §2.1 (checked), §2.7 copy; **`mvt.md`** Events lib path.

### 2026-03-23 15:54 CT — §2.3 picker eligibility verified; next = §2.1 grouped picker

- **Context for Next Session:** **§2.3** (183 + archive/retired + `?context=calendar|task`) is **done and manually verified** (archived row hidden in pickers). **Next Resources MVP slice:** **§2.1** — grouped **Bundles** / **Resources** picker (`AutoSuggestMulti` groups), **`bundle:<id>`** / **`resource:<id>`** composite IDs; then **§2.2** bundle apply + rolled-up **`bundle_instance_id`** UX. **Key files:** `EventParticipantsResourcesTab.tsx`, `TaskResourcesSection.tsx`, `DirectoryParticipantPicker.tsx` (pattern), `participants-resources.ts`.
- **Completed:**
  - **Manual QA:** Archive on **`resources`** → row no longer appears in event/task resource pickers (expected **`archived_at`** filter via picker APIs).
  - **Docs:** `sessionlog.md` §2.3 QA bullet + **Next** pointer to §2.1 / §2.2.

### 2026-03-23 12:15 CT — Resource manager Analytics tab + dynamic usage API

- **Context for Next Session:** Tune copy/UX on **Analytics** (date semantics UTC vs local if needed); add charts or CSV export if desired; **picker** work for events/tasks remains. **Key files:** `resource-usage-analytics.ts`, `/api/events/resources/usage`, `ResourceUsageAnalyticsTab.tsx`.
- **Completed:**
  - **`computeResourceUsageAnalytics`:** Events via **`getEvents`** (recurrence expanded) × duration ÷ **`event_resources`** count; tasks via **`task_time_logs`** (`log_date` in range) ÷ **`task_resources`** count; merge + sort + methodology string.
  - **`GET /api/events/resources/usage`:** Query `from`, `to` (YYYY-MM-DD), optional `resource_type`, `resource_id`, `limit` (admin).
  - **`ResourceUsageAnalyticsTab`:** Filters + **Run report** + table (events / tasks / total minutes); warning if task logs unavailable.
  - **`ResourceManagerClient`:** Third tab **Analytics**.
  - **Docs:** `mvt.md`, `planlog.md`, `sessionlog.md` §2.4 usage bullet.

### 2026-03-23 11:57 CT — Resource manager: registry + bundles UI, getResourcesAdmin, bundle APIs

- **Context for Next Session:** **Grouped picker** on events/tasks (Bundles then Resources) + optional **`bundle_instance_id`** on assign; filter registry by **183** flags in picker API if needed. **Key files:** `ResourceManagerClient`, `ResourcesRegistryTab`, `BundlesTab`, `participants-resources.ts` (bundles + `getResourcesAdmin`), `/api/events/bundles/**`.
- **Completed:**
  - **`getResourcesAdmin`:** Reads **`resources`** with **183** columns for admin/API list; **`GET /api/events/resources`** returns full rows; **`GET/PUT …/resources/[id]`** use same.
  - **Registry UI:** Table columns **Calendar / Tasks / Status / Archived**; create/edit dialog for **scheduling flags**, **asset status**, **archived** (edit).
  - **Bundle REST:** `GET/POST /api/events/bundles`, `GET/PUT/DELETE /api/events/bundles/[id]`, `POST/DELETE …/items` — lib: **`listResourceBundlesWithItems`**, **`createResourceBundle`**, **`updateResourceBundle`**, **`deleteResourceBundle`**, **`addResourceBundleItem`**, **`removeResourceBundleItem`**.
  - **`ResourceManagerClient`:** Tabs **Resources** | **Bundles**; shared registry state for bundle member picker; **`ResourcesListClient`** re-exports from `resource-manager/`.
  - **Docs:** planlog Phase 21 (bundle API + admin UI checked), sessionlog §2.6, mvt.

### 2026-03-23 11:42 CT — Task resources REST + bento shell (no picker yet)

- **Context for Next Session:** **Grouped Bundles + Resources picker** on task/event surfaces; **`POST`** may pass **`bundle_instance_id`** when applying a bundle; **bundle CRUD** REST for **`/admin/events/resources`** if desired before picker. **Key files:** `src/app/api/tasks/[id]/resources/route.ts`, `TaskResourcesSection.tsx`, `task-resources-api.ts`, `participants-resources.ts`, [sessionlog §2](./sessionlog.md).
- **Completed:**
  - **`GET/POST/DELETE /api/tasks/[id]/resources`** — admin gate (same pattern as **`/api/tasks/[id]/followers`**); GET returns assignments enriched with resource **name** / **type**; POST **`resource_id`** + optional **`bundle_instance_id`**; DELETE by **`resource_id`** or **`bundle_instance_id`**.
  - **`src/lib/tasks/task-resources-api.ts`** — client fetch helpers + **`TaskResourceAssignmentDto`** (shared type for API route import).
  - **`TaskResourcesSection`** — task detail (**read-only** remove) + edit (**remove** / **remove bundle**); placeholder copy for picker; link to edit from detail.
  - **Docs:** **`docs/planlog.md`** Phase 21 (API task_resources + UI bento structure checked); **`docs/sessionlog.md`** §2.7; **`docs/mvt.md`** sitemap + Events note.

### 2026-03-23 11:30 CT — Resources schema 195: task_resources, resource_bundles, bundle_instance_id, RPCs + lib

- **Context for Next Session:** Migration **195** **applied on tenant** (SQL Editor — no errors). **Next:** `GET/POST/DELETE` **REST** APIs for **`task_resources`**; wire **Resources** bento to assign/list; grouped picker (Bundles + Resources); optional extend **`get_resources_dynamic`** for calendar/task flag filters. **Key files:** `195_task_resources_resource_bundles.sql`, `src/lib/supabase/participants-resources.ts`, `docs/planlog.md` Phase 21, `docs/sessionlog.md` §2.
- **Completed:**
  - **Migration `195_task_resources_resource_bundles.sql`:** **`task_resources`** (`task_id`, `resource_id`, optional **`bundle_instance_id`**, RLS + grants); **`resource_bundles`** + **`resource_bundle_items`**; **`event_resources.bundle_instance_id`** (nullable); indexes + comments.
  - **Tenant apply:** Script run in **Supabase SQL Editor** without errors (confirm RPCs in Studio if needed).
  - **RPCs (public):** **`get_event_resources_dynamic`** / **`get_events_resources_bulk`** now return **`bundle_instance_id`**; new **`get_task_resources_dynamic`**, **`get_resource_bundles_dynamic`**, **`get_resource_bundle_items_dynamic`**; `NOTIFY pgrst, 'reload schema'`.
  - **`src/lib/supabase/participants-resources.ts`:** **`getEventResourceRows`**, **`getTaskResourceRows`** / **`getTaskResourceIds`**, **`getResourceBundles`**, **`getResourceBundleItems`**; **`assignResourceToEvent`** optional **`bundleInstanceId`**; **`assignResourceToTask`** / unassign + **`unassignBundleInstanceFromEvent|Task`**.
  - **Docs:** **`docs/planlog.md`** Phase 21 — schema + read-path + tenant apply; **`docs/mvt.md`** Events tables/RPCs; **`docs/sessionlog.md`** §2.2 terminology + §2.7 (migration applied + lib; APIs/UI open).

### 2026-03-23 11:33 CT — Docs: Phase 21 / sessionlog checkoffs after 195 applied

- **Context for Next Session:** Same as **11:30** entry above (REST APIs for task resources → bento).
- **Completed:** **`docs/sessionlog.md`** §2.2 **Terminology** checked; §2.7 notes tenant apply; **`docs/planlog.md`** Phase 21 — **Read path — 195** checked; bundle/task schema bullets note **Applied on tenant.**

### 2026-03-21 22:06 CT — Task detail & edit: bento UI, time tracking, assignees (Directory), schedule hint, mark complete

- **Context for Next Session:** Task **detail** and **edit** share the bento layout (hero, Phase & Type, Schedule, Assignees, Resources placeholder, time logs, thread). **Next priority for task UI:** ship an **MVP `task_resources` / resources integration** so the **Resources** bento tile is real (list + assign from registry)—see [planlog.md](./planlog.md) **Phase 21** (Tasks follow-on + new MVP bullet). Reserved status slugs for mark-complete: `in_progress` / `completed` in Customizer. **Key files:** `src/app/admin/projects/[id]/tasks/[taskId]/page.tsx`, `.../edit/TaskEditClient.tsx`, `src/components/crm/TaskTimeLogsSection.tsx`, `TaskFollowersSection.tsx`, `TaskAssigneesReadOnlyCard.tsx`, `ScheduleDueSubStatus.tsx`, `TaskBentoPanelTitle.tsx`, `src/lib/tasks/task-status-reserved.ts`, `src/lib/tasks/display-helpers.ts`, `src/app/globals.css` (`.task-bento-chip`, `.task-bento-primary-btn`).
- **Completed (this session):**
  - **Task detail & edit layout:** Edit page mirrors detail bento grid; hero chip + title/description; **Phase & Type** (phase + type); **Schedule** (start, due, status); **Assignees**; **Resources** placeholder; **`TaskTimeLogsSection`** + **`TaskThreadSection`** below; edit fetches time logs + notes like detail.
  - **`TaskBentoPanelTitle`:** Shared icon + uppercase headers (`components/tasks/TaskBentoPanelTitle.tsx`); used on detail, edit, assignees.
  - **Assignees (edit):** Removed helper text and role/member pickers; **Add Assignee** opens modal with **`DirectoryParticipantPicker`** + `GET /api/directory` (Team + Contacts); list shows avatar + name only (`AssigneeListItem` **`showRole`**); **`TaskAssigneesDetailCard`** name-only rows.
  - **Time tracking:** **Estimated** via button + modal (`PUT` `proposed_time` only); **Logged** = sum of time log minutes; display **`formatMinutesAsHrsMin`** (`xxhrs xxmin`); removed duration pickers from Phase & Type and Schedule on edit; detail Phase card no longer shows **Recorded actual** from `task.actual_time`.
  - **Mark complete:** Checkbox on time tracking card (after **Log time**); toggles **`completed`** ↔ **`in_progress`** via `PUT /api/tasks/[id]`; syncs edit Schedule status select via **`onTaskStatusSlugChange`**; constants in **`task-status-reserved.ts`**.
  - **Schedule sub-status:** **`ScheduleDueSubStatus`** under status — green **On Schedule** / red **Overdue** from due date (local calendar); hidden if no due date (detail + edit).
  - **Chrome:** Task ID chip — **`text-base`**, **`font-sans`**, padding tweak; **`.task-bento-primary-btn`** stronger shadow on primary actions (detail Edit, edit Save, new Create).
  - **`TaskFollowersSection`:** **`type="button"`** on add/remove so they don’t submit the task form.
  - **`docs/mvt.md`:** Notes `components/tasks` and task edit/detail flow.

### 2026-03-21 12:38 CT — Docs: Phase 18C spec, planlog/sessionlog sync, changelog rules, taxonomy ref

- **Context for Next Session:** **Implement Phase 18C** — Directory API + wire pickers; then timeline/thread migrations, RLS, APIs, **Messages and notifications** UI ([prd-technical § Phase 18C](./prd-technical.md#phase-18c-directory-and-messaging), [planlog](./planlog.md) Phase 18C). **Then** task detail / task UI polish. Shared identity UX (**copy/emails**) still open in Phase 00. **Sessionlog** is trimmed — use **planlog** for long backlogs (Calendar Phase 20, Resources Phase 21, site analytics, pre-fork).
- **Completed (this session / wrap-up):**
  - **`.cursor/rules/sessions.mdc`** + **`.cursor/rules/coding.mdc`:** Changelog entries only at **session end** (summarized from sessionlog) or explicit ask / release — not after every change.
  - **`docs/prd-technical.md`:** Full **Phase 18C** subsection — Directory read model, `contact_notifications_timeline` + thread tables, enums, MAG group rules, merged stream API, RLS, cutover vs `crm_notes`, edge defaults, suggested code paths.
  - **`docs/planlog.md`:** Phase 18C section + design locks checked; **Completed / Reference** — taxonomy 175 summary, Cursor changelog rule, Phase 18C planning ref; Phase 06 — taxonomy 175 UI marked done, **consumer pickers** row added (open).
  - **`docs/sessionlog.md`:** Checked off completed work, removed verbose duplicate lists; **Next up** focused on Phase 18C → task UI; backlog points to planlog.

### 2026-03-21 11:16 CT — Docs: Shared identity UX (forks) in PRD; planlog, sessionlog, mvt, prd-technical

- **Context for Next Session:** **Product spec** for **shared Supabase Auth / PHP-Auth messaging** is now **canonical** in [prd.md#shared-identity-ux-forks](./prd.md#shared-identity-ux-forks). **Implementation** (copy, emails, profile labels) remains **open** — see [planlog.md](./planlog.md) Phase 00 bullets and [sessionlog.md](./sessionlog.md). Continue prior focus (e.g. **task detail / task UI**) unless prioritizing auth UX.
- **Completed:**
  - **`docs/prd.md`:** New subsection **Shared identity UX (forks)** — MVP requirement, security principles (no enumeration, no tenant directories on cold pages), tiered copy (cold auth → transactional email → signed-in), global vs tenant-local labels, relation to CRM/consolidated contacts, fork obligation.
  - **`docs/prd-technical.md`:** **Shared identity UX (forks)** under Authentication & Security with link to PRD.
  - **`docs/planlog.md`:** Phase 00 checklist — MVP shared identity UX (implement copy/emails, signup email PHP-Auth, profile labels, fork checklist).
  - **`docs/sessionlog.md`:** Next-up bullets for shared identity UX + fork re-check.
  - **`docs/mvt.md`:** Auth / MFA — product spec pointer to PRD + planlog.

### 2026-03-20 01:28 CT — Tasks: Customizer-only slugs (migration 187); drop task taxonomy for status/type/phase

- **Context for Next Session:** **Migration 187** has been **run in Supabase SQL Editor** on this project’s tenant (confirmed). **Other** schemas/forks still need the same script if they use task admin. **Next focus:** **Task detail page** layout/UX and **more task UI** (polish, density, related flows). **Key files:** `src/lib/supabase/projects.ts` (`Task`, `listTasks`, `createTask`, `updateTask`, defaults `to_do` / `task` / `backlog`), `src/lib/tasks/customizer-task-terms.ts`, `src/lib/tasks/task-customizer-labels.ts`, `src/lib/tasks/admin-task-list.ts`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`, `src/app/api/projects/[id]/tasks/route.ts`, `src/app/api/members/support/route.ts`, task pages under `src/app/admin/projects/.../tasks/`, `AllTasksListClient.tsx`, `ProjectDetailClient.tsx`, `docs/mvt.md`.
- **Completed:**
  - **Migration `187_tasks_customizer_slugs.sql`:** *(Applied on tenant DB — SQL Editor.)* Backfill slugs from legacy taxonomy term ids + phase links; map legacy slugs toward Customizer (e.g. `open` → `to_do`); drop task FK columns; RPC slug filters/returns; remove task taxonomy relationships.
  - **`Task` model & `projects.ts`:** Status/type/phase as **slug columns**; `ListTasksFilters` uses `status_slugs` / `type_slugs` / `phase_slugs`; `createTask` / `updateTask` persist slugs; exported `DEFAULT_TASK_*_SLUG`; `listTasksByProjectIds` selects `task_status_slug`.
  - **`statusTermsFromCustomizerRows`:** Select options from **Customizer table only** (`id` === slug); used on All Tasks, project detail tasks, task new/edit/detail.
  - **`getAdminTasksListBundle`:** No taxonomy batch for tasks; `phaseSlugByTaskId` from `task.task_phase_slug`; removed `termSlugById` from bundle.
  - **APIs:** `GET /api/tasks` passes slugs straight to `listTasks`; `PUT /api/tasks/[id]` accepts `task_*_slug`; status-change log uses `getTaskStatusLabelForSlug`; `GET /api/projects/[id]/tasks` query `status_slug` / `type_slug`; `POST` body uses slug fields; support ticket `createTask` uses default slugs.
  - **UI:** Task **new/edit** — slug selects only, no taxonomy/tags block; **task detail** — badges from Customizer rows; removed **`TaskDetailTaxonomyCard`** and task taxonomy chips section; **All Tasks** / **project task table** / **projects list progress** use `task_status_slug`.
  - **`docs/mvt.md`:** Note customizer-task-terms for tasks.

### 2026-03-19 23:40 CT — All Tasks table: column widths 17/12/15/12/12/10/10/12

- **Context for Next Session:** **`ALL_TASKS_TABLE_COL`** — Title **17%**, Project **12%**, Assignee **15%**, Phase **12%**, Type **12%**, Due **10%**, Progress **10%**, Status **12%**.
- **Completed:**
  - **`AllTasksListClient.tsx`**.

### 2026-03-19 23:37 CT — TermBadge: remove pillFixed; rounded-md + truncate; All Tasks no horizontal scroll

- **Context for Next Session:** **`pillFixed`** removed. **`TermBadge`** is **`rounded-md`** again, **`max-w-full min-w-0`**, inner **`truncate`**, **`title`** on chip. **All Tasks** Phase/Type/Status use **`min-w-0`** wrapper; table container **`overflow-x-hidden`** (not **`overflow-x-auto`**) to avoid horizontal scrollbar; **`table-fixed`** + % columns unchanged.
- **Completed:**
  - **`TermBadge.tsx`**, **`AllTasksListClient.tsx`**, **`mvt.md`**.

### 2026-03-19 23:34 CT — TermBadge `pillFixed`; All Tasks Phase/Type/Status centered pills

- **Context for Next Session:** **`TermBadge`** supports **`variant="pillFixed"`**: **`rounded-full`**, fixed **`w-[7rem]` / `sm:w-[7.5rem]`**, **`h-6`**, **`justify-center`**, label **`truncate`** + **`title`**. Empty shows same-size **—** pill. **All Tasks** table uses it for Phase/Type/Status with **`text-center`** cells.
- **Completed:**
  - **`TermBadge.tsx`**, **`AllTasksListClient.tsx`**.

### 2026-03-19 23:29 CT — All Tasks table: column widths 20/15/15/10/10/10/10/10

- **Context for Next Session:** **`ALL_TASKS_TABLE_COL`** updated: Title **20%**, Project/Assignee **15%** each, remaining six columns **10%** each.
- **Completed:**
  - **`AllTasksListClient.tsx`:** `ALL_TASKS_TABLE_COL` comment + values.

### 2026-03-19 23:26 CT — All Tasks table: column percent widths (20/20/20/9/9/9/4/9)

- **Context for Next Session:** **`ALL_TASKS_TABLE_COL`** — Title/Project/Assignee **20%** each; Phase/Type/Due/Status **9%** each; Progress **4%**. **`table-fixed`** + **`min-w-0`**. **`ALL_TASKS_TOOLBAR_SEARCH`** object for locked search. Project cell **`truncate`** + **`title`**.
- **Completed:**
  - **`AllTasksListClient.tsx`:** `ALL_TASKS_TABLE_COL`, th/td.

### 2026-03-19 23:15 CT — All Tasks toolbar: compact single row (~900px), dense controls

- **Context for Next Session:** **`md:flex-nowrap`** (no toolbar scrollbar). **Search** **`flex-1 min-w-[7rem]`** shrinks first so fixed controls stay one line. **Projects/Assignees/Phases** compact **`h-8`** pills **`~7–7.25rem`**, **`text-xs`**. **Type/Status** larger fixed **`~10.75–11.25rem`** for chip + label, **`text-xs`**. **`gap-1`**, **`h-8`** reset. Targets ~**900px** content width beside sidebar.
- **Completed:**
  - **`AllTasksListClient.tsx`:** Toolbar dimensions + comment.

### 2026-03-19 23:08 CT — All Tasks toolbar: fixed pickers + only search flexes

- **Context for Next Session:** **Search** alone uses **`md:flex-1`** (fills space in the row; **`min-w-0`**). **Projects / Assignees / Phases** fixed **`~9.25–9.5rem`** with **`truncate`** + **`title`**. **Type / Status** fixed **`13.5rem` / `sm:14rem`** (no breakpoint ladder). **Reset** stays **`w-9`**. Still **no horizontal scrollbar** on the toolbar (**`flex-wrap`** on `md+`). Comment block updated in client.
- **Completed:**
  - **`AllTasksListClient.tsx`:** Toolbar widths.

### 2026-03-19 23:05 CT — All Tasks toolbar: Option B + breakpoints (stack &lt; md, single row md+)

- **Context for Next Session:** **Reset** is inside the **same flex group** as project/assignee/phase/type/status (no orphan third line). **&lt; md (768px):** column — full-width search, then wrapping controls + reset. **`md+`:** **`flex-nowrap`** one row, **`overflow-x-auto`** + thin scrollbar only if content overflows. Comment in **`AllTasksListClient`** documents breakpoint. To stack until **1024px** instead, switch **`md:`** → **`lg:`** on the toolbar classes.
- **Completed:**
  - **`AllTasksListClient.tsx`:** Toolbar structure and responsive classes.

### 2026-03-19 23:01 CT — All Tasks: wider Task type / Task status selects (second toolbar row)

- **Context for Next Session:** Type/status **`SelectTrigger`** widths **`min(100%,20rem)`** cap on narrow; **`sm:16rem`**, **`md:18rem`**, **`lg:20rem`** to fit longer Customizer labels now that search sits on its own wrapped row.
- **Completed:**
  - **`AllTasksListClient.tsx`:** Select trigger classes.

### 2026-03-19 23:00 CT — All Tasks toolbar: revert scroll/flex-grow experiment; wrap + wider type/status

- **Context for Next Session:** Removed **horizontal scroll** / **flex-grow-[2]** toolbar. **Search** again **`sm:flex-1`** with **`sm:max-w-[min(100%,22rem)]`**, **`md:max-w-none`**; **full width** on xs. **Type/status** triggers **`w-[min(100%,13.5rem)] sm:w-[13rem]`**; placeholders **Task type** / **Task status**. **Projects/Assignees/Phases** back to normal outline buttons (**`shrink-0 whitespace-nowrap`**). Outer row uses **`flex-wrap`** on narrow viewports; reset **`sm:ms-auto`**.
- **Completed:**
  - **`AllTasksListClient.tsx`:** Toolbar class layout only.

### 2026-03-19 22:58 CT — All Tasks toolbar: mobile layout (fixed pickers, flexible search + type/status)

- **Context for Next Session:** **Projects / Assignees / Phases** use **fixed widths** (`~8.75–9.25rem`), **`truncate`** + **`title`** full label. **Search** uses **`flex-grow-[2]`** vs **`flex-grow`** on the **Type + Status** pair so search gets more room; both use **`basis-0` + `min-w-0`** for shrink. Selects sit in **`w-full`** triggers inside **`flex-1`** wrappers (`sm:min-w-[7rem]`). Row still **`flex-nowrap`** + horizontal scroll when needed.
- **Completed:**
  - **`AllTasksListClient.tsx`:** Toolbar structure and responsive classes.

### 2026-03-19 22:56 CT — All Tasks toolbar: inline title search + single-row layout

- **Context for Next Session:** **Title** filter is an **`Input`** (search icon) with **live** client-side filtering; modal removed. Toolbar uses **`flex-nowrap`** + thin horizontal scroll if the viewport is too narrow. Type/status **`Select`** triggers narrowed (**~9–9.5rem**); placeholders **Type** / **Status**. Search area **`flex-1`** from `min-w-[13rem]` (sm+ uncapped width).
- **Completed:**
  - **`AllTasksListClient.tsx`:** Inline search; removed title `Dialog` and draft state.

### 2026-03-19 22:52 CT — All Tasks table: remove Priority column; wider Title

- **Context for Next Session:** **All tasks** table is 8 columns (no **Priority**). Title column uses `min-w` / `max-w` + `break-words` for space. **`page.tsx`** no longer loads `getTaskPriorityTerms` for this page.
- **Completed:**
  - **`AllTasksListClient.tsx` / `page.tsx`:** Dropped priority column and `priorityTerms` prop.

### 2026-03-19 22:49 CT — All Tasks: title search modal + toolbar layout (search left, reset icon right)

- **Context for Next Session:** Toolbar row: **Search** (opens dialog; substring on task title, client-side on current fetch) → flex **filters** → **Reset** (`RotateCcw` icon, disabled when nothing active). Active title search uses `secondary` Search button + table empty state when no title matches. Reset clears all filters + refetches `/api/tasks` with no query.
- **Completed:**
  - **`AllTasksListClient.tsx`:** `titleSearchQuery` / modal / `displayTasks`; `hasActiveFilters`; `resetAllFilters`.

### 2026-03-19 22:45 CT — All Tasks: task status single-select (Customizer task_status); GET /api/tasks status_slugs

- **Context for Next Session:** Toolbar: **Projects → Assignees → Phases → Type → Status**. **Task status** `Select` uses **`getCustomizerOptions("task_status")`**; **All statuses** or one row; **`status_slugs`** on refetch. **`buildTasksQuery`** sixth parameter. Other filters preserve selection.
- **Completed:**
  - **`page.tsx`:** `taskStatusOptions` from `czTaskStatus`.
  - **`AllTasksListClient.tsx`:** `selectedTaskStatusSlug`, `onTaskStatusChange`, status `Select`.

### 2026-03-19 22:42 CT — All Tasks: toolbar + table column order — Phase before Type

- **Context for Next Session:** Filters row: **Projects → Assignees → Task phases → Task type**. Table columns **Phase** and **Type** match that order (after Priority). Behavior unchanged.
- **Completed:**
  - **`AllTasksListClient.tsx`:** Reordered phase button vs type `Select`; swapped `<th>` and `<td>` for phase/type.

### 2026-03-19 22:39 CT — All Tasks: task type single-select (Customizer task_type); GET /api/tasks type_slugs

- **Context for Next Session:** Toolbar includes a **Task type** shadcn `Select`: **All types** or one Customizer row (`task_type` order, label + color dot). Changing the value refetches immediately (no modal). Empty Customizer list disables the control. **`buildTasksQuery`** now includes optional **`type_slugs`** (single slug). Other pickers preserve the selected type. **Next:** e.g. task status from Customizer (single or multi, as desired).
- **Completed:**
  - **`page.tsx`:** `taskTypeOptions` from `getCustomizerOptions("task_type")`.
  - **`AllTasksListClient.tsx`:** `Select` + `selectedTaskTypeSlug`; `buildTasksQuery` 5th parameter.

### 2026-03-19 22:31 CT — All Tasks: task phase picker (Customizer task_phase order); GET /api/tasks phase_slugs

- **Context for Next Session:** Third filter-row control: **Task phases** opens the same pattern as Projects/Assignees (search, multi-select, Select all, Clear, Done). Options = **`getCustomizerOptions("task_phase")`** (label, slug, color) in Customizer order; empty Customizer list disables the button. **`GET /api/tasks?phase_slugs=…`** was already supported; client passes slugs from the picker. Project/assignee Done keeps the current phase selection. **Next:** further row filters (e.g. task status/type from Customizer) when planned.
- **Completed:**
  - **`page.tsx`:** Build `taskPhaseOptions` from `czTaskPhase`; pass to client.
  - **`AllTasksListClient.tsx`:** `selectedPhaseSlugs`, phase modal, `buildTasksQuery` 4th arg `phase_slugs`; prune on apply if options change.

### 2026-03-19 22:23 CT — All Tasks: assignee picker (project members scoped by project filter); API contact ids

- **Context for Next Session:** Second filter row control: **Assignees** button opens modal (team + client project members). Scope = members on **selected projects**, or on **all active projects** when project filter is “All projects”. Saving projects prunes assignee picks outside the new scope. **`GET /api/tasks`** accepts **`assignee_contact_ids`**. **`page.tsx`** loads `project_members` for active projects + profile/contact labels.
- **Completed:**
  - **`src/app/api/tasks/route.ts`:** `assignee_contact_ids` query param.
  - **`page.tsx` / `AllTasksListClient`:** member rows, dual modals, `buildTasksQuery` for `project_ids` + user/contact assignees.

### 2026-03-19 21:50 CT — All Tasks: project picker modal (active projects); scoped list via API

- **Context for Next Session:** Row 1 has a **Projects** button: **All tasks** (no filter) or **N project(s) selected**. Modal lists **`filterActiveProjectsForTaskList`** (non-archived; not `completed`/`closed` status slugs) with search, Select all, Clear; **Done** applies selection and **`GET /api/tasks?project_ids=…`**. Full `initialProjects` still used for project name links. **Next:** Row 2 filters when ready.
- **Completed:**
  - **`page.tsx`:** `getProjectStatusTerms` + `pickerProjects` passed to client.
  - **`AllTasksListClient`:** Dialog checklist, button label rules, bundle refetch on Done.

### 2026-03-19 21:39 CT — All tasks: clean slate (SSR table only; filters removed from client)

- **Context for Next Session:** **`AllTasksListClient`** is table + title only; data from **`getAdminTasksListBundle`** on `page.tsx` (unchanged). Reintroduce search/filters/`GET /api/tasks` when you rearrange. **`GET /api/tasks`** and **`admin-task-list`** remain available.
- **Completed:**
  - **`AllTasksListClient`:** Removed all filter controls, client fetch, query builders, and related state.

### 2026-03-19 21:34 CT — All tasks: immediate filters; Reset only (calendar-style)

- **Context for Next Session:** All tasks refetches on every filter change (no Apply). **Reset** matches events toolbar (outline + icon + label), disabled when no filters. Controls disabled while loading.
- **Completed:**
  - **`AllTasksListClient`:** `refetch` with explicit filter snapshot per change; removed Apply; `hasFilters` for Reset `disabled`.

### 2026-03-19 21:30 CT — All tasks filter bar layout (panel, grid, Reset)

- **Context for Next Session:** All tasks filters live in a **Filters** card (description + responsive grid + footer actions). **Reset** clears pickers and reloads unfiltered bundle via `GET /api/tasks`. Continue task list / projects table customizer work as planned.
- **Completed:**
  - **`AllTasksListClient`:** Filters card (`CardHeader` / `CardContent` / `CardFooter`); labels above controls; `grid` 1→2→4 columns; shared `loadTasksFromQuery`; **Reset** (`RotateCcw`) + **Apply filters**; color dots only inside taxonomy dropdown items.

### 2026-03-19 21:32 CT — All tasks: strip filter card; minimal toolbar

- **Context for Next Session:** All tasks uses one **toolbar row** (title + compact selects + Apply + icon Reset); no filter `Card` chrome. Same `loadTasksFromQuery` / API behavior. Iterate on layout when ready.
- **Completed:**
  - **`AllTasksListClient`:** Removed Filters card/header/description/footer; inline `flex-wrap` controls with `aria-label` on triggers; table remains in `Card`.

### 2026-03-19 20:53 CT — All tasks: single bundle pipeline; Apply aligned with GET /api/tasks (slug params)

- **Context for Next Session:** **All tasks** SSR and **Apply** both use `getAdminTasksListBundle` / the same JSON shape (`tasks`, `phaseSlugByTaskId`, `taskAssigneesMap`, `taskTimeLogTotals`). Client builds `project_ids`, `status_slugs`, `type_slugs`, `phase_slugs` from selected Customizer-backed terms. **Next:** Projects list/table customizer alignment (per prior plan). **Key files:** `src/app/admin/projects/tasks/page.tsx`, `src/app/admin/projects/tasks/AllTasksListClient.tsx`, `src/lib/tasks/admin-task-list.ts`, `src/app/api/tasks/route.ts`.
- **Completed:**
  - **All tasks page (`page.tsx`):** Removed duplicate `getTaxonomyForContentBatch` + phase color augment; initial load uses `getAdminTasksListBundle({})` only (taxonomy inside bundle for phase slugs + followers + time totals).
  - **`AllTasksListClient`:** Dropped `taskTaxonomyMap`; phase column resolves `phaseSlugByTaskId` → `taskPhaseTerms` (Customizer colors on terms). **Apply** parses full admin bundle and updates tasks, assignees, time totals, and phase slug map; query matches `GET /api/tasks` contract.

### 2026-03-19 16:48 CT — Resources asset columns; get_tasks_dynamic multi-filter + SQL fix; All tasks customizer colors; taxonomy slug helpers

- **Context for Next Session:** Tenant DB has **migrations 183–186 applied** (`resources` asset columns; `get_tasks_dynamic` phase + multi-filter uuid[] + `format()` fix). `listTasks` calls only the uuid[] RPC (no legacy overload). **All tasks (`/admin/projects/tasks`):** SSR shows Customizer-driven colors on type/status/phase + phase column. **Next:** Align `AllTasksListClient` “Apply” with `GET /api/tasks` (client still sends `project_id` / `status_term_id` / …; API expects `project_ids`, `status_slugs`, … and returns a full **bundle**) so filters match after Apply. **Git:** this session ended with **no push**. Key files: `src/lib/supabase/projects.ts`, `src/lib/supabase/taxonomy.ts`, `src/lib/tasks/admin-task-list.ts`, `src/app/api/tasks/route.ts`, `src/app/admin/projects/tasks/AllTasksListClient.tsx`, `supabase/migrations/183_*.sql` … `186_*.sql`, `docs/sessionlog.md`, `docs/planlog.md`, `docs/mvt.md`.
- **Completed:**
  - **Phase 21 — schema step:** Tenant `resources` asset/scheduling/financial columns via migration `183_resources_asset_and_scheduling.sql`; sessionlog/planlog marked schema complete for Asset / Resource Management.
  - **`get_tasks_dynamic` RPC:** `184` — optional phase filter via `taxonomy_relationships` (`task`); `185` — multi-value filters (`project_ids`, `status_term_ids`, `task_type_term_ids`, `phase_term_ids`, `assignee_user_ids`, `assignee_contact_ids` as `uuid[]`); `186` — correct **`format(schema_name, schema_name, schema_name, schema_name)`** (four `%I` placeholders for tasks, taxonomy_relationships, task_followers ×2).
  - **`listTasks` / filters:** `ListTasksFilters` uses arrays only; `listTasks` calls uuid[] RPC; updated call sites (`project_ids: [id]`) for project task lists and `getProjectTimeLogTotalMinutes`; removed PostgREST legacy overload fallback.
  - **Taxonomy helpers:** `getTermSlugsByIds`, `getCategoryTermIdsBySlugsForSection`; `??` + `||` grouped for SWC (`schema ?? (env || default)`).
  - **Admin tasks API:** `GET /api/tasks` resolves Customizer slugs to term ids and returns `getAdminTasksListBundle` (tasks + `termSlugById`, `phaseSlugByTaskId`, assignee map, time totals).
  - **`src/lib/tasks`:** `admin-task-list.ts` (bundle + `filterActiveProjectsForTaskList` for future use), `merge-task-customizer-colors.ts` (Customizer hex onto terms by slug).
  - **UI:** `TaskFilterMultiSelect` (color dots inside menu only); **All tasks** page — Customizer merge for type/status/phase labels & colors, phase column, colored filter dropdowns; improved server error logging on tasks page load.
  - **Docs:** MVT sitemap touches for `admin/projects`, `lib/tasks`, `projects` lib; sessionlog “Next up” / Phase 21 notes as updated this session.

### 2026-03-19 12:20 CT — Events: creator auto-added as participant on create

- **Context for Next Session:** **POST /api/events** now links the signed-in admin to the new event as a calendar participant (`team_member` participant = auth user id via `ensureParticipant` + `assignParticipantToEvent`). Duplicate assignment is harmless (unique constraint handled). If participant ensure/assign fails, the event is still created and errors are logged server-side. **Ready to test:** create a new event (no manual participants) → open edit or calendar with My View → you should appear as a participant. **Key file:** `src/app/api/events/route.ts`.
- **Completed:**
  - **Event create — creator as participant:** After successful `createEvent`, API ensures a `participants` row for `source_type: team_member`, `source_id: user.id`, assigns to `event_participants`; failures are non-blocking (console.error).

### 2026-03-18 16:31 CT — Taxonomy section modal & Core; CRM→Contact taxonomy; org list filters; tag refresh

- **Context for Next Session:** Taxonomy section modal now uses "Add New Taxonomy Section" / "Edit Taxonomy Section" with Create/Update buttons; categories picker removed from section modal (categories created/assigned elsewhere). Sections support **Core** locking (is_core): checkbox in modal (superadmin), slug locked when core, delete icon ghosted; migration `180_section_taxonomy_config_is_core.sql` adds column + RPC + trigger. Staple sections show Core checked; superadmin can uncheck and persist (is_staple synced with Core). **CRM contacts** use taxonomy section **Contact** (slug `contact`): ContactTaxonomyBlock, ContactsListClient, bulk API, and term filtering use `contact`; categories included by `home_section_name` in `termsForSection`. **Organizations list:** search bar on the left; category and tag pickers scoped to **Organization** section; `getOrganizationTaxonomyTermIds` in crm-taxonomy; client-side filter by search + category + tag. **Taxonomy:** adding a new tag refreshes the list (loadAllData on error path; section filter cleared when adding a tag). **Next session:** Rewire **Projects** and **Tasks** to use the new **customizer** settings (project_type, project_status, project_role; task_type, task_status, task_phase) and continue UI enhancement there (see sessionlog). Key files: `TaxonomySettings.tsx`, `180_section_taxonomy_config_is_core.sql`, ContactTaxonomyBlock, ContactsListClient, crm-taxonomy.ts, taxonomy.ts (filterBySuggested + home_section_name), OrganizationsListClient, organizations page.
- **Completed:**
  - **Taxonomy section modal:** Header "Add New Taxonomy Section" / "Edit Taxonomy Section"; description updated; categories multi-picker removed; primary button "Create Taxonomy Section" / "Update Taxonomy Section".
  - **Taxonomy Sections — Core locking:** Migration `180_section_taxonomy_config_is_core.sql` adds `is_core` to `section_taxonomy_config`, RPC returns it, delete trigger blocks when is_core. Modal: Core checkbox (superadmin) with message "Core (system-required: slug locked, only label editable, cannot delete)"; slug input disabled when core; list delete button ghosted when section.is_core or section.is_staple. Staple (template) sections show Core checked; superadmin can uncheck and save (is_staple synced with Core).
  - **CRM contacts → Contact taxonomy:** All references switched from section "crm" to "contact". ContactTaxonomyBlock, ContactsListClient, API `/api/crm/contacts/taxonomy/bulk`, crm-taxonomy comment. `termsForSection` includes categories by `home_section_name` when section config has no category_slugs.
  - **Taxonomy — tag list refresh:** On save term (create/update), loadAllData in catch so list refreshes even on partial failure; when adding a tag, section filter cleared so new tag is visible.
  - **Organizations list:** Search bar moved to the left; category and tag pickers added (scoped to taxonomy section "organization"); Clear all when filters set. `getOrganizationTaxonomyTermIds` in crm-taxonomy; page fetches taxonomy terms, section configs, org term IDs; client filters by search (name, email, phone, type, industry) and by selected category/tag.

### 2026-03-17 23:07 CT — CRM avatars; projects list refresh; sidebar Content/Marketing/Ecommerce + gating

- **Context for Next Session:** CRM contacts and organizations can store **avatar URLs** (tenant schema); project list is the new table layout (type dot, proposed end date, client link + avatar, status pill, member avatars, per-task progress bar, type). Sidebar matches expanded nav: **Content** accordion (Text Blocks, Media, Galleries), **Ecommerce** sub-order (Products → Transactions → Invoices → Subscriptions), **Marketing** (Lists, Email, Social placeholder, …). **Run in Supabase:** `172_crm_avatar_urls.sql` alters `website_cms_template_dev.crm_contacts` and `.organizations` (replace schema if your fork differs). **Ready to test:** set avatars on a contact/org → open `/admin/projects` and confirm columns and progress segments. **Next up:** More Projects/Tasks UI polish (sessionlog); optional `next/image` for avatar `<img>` warnings; align project **detail** progress with list if desired. Key files: `supabase/migrations/172_crm_avatar_urls.sql`, `171_feature_registry_ecommerce.sql`, `src/app/admin/projects/page.tsx`, `src/components/projects/ProjectListTable.tsx`, `src/components/dashboard/Sidebar.tsx`, `src/lib/admin/route-features.ts`.
- **Completed:**
  - **Migration 172 — CRM `avatar_url`:** Adds `avatar_url text` to tenant-schema `crm_contacts` and `organizations` (not `public`; use `website_cms_template_dev` or your `NEXT_PUBLIC_CLIENT_SCHEMA`).
  - **CRM UI — avatars:** Contact create/edit and organization create/detail: Avatar URL field + Media Library picker; organizations API POST/PUT pass `avatar_url`. Types updated in `crm.ts` / `organizations.ts`.
  - **Projects list — modern table:** Server assembles rows with batch queries (members, tasks, contacts, orgs, profiles): title + project-type color dot, Proposed End Date, client (CRM contact or org link + avatar), status pill (`TermBadge`), stacked member avatars (contact + team `profiles.avatar_url`), segmented progress (green = task done, red = overdue incomplete, grey todo, muted cancelled), project type column. Helpers: `listProjectMembersByProjectIds`, `listTasksByProjectIds`, `getOrganizationsByIds`, `getProfilesByUserIds`. Components: `ProjectListTable`, `ProjectMemberAvatars`, `ProjectProgressSegments`. Archived projects loaded with `include_archived: true`; client filter toggles visibility.
  - **Sidebar & gating — Content / Ecommerce / Marketing:** Single **Content** twirldown (Text Blocks `/admin/content`, Media, Galleries); removed separate Media top-level. Ecommerce sub-items reordered. Marketing: Email label, **Social** placeholder `/admin/crm/social`, order Lists → Email → Social → …. `route-features` path slugs + `FEATURE_PARENT_SLUG` for ecommerce children and social. **Migration 171** — `feature_registry` rows for `ecommerce`, products/transactions/invoices/subscriptions, `social`, lists display order under marketing.
  - **Admin copy:** Text Blocks page titles (“Text Block Content” / “All Text Block Content”); Email page title.

### 2026-03-17 18:44 CT — Project Events tab calendar view; project-prefilled event create

- **Context for Next Session:** Project detail pages now show the shared events calendar mirror in the Events tab, plus a project-scoped **Add event** entry point. The new-event route accepts `project_id` from the URL and pre-fills the event form so new events link back to the project automatically. **Ready to test:** open a project detail page, switch to **Events**, verify the calendar renders in month/week/day/agenda views, confirm **Add event** opens `/admin/events/new?project_id=...`, and confirm the existing edit/unlink list still works. **Next up:** CRM organization/contact linking (phone-first) remains the sessionlog focus. Key files: `src/app/admin/projects/[id]/ProjectDetailClient.tsx`, `src/components/events/EventsCalendar.tsx`, `src/app/admin/events/new/page.tsx`, `src/app/admin/events/EventFormClient.tsx`.
- **Completed:**
  - **Project Events tab — calendar view (UI):** Replaced the project detail Events tab’s list-only layout with the shared calendar mirror (month/week/day/agenda) and kept the linked-events table underneath for Edit/Unlink actions. Added an **Add event** link that opens the new-event form with the current project prefilled.

### 2026-03-17 16:29 CT — Project members consolidation; creator as first member; task assignee scoping

- **Context for Next Session:** Project members, client, and task assignee scoping are in place. **Done this session:** (1) Single Members section on project **edit** page only — client (contact or org) and all members managed there via unified "Add member" modal (Client Contact, Client Organization + org contacts, Team member, Contact). Detail page shows Members read-only with "Manage members" link to edit. (2) Every new project gets the **creator added as first project member** (POST /api/projects). (3) **Task assignee scoping:** GET /api/projects/[id]/members?with_labels=1 returns members with labels; TaskFollowersSection accepts optional projectId and when set restricts "Add follower" to that project's members (team + contacts); task detail passes projectId. **Next up (sessionlog):** Step 9 — Support project (title "Support Requests for – (client-name)", add GPUM to project_members); Step 10 — Reserved taxonomy terms. Sessionlog steps 1–8 left as reference (checked). Key files: `src/app/api/projects/route.ts`, `src/app/api/projects/[id]/members/route.ts`, `src/app/admin/projects/[id]/edit/ProjectEditClient.tsx`, `src/components/crm/TaskFollowersSection.tsx`, `src/app/admin/projects/[id]/tasks/[taskId]/page.tsx`.
- **Completed:**
  - **Project create — creator as first member:** POST /api/projects sets created_by to current user when not in body; after createProject success calls addProjectMember(projectId, { user_id: user.id }) so every project starts with the creator in the members list.
  - **GET project members with labels:** GET /api/projects/[id]/members?with_labels=1 resolves label (contact name/email or profile display_name) and role_label per member; used by TaskFollowersSection when projectId is set.
  - **Task assignee scoping (steps 7–8):** TaskFollowersSection accepts optional projectId; when set fetches project members with labels and shows "Add follower" as dropdown of project members only (team users + contacts); POST task follower with user_id or contact_id; already-added followers excluded from dropdown. Task detail page passes projectId to TaskFollowersSection.
  - **Members UI consolidation (earlier in session):** Client selector and "Add org members" removed from edit form; single Members card on edit page with Client display + Clear, member badges with remove, and unified Add member modal (Client Contact, Client Organization with optional org contacts, Team member, Contact). Detail page: Members read-only, "Manage members" link to edit.

### 2026-03-16 22:35 CT — Session wrap: Sidebar Activities consolidation

- **Context for Next Session:** Sidebar — Activities is complete. Admin sidebar now has one **Activities** section (replacing separate Calendar and Projects sections) with sub-items: Events, Tasks, Projects, Resources; feature gating and role checks unchanged. **Ready to test:** Admin → Activities (expand) → Events / Tasks / Projects / Resources. **Next up (sessionlog):** User handle — auto-generate on first support ticket (+ activity when auto-generated); Time tracking — API & UI; Priority & taxonomy colors; Support project (per GPUM); Integration — support tickets; Sidebar — Content consolidation; Feature registry/sidebar gating. Key files: `src/components/dashboard/Sidebar.tsx`, `src/components/dashboard/sidebar-config.ts`.
- **Completed:**
  - **Sidebar — Activities:** Replaced top-level Calendar and top-level Projects with one "Activities" section; sub-items Events (`/admin/events`), Tasks (`/admin/projects/tasks`), Projects (`/admin/projects`), Resources (`/admin/events/resources`). Config: `activitiesSubNav`, `SIDEBAR_ACTIVITIES_OPEN`; state `activitiesOpen` and pathname-driven expand when on Events or Projects routes; feature gating via `showActivities*` (content, calendar, events, resources, projects). Removed unused `showProjects*` vars and duplicate catch-block logic; build passes.

### 2026-03-15 00:18 CT — Phase 19 Project Management: schema, RPC/API, Admin UI (projects + tasks list/detail/forms), All Tasks view

- **Context for Next Session:** Phase 19 Project Management is partially complete. **Done:** Full schema (projects, tasks, task_followers, Projects/Tasks taxonomy sections as core/is_staple, project_id on orders/events), RPC/API for projects and tasks, Admin UI: sidebar (Projects section with Projects + Tasks sub-items, feature slug `projects`), projects list (filters, new/detail/edit), project detail (header, tasks table, archive/restore), project new/edit forms, task new/detail, **All Tasks** page (`/admin/projects/tasks`) with filters (project, status, type) and Title as first column. **Next up (sessionlog):** Admin UI — time tracking; Integration — activity stream, support tickets, e-commerce/calendar links; Member area (GPUM); Feature registry/sidebar gating for projects at end of phase. Key files: `src/lib/supabase/projects.ts`, `src/app/admin/projects/*`, `src/app/api/projects/*`, `src/app/api/tasks/*`, migrations 145–151.
- **Completed (from sessionlog):**
  - **Schema — projects:** Table `projects` (id, name, description, status, proposed_start_date, proposed_end_date, end_date_extended, potential_sales, required_mag_id, archived_at, created_at, updated_at, created_by). RLS, indexes. Migration 145.
  - **Schema — project taxonomy:** Projects as core section in `section_taxonomy_config` (is_staple = true). taxonomy_relationships content_type = 'project'. Migration 146.
  - **Schema — tasks:** Table `tasks` (project_id, title, description, status, task_type, priority, proposed_time, actual_time, due_date, creator_id, responsible_id). RLS, indexes. Migration 147.
  - **Schema — task taxonomy:** Tasks as core section in `section_taxonomy_config` (is_staple = true). taxonomy_relationships content_type = 'task'. Migration 148.
  - **Schema — task assignments:** Junction `task_followers` (task_id, role creator|responsible|follower, user_id or contact_id). Migration 149.
  - **Schema — project linking:** project_id (nullable FK to projects) on orders and events. Migration 150.
  - **Schema — archive:** projects.archived_at; archive/restore via UI.
  - **RPC/API — projects:** get_projects_dynamic, get_project_by_id_dynamic; listProjects, getProjectById, createProject, updateProject, deleteProject; GET/POST /api/projects, GET/PUT/DELETE /api/projects/[id]. Migration 151.
  - **RPC/API — tasks:** get_tasks_dynamic (with assignee for "my tasks"), get_task_by_id_dynamic; listTasks, getTaskById, createTask, updateTask, deleteTask; auto-extend project end when task due_date > project proposed_end_date. GET/POST /api/projects/[id]/tasks, GET/PUT/DELETE /api/tasks/[id]. GET /api/tasks for global task list (query: project_id, status, task_type).
  - **Admin UI — sidebar & gate:** Projects section in sidebar (feature slug `projects`); sub-items Projects → /admin/projects, Tasks → /admin/projects/tasks. Routes /admin/projects, /admin/projects/[id], /admin/projects/new, /admin/projects/[id]/edit, /admin/projects/[id]/tasks/new, /admin/projects/[id]/tasks/[taskId], /admin/projects/tasks.
  - **Admin UI — projects list:** Filters (status, include archived), columns name/status/dates/potential_sales/MAG, New project, link to detail.
  - **Admin UI — project detail:** Header (name, description, status, timeline, potential_sales, MAG), tasks table, Edit, Archive/Restore, Add task.
  - **Admin UI — project create/edit:** Forms for name, description, status, proposed start/end, potential_sales (new + edit pages).
  - **Admin UI — tasks:** Add task form (project-scoped), task detail page; All Tasks list with filters (project, status, type), Title as first column, Project second.
- **Other:** Organizations page error reverted (no defensive try/catch); root cause was transient (cleared after server restart). Task list view: Title column moved to first column.

### 2026-03-14 23:04 CT — Session cleanup: completed steps to changelog; membership gate, MAG hierarchy, pagination

- **Context for Next Session:** Completed work from sessionlog has been moved here in full. Sessionlog "Next up" is trimmed to unchecked items only. **Next up:** Feature registry, sidebar gating & roles (after new modules); Pre-fork: Security review and Fork deployment checklist. Key recent work: Membership "on/off" now driven by feature gate (memberships slug); MAG parent/child hierarchy (migration 144, ancestor auto-assign, UI parent dropdown, list indented); Transactions page (single filterable table, Actions dropdown); Memberships list pagination (25/50/100); Organizations (CRM) and Invoicing/Transactions UI completed earlier.
- **Completed (moved from sessionlog in full):**
  - **E-commerce: Invoicing** — Sub-item under E-commerce tab. See **Invoicing — design (locked)** for schema, generator, and flow. Admin creates one-off invoices: our invoice number generator, lay out line items (products/services), sync to Stripe; Stripe hosts invoice and sends email to customer; payment in Stripe. Our side: UI to create/edit invoices, track when paid (webhook-driven: `invoice.paid` → create Order + update invoice status). Design: **Invoices** list (draft/sent/paid) + paid invoices create an Order (so Orders tab shows all money in); optional Contact detail "Invoices" section for that customer. **Tracking & placement:** When paid = webhook `invoice.paid` (update our invoice + create Order; no polling). Where to show = Invoices sub-tab (lifecycle: draft/sent/paid) + Orders tab (all revenue; paid invoices create Order) + **Contact detail: Transactions tab**.
  - **CRM Contact record: Transactions tab** — Add a tab on the contact detail page with a **list view of transactions** for that customer (orders, invoices). More focused than the activity stream (which also shows this but mixed with other activity). List = this customer's transactions (date, type, amount, status, link to order/invoice).
  - **CRM Contact record: two-section tab layout** — Section 1: Contact Detail (default) | Taxonomy | Custom Fields | Marketing Lists. Section 2: Activity Stream (default) | Memberships | Projects (placeholder) | Transactions. Implemented in `ContactRecordLayout.tsx`.
  - **Transactions UI — steps:** E-commerce sidebar: Add sub-item **Transactions** under E-commerce (route `/admin/ecommerce/transactions`). Orders nav removed; gate by e-commerce/feature visibility. E-commerce Transactions page (global): Single filterable table (orders + invoices merged); filters: Type, Status, date range, Sort (date/amount). Actions dropdown: Sync with Stripe, Export (CSV), Import orders, Import from WooCommerce (Stripe/Woo open in dialogs). Reuses order list API + invoices API. Order list API: list supports optional filter by `contact_id` or `customer_email` for contact-scoped view; Type (Checkout vs Subscription vs Invoice) from stripe_checkout_session_id / stripe_invoice_id. Contact detail — Transactions tab: Merged list (orders + invoices) filtered to this contact; filters (type, date range); empty state; "New invoice" with contact pre-filled. Now in Section 2 of Contact Record Layout. Links: Both views link to existing order/invoice detail pages.
  - **CRM: Organizations table and contact–organization many-to-many (before Project Management):** First-class organizations (companies) and true many-to-many with contacts. Schema: `organizations` table; junction `contact_organizations` (contact_id, organization_id, optional role/title, optional is_primary, UNIQUE(contact_id, organization_id)). Custom fields for organizations: reuse **crm_custom_fields** with `entity_type` ('contact' | 'organization'); **crm_organization_custom_field_values** for org values. Deliverables: Migration(s), RPC/API for orgs and junction, org list/detail/edit UI, contact detail "Organizations" section (assign/unassign, role). Done before Project Management work.
  - **Membership (MAG) parent/child hierarchy:** Membership system supports parent/child MAG organization with **infinite levels**. Schema: `parent_id` on `mags`; assign-to-child auto-assigns all ancestors. Parent = grouping + catalog visibility; child = specific access. Assigning to parent does **not** grant child MAGs; assigning to child **does** auto-assign parent. Sub-steps done: migration 144 (parent_id, cycle prevention), RPC `get_mag_ancestor_ids_dynamic`, add-contact-to-MAG flow (insert ancestors), get_mags/get_mag_by_id return parent_id, createMag/updateMag and UI parent dropdown (list + detail), list display with children indented (tree order, alpha). Optional MAG tree UI and remove-from-child behavior remain in planlog.
- **Summary of other session work:** Invoicing design (locked) documented in sessionlog: schema (invoices, invoice_lines), number generator per tenant, shared sequence with orders, flow create→preview→push to Stripe, customer identifiers (email, contact_id, stripe_customer_id). Membership "on/off" deprecated from dedicated toggle: **isMembershipEnabledForCurrentTenant()** now reads from feature gate (slug `memberships`); empty tenant feature list defaults to true. Toggle and PATCH removed from memberships page; info card when disabled. Transactions page: Actions dropdown (Sync with Stripe first, Export, Import, WooCommerce); single filterable table. Memberships list: pagination 25/50/100 per page, "Showing X–Y of Z", prev/next when multiple pages; tree order with children indented.

### 2026-03-13 21:10 CT — 🎉 MVP MILESTONE REACHED 🎉

**We did it.** The Website-CMS has reached its **Minimum Viable Product** goal. Pop the cork — throw confetti! This is the milestone we've been building toward: a WordPress-style CMS for basic business websites, with content, media, galleries, CRM, forms, membership, ecommerce, events, superadmin, feature gating, and form protection. The app is MVP-capable and ready for the next chapter: security review and fork deployment.

- **Context for Next Session:** MVP is **complete**. Celebrate, then carry forward: **(a) Security review** — review the app for security concerns (auth, RLS, input validation, per-feature pass; see planlog → Code Review, Security & Modular Alignment). **(b) Fork deployment checklist** — create and document the checklist for deploying forks (setup script, template domain deployment, integrations test, lock down checklist). Sessionlog has the single focus: "Pre-fork: Security review & fork deployment checklist" (carries over to the new fork, e.g. phpbme / phpbme.com). No critical missing feature blocks "basic business website" MVP.
- **What MVP includes:** Content (blog, pages, taxonomy, shortcodes), Media & Galleries, CRM (contacts, activity, MAGs, lists, forms, submissions), Forms (protection: rate limit, honeypot, reCAPTCHA, time-on-page), Membership (MAG, code generator, member area), Ecommerce (cart, checkout, orders, Stripe, subscriptions, sync, import/export), Events (calendar, participants, resources), Superadmin (tenant sites, feature gate/display, site mode), MFA (TOTP, PII-based enforcement), and more. Backlog items (Anychat/VBout audit, Banners, Carousel) are post-MVP and live in planlog.
- **Session wrap this evening:** Sessionlog cleaned up; backlog confirmed in planlog; single pre-fork focus (security + fork checklist) restructured and ready to carry over. Time to celebrate. 🍾

### 2026-03-13 18:30 CT — Session wrap: MVP scan steps 1–4 complete; MFA policy; build fixes

- **Context for Next Session:** MVP scan findings 1–4 are done (planlog Phase 09 aligned, PRD routes updated, 2FA on Vercel confirmed, protected media via membership at page level). MFA policy enforced: AAL2 required for superadmin, tenant admin, and any staff on PII paths (`/admin/super`, `/admin/crm`, `/admin/settings/users`); optional for other roles. **Next up:** Security review / polish (planlog: Security review, Error handling, Performance). Sessionlog completed steps moved here; remaining: MVP scan step 5 (security), step 6 (backlog confirmation), Fork deployment (Phase 00). Build fixed: tenant-sites detail page now fetches `hiddenSlugs`; ProfileSettingsContent destructures `isTenantAdmin`.
- **MVP scan (completed):** Planlog Phase 09 Ecommerce checked off; PRD route names vs implementation aligned (tenant-sites, route mapping note); 2FA on Vercel working; protected media handled at public page level with membership (MAG).
- **MFA policy:** `requiresAAL2` in `src/lib/auth/mfa.ts` uses role + PII path; middleware passes `isSuperadmin`/`isTenantAdmin`; login redirects superadmin/tenant admin to enroll if no factors; profile Security card shows required vs optional copy; tenant admin cannot remove last factor.
- **Fixes:** `src/app/admin/super/tenant-sites/[id]/page.tsx` — fetch `hiddenSlugs` via `listTenantHiddenFeatureSlugs(id)` and pass to TenantFeaturesManager. `src/components/settings/ProfileSettingsContent.tsx` — add `isTenantAdmin` to props destructuring.

### 2026-03-13 16:59 CT — Form protection MVP complete; sessionlog clean slate

- **Context for Next Session:** Form protection (steps 1–4) complete. **Done:** Stricter rate limit for form submit (10/10min per IP per form); honeypot field `website` (hidden in FormEmbed + PublicFormClient, server returns 200 without persisting if filled); reCAPTCHA (Google, per-tenant) via Settings → General → Captcha tab, GET/PATCH `/api/settings/form-protection`, form config returns siteKey, client widget + server verify; time-on-page reject if submit &lt; 5s; reserved name `website` with validation in FormEditor and hint; warning on Captcha tab that settings were set by super administrator. Step 5 (AI + BYOK spam scoring) remains in planlog Phase 08 as future. Gate system (hide vs ghost) was completed earlier. **Sessionlog:** Clean slate; completed items moved here; remaining backlog items moved to planlog.
- **Form protection (steps 1–4):** Rate limit (form-submit-specific), honeypot, reCAPTCHA per tenant (Captcha tab under General), time-on-page, reserved field name check + UI hint.

### 2026-03-12 CT — Gate step complete; next: Forms captcha

- **Context for Next Session:** Gate system (hide vs ghost) marked complete in sessionlog: Gate + Display toggles, per-tenant hidden slugs, sidebar/route guards, parent-on sync, Omnichat script gating, Marketing landing + Reviews sub-item; principle that gate = admin control and turning off later preserves existing front resources. **Next up:** Forms captcha, rate limiting, and other protections for public forms (see sessionlog — Current focus).

### 2026-03-12 18:00 CT — Session wrap-up: Ecommerce MVT documentation

- **Context for Next Session:** This session added full **Ecommerce** documentation to `docs/mvt.md`: Ecommerce row in at-a-glance table (1.0 Stable), code sitemap updated (admin ecommerce, public shop/members orders-subscriptions, api/ecommerce, api/shop, api/members, api/webhooks/stripe, components/ecommerce, lib/shop), and new per-module section with version, folder structure, data/schema (tables, migrations 131–140), and prerequisites. MVT last updated set to 2026-03-12. **Next up:** See sessionlog — Other/Backlog (gate system hide vs ghost, forms captcha/rate limiting). No code or schema changes this session.

### 2026-03-12 CT — Session summary: Phase 09 Ecommerce complete (30–50); sessionlog trimmed to Other/Backlog

- **Context for Next Session:** Phase 09 Ecommerce through Step 50 is complete. **Done this period:** Subscriptions (30–35: product model, Stripe recurring Price, subscription checkout, subscription/invoice webhooks, admin Subscriptions list, member Subscriptions tab + Stripe Portal, emails). Activity stream messaging (36–41: message schema, type filter, member dashboard stream, client send message, admin see/reply, threading). Stripe & platform sync (43–50): Stripe product drift + bulk import + link to existing (43–44); Stripe → CRM customers (45); Stripe → order history (46); WooCommerce import API + CSV (47); raw/CSV import with field mapping for orders (48); accounting CSV export (49) and format stubs (50). Sessionlog has been cleaned: **Next up** is **Other / Backlog** only (Ecommerce MVT docs, gate system hide vs ghost, forms captcha/rate limiting). See sessionlog for backlog items; planlog for full phase checklist.

### 2026-03-12 CT — Step 49–50: Accounting export (CSV + stubs)

- **Step 49 (export orders for accounting):** Real CSV export. `listOrdersForExport(params, schema)` in `src/lib/shop/orders.ts` (date range `from`/`to`, status, limit). `src/lib/shop/export-orders.ts`: `exportOrdersAsCsv(params, schema)` builds CSV with columns: date, order_id, customer_email, customer_name, line_items, subtotal, discount, total, currency, stripe_checkout_session_id, stripe_invoice_id; resolves contact name via `getContactById`. GET `/api/ecommerce/export/orders?format=csv&from=&to=&status=&limit=` (admin-only) returns CSV with `Content-Disposition: attachment`. Orders page: "Export for accounting (CSV)" button (default params).
- **Step 50 (other formats / automation):** Stub. GET `/api/ecommerce/export/orders?format=iif|qbo` (or any non-csv) returns 501 with JSON `{ error, format, message }`. GET `/api/ecommerce/export/formats` (admin-only) returns `{ available: ["csv"], planned: ["iif", "qbo"], description }`. Full IIF/QBO or scheduled export deferred.

### 2026-03-12 CT — Step 48: Raw/CSV import with field mapping (orders)

- **Step 48 (generic CSV order import):** New lib `src/lib/shop/import-orders-csv.ts`: `importOrdersFromCsvRows(rows, mapping, schema)` — map CSV columns by index to order fields (customer_email, total required; currency, order_date, status, order_number, line_description, line_amount optional). Creates placeholder product "Imported (CSV)" for line items; idempotency by `order_number` (stored in `woocommerce_order_id`). POST `/api/ecommerce/import-orders` (admin-only) accepts `rows` and `mapping`. New page `/admin/ecommerce/orders/import`: CSV paste/upload, column mapping to order fields, preview, import; link from Orders page ("Import orders (CSV)") and from CRM contacts import page. CRM import page: added paste-CSV and link to orders import; contacts mapping unchanged.

### 2026-03-12 CT — Step 47: WooCommerce → customers / order history

- **Step 47 (WooCommerce import):** Migration `140_orders_woocommerce_order_id.sql` adds `woocommerce_order_id` to orders (idempotency). `src/lib/shop/woo-commerce-sync.ts`: WooCommerce REST API client (site URL + consumer key/secret, Basic auth); `syncWooCommerceCustomersToCrm()` fetches customers, finds or creates CRM contacts by `external_ecommerce_id` or email, maps name/address; `syncWooCommerceOrdersToApp()` fetches orders, creates orders + order_items using placeholder content "Imported (WooCommerce)" for line items, idempotent by `woocommerce_order_id`. POST `/api/ecommerce/woo-sync` (admin-only) body: `site_url`, `consumer_key`, `consumer_secret`, optional `sync`: "all" | "customers" | "orders". Orders page: "Import from WooCommerce" card with Store URL, Consumer key/secret, Sync mode, and result summary. OrderRow type extended with `woocommerce_order_id`.

### 2026-03-04 CT — Step 46: Stripe → order history sync

- **Step 46 (Stripe → order history):** Added `src/lib/shop/stripe-orders-sync.ts`: `ensureContactForStripeCustomer(stripeCustomerId, email)` finds or creates CRM contact and sets `external_stripe_id`; `syncStripeInvoiceOrdersToApp(options?, schema?)` lists Stripe paid invoices (optional `createdGte`/`createdLte` unix timestamps and `customerId`), for each ensures customer synced then calls existing `createOrderFromStripeInvoice` (idempotent by `stripe_invoice_id`). POST `/api/ecommerce/stripe-sync-orders` (admin-only) accepts optional body `created_gte`, `created_lte`, `customer_id`. Orders page: "Sync order history from Stripe" card with optional From/To date and Stripe customer ID, and result summary (created/skipped/errors).

### 2026-03-12 CT — Step 45: Stripe → CRM customers sync

- **Step 45 (Stripe → CRM customers):** Added `src/lib/shop/stripe-customers-sync.ts`: `syncStripeCustomersToCrm()` lists all Stripe customers (paginated), for each finds contact by `external_stripe_id` or email; if found updates with `external_stripe_id` and name/address from Stripe; if not found creates contact with email, name, address, `external_stripe_id`, status `new`, source `stripe_sync`. Idempotent by Stripe customer ID. POST `/api/ecommerce/stripe-sync-customers` (admin-only) runs sync and returns `{ created, updated, errors }`. Products page: new card "Sync customers from Stripe" with button and result summary (created/updated counts and errors).

### 2026-03-12 CT — Step 44: Stripe → products bulk import and link to existing

- **Step 44 (Stripe → products bulk import / link):** Added shared `importStripeProductIntoApp` and `bulkImportStripeProductsNotInApp` in `src/lib/shop/stripe-drift.ts`. Single-import API refactored to use shared helper. New POST `/api/ecommerce/stripe-drift/bulk-import` imports all "in Stripe not in app" products in one go. Products page Reconcile card: "Import all" button and inline result (imported count + errors). New POST `/api/ecommerce/products/[id]/link-stripe`: link existing app product to existing Stripe product (and optional Price ID for subscriptions); validates product/price exist in Stripe and price belongs to product. Product edit page: "Link to existing Stripe product" section (Stripe Product ID, optional Price ID when recurring), "Update link" when already linked.

### 2026-03-12 CT — Phase 09 Ecommerce steps 13–29 complete; subscription design (30–35) documented

**Summary:** This session completed Phase 09 Ecommerce steps 13 through 29: cart (tables, API, cookie, cart page, checkout placeholder), orders + order_items (create from cart, status, address snapshot, CRM update), order status/fulfillment (admin + member orders), payment-to-MAG, checkout flow (Stripe Checkout with price_data, success/cancel), coupon flow (validate/redeem, discount on order), Stripe webhook (mark paid, membership, addresses, stock decrement), transactional email and templates (Template content type, Marketing → Templates, placeholders, order confirmation + digital delivery, seed defaults), abandoned-payment visibility (dashboard activity stream, needs-attention filter), order history (admin + members), public routes and guest order lookup, and full digital delivery (downloadable + digital_delivery_links, time-limited download API, links on order detail and email). Also completed steps 26–29: order metrics (dashboard + PWA Status page), RLS/verification, stock validation and decrement, and public pages verification. **Subscription design (steps 30–35):** No code this session; design decisions documented in sessionlog and planlog: order history = all payments (orders for first + renewals), no mixed cart (block with message), account required for all checkout, admin Subscriptions separate tab, three emails (started/renewal/canceled), start/cancel only for MVP, Stripe Customer Portal for manage/cancel.

**Context for Next Session:** Steps 13–29 are complete. Next: implement **subscription steps 30–35** (product model recurring + interval, Stripe recurring Price, subscription checkout, subscription/invoice webhooks, subscriptions table, admin Subscriptions list, member Subscriptions tab + Order history as single list, three emails). Enforce account-required checkout app-wide and mixed-cart block per design. Key files: `docs/sessionlog.md` (design decisions + steps 30–35), `docs/planlog.md` (subscriptions subsection), `src/lib/shop/orders.ts`, `src/app/api/shop/checkout/route.ts`, `src/app/api/webhooks/stripe/route.ts`.

- [x] **13. Cart session:** Table or server-side session storing items (content_id as product ref, qty, price snapshot). API: add to cart, update, get cart. Optional: link cart to contact/user when logged in.
  - [x] **13a.** Migration `131_cart_tables.sql`; lib `src/lib/shop/cart.ts` + cookie; API: GET/POST /api/shop/cart, GET count, POST/PATCH/DELETE items. Link session to user when logged in on add.
  - [x] **13b.** `/shop/cart` page + CartPageClient; AddToCartButton on product page; placeholder `/shop/checkout`.
  - [x] **13c.** "Cart" in PublicHeaderMembersNav → `/shop/cart`.
  - [x] **13d.** PublicHeaderCartIcon in layout; count from API; badge when count > 0; "cart-updated" event to refresh.
- [x] **14. Orders + order_items:** Migration `132_orders_tables.sql` (orders: customer_email, contact_id, user_id, status, total, currency, stripe_checkout_session_id, billing_snapshot, shipping_snapshot, coupon_code, coupon_batch_id, discount_amount; order_items: order_id, content_id, name_snapshot, quantity, unit_price, line_total, shippable). Lib `src/lib/shop/orders.ts`: createOrderFromCart(sessionId, params), getOrderById, getOrderByStripeSessionId, getOrderItems, setOrderStripeSessionId, updateOrderStatus. Checkout (Step 18) will call createOrderFromCart then create Stripe Session.
- [x] **15. Order address snapshot and CRM update:** Address snapshot shape `AddressSnapshot` (name, address, address_line2, city, state, postal_code, country) in `src/lib/shop/orders.ts`; `CreateOrderFromCartParams` already accepts `billing_snapshot` and `shipping_snapshot`. New `src/lib/shop/order-address.ts`: `updateContactFromOrderAddresses(order)` — resolves contact by `order.contact_id` or `getContactByEmail(order.customer_email)`, then updates contact address/shipping fields from snapshots. Checkout (Step 18) should call this after creating the order so CRM stays current.
- [x] **16. Order status and fulfillment (lightweight):** Order **status** values: e.g. `pending`, `paid`, `processing`, `completed`. Digital-only: once payment confirmed and customer receives access, treat as **completed**. Physical/mixed: set **processing** after payment; provide simple way in admin to mark **completed** (or **shipped**). No full warehouse/shipping module.
  - **Admin:** Ecommerce → Orders: table with search (email or order ID), filter by status, “Needs attention” for pending/processing; order detail page with items, addresses, and “Mark as completed” when status is processing.
  - **Client:** Members Area → Orders: list and detail of the member’s orders with status (read-only). Lib: `listOrders`, `getOrdersByUserId`; APIs: GET/PATCH `/api/ecommerce/orders`, GET `/api/members/orders`.
- [x] **17. Payment-to-MAG flow (membership products):** When a customer pays for an order that includes a **membership product** (product linked to a MAG), grant them access. Optionally link product to MAG (e.g. `membership_id` on product); on Stripe webhook after marking order paid, for each membership order item: ensure member record, assign MAG, send access instructions. Core feature of the payment system.
  - **Done:** Migration `133_product_grant_mag_id.sql` adds `grant_mag_id` to product. Product form: "Membership granted on purchase" dropdown (MAGs from `/api/crm/mags`). Lib `src/lib/shop/payment-to-mag.ts`: `processMembershipProductsForOrder(orderId)` — resolves contact from order, for each line with product.grant_mag_id ensures member + addContactToMag(…, "purchase"). Called when admin sets order status to `paid` (PATCH `/api/ecommerce/orders/[id]`). Stripe webhook (Step 20) will call same when marking paid. Send access instructions deferred (e.g. notification/email on MAG assign).
- [x] **18. Checkout flow:** Collect customer email and billing address (from CRM contact or guest). If cart has any **shippable** product, also collect shipping address (or "same as billing"). Create order + order_items from cart; apply coupon app-side (see Checkout coupon flow); create Stripe Checkout Session with **price_data** per line (calculated amounts); redirect to Stripe. Success/cancel return URLs.
  - **Done:** Cart `getCartWithDetails` and GET `/api/shop/cart` return `has_shippable`. POST `/api/shop/checkout`: reads cart cookie; body `customer_email`, `billing_snapshot`, `shipping_snapshot` (optional); creates order via `createOrderFromCart`; validates all items have `stripe_product_id`; creates Stripe Checkout Session (`mode: 'payment'`, `line_items` with `price_data.product` + `unit_amount`); `setOrderStripeSessionId`; returns `{ url }`. Checkout page: form (email, billing, shipping if `has_shippable` with "same as billing" checkbox), submit → redirect to Stripe. Success URL `/shop/success?session_id={CHECKOUT_SESSION_ID}`, cancel URL `/shop/cart`. `/shop/success` thank-you page. Coupon/discount in body supported (Step 19 will add UI and validation).
- [x] **19. Checkout coupon flow:** Checkout UI: optional "Apply code" field. API: validate code (membership → redemption; discount → look up batch/coupon_discounts). Apply discount to cart app-side; compute final amounts; store applied coupon_code and discount_amount on order. Build Stripe Checkout with these calculated amounts (price_data).
  - **Done:** `src/lib/shop/coupon.ts`: `validateDiscountCode(code, subtotal)` (single-use via membership_codes + batch purpose=discount; multi-use via batch code_hash), `redeemDiscountCode(code)` (mark single-use redeemed or increment multi-use use_count). POST `/api/shop/checkout/validate-code`: body `{ code }`, returns `{ valid, discount_amount?, coupon_code?, coupon_batch_id?, error? }`. Checkout API: when `coupon_code` in body, re-validates server-side and uses server discount; builds Stripe line_items with discounted amounts (ratio applied per line so Stripe total = subtotal − discount); after creating order calls `redeemDiscountCode`. Checkout page: "Discount code" card with input + Apply, applied state (code + −$X, Remove), order summary shows Subtotal / Discount / Total; submit includes coupon_code, coupon_batch_id, discount_amount.
- [x] **20. Stripe webhook + return:** On `checkout.session.completed`, mark order paid (set status to `paid`). If order has **no shippable** items, set status to `completed` and send access instructions; if **any shippable** item, set status to `processing`. Optional stock decrement. Return URL: show thank-you / order confirmation; clear cart.
  - **Done:** POST `/api/webhooks/stripe`: raw body + `stripe-signature` verification via `getStripeWebhookSecret()`; on `checkout.session.completed` get order by `stripe_checkout_session_id`, set status `paid`, call `processMembershipProductsForOrder`, `updateContactFromOrderAddresses`, then set status `completed` (no shippable) or `processing` (any shippable). Stock decrement deferred (Step 28). Return/success: `clearCart()` in `src/lib/shop/cart.ts`; DELETE `/api/shop/cart` clears current cart; success page uses `CheckoutSuccessClient` which on mount calls DELETE cart and dispatches `cart-updated`. Send access instructions (email) deferred to Step 21.
- [x] **21. Transactional email and template manager (breakout module):** **Email Template Storage Manager** for all transactional email. Templates with placeholders; use existing SMTP. Order confirmation required; digital delivery email (or thank-you page with link) for digital/virtual orders. Template area under **Marketing → Templates** (role/gate at Marketing). Template content type visible in Settings/Customizer/Content types and in Settings/Taxonomy; not shown in main Content area. *All sub-steps 21a–21h done.*
  - [x] **21a. Core content type Template:** Add "Template" as core content type (not deletable). In Content Types (Settings/Customizer); excluded from main Content list and add-new/filter picker. *Done:* migration `134_template_content_type_and_taxonomy_section.sql` inserts `content_types` (slug `template`, is_core true); `CONTENT_LIST_EXCLUDED_TYPE_SLUGS` includes `template`.
  - [x] **21b. Taxonomy section for Templates:** Create Core Section "Templates" under Taxonomy (not deletable). Template type appears in Settings/Taxonomy so tags/categories can be applied. *Done:* same migration inserts `section_taxonomy_config` (section_name `template`, display_name "Templates", content_type `template`, is_staple true); taxonomy_relationships constraint extended for `template`.
  - [x] **21c. Taxonomy UI labels:** On Taxonomy list page, "Section" → "Content Type Sections"; on Edit Categories and Edit Tags modals, "Apply to these Sections" → "Apply to these Content Type Sections". *Done:* TaxonomySettings.tsx updated (tab, card title, placeholder, section form modal, category/tag modal label, table headers, button text).
  - [x] **21d. Marketing → Templates (list + editor):** Dedicated sub-item "Templates" under Marketing tab. List content where content_type = Template (filter by type); reuse ContentEditorForm (or thin wrapper). Same edit flow as other content; taxonomy assignment for template content. Gate/role at Marketing section.
  - **Done:** Sidebar: "Templates" added to marketingSubNav (href `/admin/crm/templates`, icon FileText). `/admin/crm/templates` list page (server filters getContentListWithTypes by type_slug === 'template'); TemplatesListClient with Add template, table (title, slug, status, updated, edit). New: `/admin/crm/templates/new` (TemplateNewClient with ContentEditorForm, initialContentTypeSlug="template", showPlaceholderPicker). Edit: `/admin/crm/templates/[id]/edit` (TemplateEditClient loads content + types, showPlaceholderPicker when type is template). RichTextEditor: optional `toolbarExtra?(insertAtCursor) => ReactNode`; when provided, renders in toolbar and inserts text at cursor. ContentEditorForm: `showPlaceholderPicker` prop; when true passes toolbarExtra that renders TemplatePlaceholderPicker. TemplatePlaceholderPicker: dropdown of placeholders (customer_name, customer_email, order_id, order_total, items_summary, site_name, access_link); on select inserts `{{key}}` at cursor. New template default body: getTemplateTemplateBody() with example placeholder line and hint text.
- [x] **21e. Template as email (placeholders + send):** Use template content: title = email subject, body (Tiptap → HTML) with placeholders (e.g. `{{customer_name}}`, `{{order_id}}`, `{{order_total}}`, `{{items_summary}}`, `{{site_name}}`, `{{business_name}}`). Document available placeholders per template slug. At send time substitute and use existing SMTP (`sendEmail`). **Template must exist to be used;** if lookup by slug returns no (published) template, do not send from template — callers (21f/21g) use fallback. *Done:* `getContentByTypeAndSlug` accepts `"template"`; `src/lib/email/templates.ts`: getPublishedTemplateBySlug, substitutePlaceholders, tiptapBodyToHtml, renderTemplate, sendTemplateEmail. Placeholders documented in JSDoc. Exported from `@/lib/email`.
- [x] **21f. Order confirmation email:** When order is marked paid (Stripe webhook or admin), send order confirmation email to customer. Look up template by slug (e.g. `order-confirmation`); if found and published, render with order/contact context and send via SMTP. **Fallback if no template:** send a minimal built-in email (e.g. subject "Order confirmed", body: order ID, total, link to view order) so the customer always receives a confirmation; log that custom template was not used. *Done:* `src/lib/shop/order-email.ts`: buildOrderTemplateContext, sendOrderConfirmationEmail (template or fallback). Called from Stripe webhook and PATCH `/api/ecommerce/orders/[id]` when status set to `paid`.
- [x] **21g. Digital delivery / access instructions:** When order status set to `completed` (no shippable), send digital delivery email (or ensure thank-you page / order detail shows access links). Look up template by slug (e.g. `digital-delivery`); if found, use it. **Fallback if no template:** send minimal email with link to order/member area, or rely on thank-you page / order detail for access; log if custom template missing. *Done:* sendDigitalDeliveryEmail in order-email.ts; called from webhook when nextStatus === `completed` and from PATCH when status set to `completed` and order has no shippable items.
  - [x] **21h. Pre-populate default templates:** Seed default template content rows so triggers (21f/21g) have templates to use and tenants can edit. *Done:* migration `135_seed_default_email_templates.sql` inserts two content rows (type Template): **Order confirmation** (slug `order-confirmation`) and **Digital delivery** (slug `digital-delivery`) with simple body and placeholders. ON CONFLICT DO UPDATE so re-run is idempotent. Tenant-site-setup-checklist updated: migration 135 listed under Additional migrations; **Transactional email templates** note under Ecommerce/Stripe section (run 135 to pre-populate; edit in Marketing → Templates).
- [x] **22. Abandoned / failed payment visibility:** Fallback so operators see abandoned/failed transactions: e.g. note in **customer activity stream**, status or tag on **CRM contact** ("Abandoned checkout" / "Payment incomplete"). Pending orders in list with status `pending`; optionally highlight or filter "needs attention." *Done:* Dashboard activity stream includes orders (type "order"); pending orders show as "Abandoned checkout / Payment incomplete" and link to admin order detail. Activity filter option "Orders / Abandoned checkout". Admin orders list: "Needs attention" filter (pending + processing). Orders query resilient if `orders` table missing.
- [x] **23. Order history:** My orders page (list by user or email); order detail page. Admin: orders list and detail; filter by status; for orders in `processing`, allow staff to mark as `completed` (or `shipped`) when fulfilled. *Done:* Admin Ecommerce → Orders: list with status filter (incl. Needs attention), search, order detail with "Mark as completed" when processing. Members Area → Orders: list and detail via `/members/orders` and `/members/orders/[id]`; APIs GET `/api/members/orders`, GET `/api/members/orders/[id]`.
- [x] **24. Public routes and customer account pages:** Public shop routes (e.g. `/shop`, `/shop/[slug]`, `/shop/cart`, `/shop/checkout`, `/shop/success`). **Order history:** Logged-in: "My orders" under member area (e.g. `/members/orders`); order detail with items, status, totals, digital **access/download links**. **Guests:** order lookup by email + order number or secure link from confirmation email. Optional: account hub linking to Orders, Profile, saved addresses. *Done:* Shop routes exist. Members: Orders in nav → `/members/orders` and detail. Guest order lookup: `/shop/order-lookup` (form: email + order ID); GET `/api/shop/order-lookup?email=...&order_id=...` returns order + items when email matches. Success page links to "Look up your order" for guests.
- [x] **25. Digital delivery (customer-facing):** On order detail page and in order confirmation/digital-delivery email, show **access links** for digital/virtual items (join link, download URL, course access). Optional: "My downloads" or "Access your purchases" page. See **Digital delivery (downloadable) products** below for full design (real URLs on product, time-limited links, multiple links per product). *Done:* 25a–25e implemented.

**Digital delivery (downloadable) products — product type multi-select + time-limited links**

Product delivery type is **multi-select**: a product can be **Shippable**, **Downloadable**, or **both** (e.g. CD/DVD, book with accompanying PDF). Add `downloadable` (or `has_digital_delivery`) alongside existing `shippable`; both can be true. Checkout still collects shipping address when *any* item is shippable; order detail and email show download links when *any* item is downloadable.

- [x] **25a. Product delivery type multi-select:** Add `downloadable` boolean to product (default false). Product can be shippable only, downloadable only, or both. Migration; update product form to show both checkboxes (Shippable, Downloadable). Cart/order/checkout: `has_shippable` unchanged; add `has_downloadable` where needed. Order item or product flags: store or derive both so order detail can show ship vs download per line. *Done:* Migration `136_product_downloadable_and_digital_links.sql` adds `downloadable` to product and `downloadable` to order_items. Product form: Shippable + Downloadable checkboxes. Cart `getCartWithDetails` and API return `has_downloadable`. `createOrderFromCart` sets `downloadable` on each order_item from product.
- [x] **25b. Schema: store real download URL(s) per product:** Store the **real** URL(s) for downloadable products (never sent to customer as-is). Option A: JSONB on product e.g. `digital_delivery_links` = `[{ "label": "Part 1", "url": "https://..." }, { "label": "Part 2", "url": "https://..." }]`. Option B: table `product_download_links` (product_id, label, url, sort_order). Support **multiple links per product** (e.g. Part 1, Part 2; or book PDF + audio). Migration + types. *Done:* Migration 136 adds `digital_delivery_links` JSONB on product. Types in ProductRow and form state.
- [x] **25c. Admin: Digital delivery links UI:** On product create/edit, when product is **downloadable** (checkbox), show "Digital delivery links" section: list of rows (Label + Real URL), add/remove, save to JSONB or product_download_links. Label examples: "Part 1", "Part 2", "PDF", "Audio". *Done:* ProductDetailsForm shows "Digital delivery links" when downloadable: Label + URL inputs, Add link / Remove per row; saved as `digital_delivery_links` on product.
- [x] **25d. Time-limited download links:** Do not expose real URL to customer. When showing "Download" on order detail or in email: generate a **short-lived** link to our app (e.g. `GET /api/shop/download?token=...` or `/members/orders/[id]/download/[itemId]/[linkIndex]?expires=...`). Token/params encode: order id, order item (or product + order), which link index, expiry (e.g. 24–72 hours). Endpoint: validate order is paid/completed, current user owns order (or token is one-time), not expired; then **redirect** to the real URL (or proxy). Prevents link sharing after expiry. *Done:* `src/lib/shop/download-token.ts`: generateDownloadToken / verifyDownloadToken (HMAC-signed payload: orderId, orderItemId, linkIndex, exp; 72h default). GET `/api/shop/download?token=...`: verify token, validate order status (paid/completed/processing), item downloadable, then redirect to real URL. Secret: SHOP_DOWNLOAD_TOKEN_SECRET or CREDENTIALS_ENCRYPTION_KEY.
- [x] **25e. Customer-facing: download links on order detail and email:** Order detail (and digital delivery email): for each order line that is downloadable, show one "Download" (or label) per link, each pointing to the time-limited URL. Optional: "My downloads" page aggregating digital items across orders with time-limited links. *Done:* getOrderDownloadLinks() builds time-limited URLs. Members order API and guest order-lookup API return `download_links`. MembersOrderDetailClient and GuestOrderLookupClient show "Downloads" card with links. Template context includes `download_links` (formatted text); placeholder `{{download_links}}` in TemplatePlaceholderPicker. Order confirmation/digital-delivery emails can use it.

- [x] **26. Order metrics (admin dashboard and PWA):** Order metrics on admin dashboard (orders today, in processing, recent/revenue). Order metrics in PWA helper app. API or RPC for order counts by status (and optional date range). *Done:* `getOrderMetrics()` in `src/lib/shop/orders.ts` returns counts by status, todayCount, processingCount, revenueCompleted. GET `/api/ecommerce/orders/metrics` (admin). Dashboard passes metrics to `OrdersMetricCard`; Status (PWA) page shows Orders card with today/need attention/completed when ecommerce present.
- [x] **27. Ecommerce nav and RLS:** Ecommerce sidebar nav and routes follow existing **role and gate system**. RLS on all new tables (product, orders, order_items, cart, coupon_discounts); tenant isolation; no card data stored in app (Stripe only; no PCI). *Done:* Verified. Product: RLS + authenticated policy. Orders/order_items/cart_sessions/cart_items: RLS + service_role only. Discounts via membership_code_batches (existing). Tenant isolation via schema. Ecommerce nav gated by featureSlug "content".
- [x] **28. Stock (optional, simple):** When product has `stock_quantity` set, optionally validate at add-to-cart or checkout and block if out of stock; decrement on successful payment. Off by default for new products (null = no tracking). *Done:* addCartItem and updateCartItemQuantity validate (cart qty + requested) <= stock_quantity. Checkout validates each line before createOrderFromCart. `decrementStockForOrder()` called in Stripe webhook and admin PATCH order→paid.
- [x] **29. Public pages:** Shop/catalog (list products), product page (single product, add to cart), cart page, checkout page (pre-redirect), success/confirmation, order history (and guest order lookup). Customer-facing pages covered by "Public routes and customer account pages" and "Digital delivery" above. *Done:* Verified. `/shop`, `/shop/[slug]`, `/shop/cart`, `/shop/checkout`, `/shop/success`, `/shop/order-lookup`; members order history at `/members/orders` and `/members/orders/[id]`.

### 2026-03-04 (evening) CT — Phase 09 Ecommerce steps 7–12, subscriptions in MVP scope

**Summary:** Phase 09 Ecommerce steps 7, 8, 9, 9a, 10, 11, and 12 are complete. **Steps 7–9, 9a:** Product lib + shop API (getShopProductList, getShopProductBySlug, getShopViewer, canViewProduct; GET /api/shop/products, GET /api/shop/products/[slug]); content list and “New content” picker exclude product type (CONTENT_LIST_EXCLUDED_TYPE_SLUGS); Stripe config (lib/stripe/config.ts, env keys + webhook secret); tenant-site-setup-checklist updated with Stripe keys and Workbench webhook setup. **Step 10–11:** Admin product UI now includes a “Create Stripe Product from CMS Product” button on the product edit page; new API `POST /api/ecommerce/products/[id]/sync-stripe` (Step 11) loads content + product, resolves featured and gallery image URLs, creates a Stripe Product (no Price), and saves `stripe_product_id` to the product row. `updateProductRow` accepts optional `stripe_product_id`. **Step 12 (Eligibility check):** Added `isProductEligibleForPurchase()` and `getShopProductBySlugForDisplay()` in products lib; GET `/api/shop/products/[slug]` now returns `{ product, eligible }`. Public shop pages: `/shop` (catalog, eligible products only) and `/shop/[slug]` (product detail with “Not yet available for purchase” when not eligible, “Add to cart (coming soon)” when eligible). Shop link added to public header. **Docs:** Subscriptions are in MVP scope (sessionlog): web design and hosting as primary services; subscription development steps 30–35 added (product model, Stripe recurring Price, checkout subscription mode, subscription/invoice webhooks, admin and customer-facing subscription UIs). Tenant checklist and env template reference Stripe Workbench for webhook setup.

**Context for Next Session:** Steps 7–12 are complete. Next: **Step 13** (Cart session — table or server-side session, add/update/get cart API). Then steps 14–29 (orders, checkout, webhook, email, order history, etc.), followed by subscription steps 30–35. Key files: `src/lib/supabase/products.ts`, `src/app/api/ecommerce/products/[id]/sync-stripe/route.ts`, `src/app/(public)/shop/page.tsx`, `src/app/(public)/shop/[slug]/page.tsx`, `docs/sessionlog.md`.

- [x] **7. Product lib + RPC/API:** Shop list/detail APIs, getShopViewer, canViewProduct, visibility enforcement (access_level + visibility_mag_ids).
- [x] **8. Content list excludes products:** Main Content list and “New content” picker filter out type `product`; products managed under Ecommerce only.
- [x] **9. Stripe config:** Env-based Stripe secret/publishable key and webhook secret; getStripeClient(); docs for dashboard/Workbench webhook.
- [x] **9a. Ecommerce in tenant setup checklist:** Stripe keys and webhook (Workbench) added to tenant-site-setup-checklist; env template stripe.env.
- [x] **10. Admin product UI:** Full product form + “Create Stripe Product from CMS Product” button.
- [x] **11. Create Stripe Product from CMS routine:** Sync API creates Stripe Product, saves `stripe_product_id`; button in product edit UI.
- [x] **12. Eligibility check:** Shop/catalog and product detail use eligibility; product detail shows “Not yet available for purchase” or add-to-cart; public `/shop` and `/shop/[slug]` pages; subscriptions in MVP scope and steps 30–35 added to sessionlog.

---

### 2026-03-11 17:00 CT — Phase 09 Ecommerce steps 1–6, product editor refinements

**Summary:** Phase 09 Ecommerce foundation steps 1–6 are complete: CRM billing/shipping addresses, Product content type and taxonomy, related `product` table, code/batch schema for coupons, and Ecommerce nav with Products list and dedicated product create/edit pages. Product editor refinements this session: (1) **Product visibility MAGs** — "Who can see this product" is now independent of "Membership to grant on purchase." Migration 130 adds `visibility_mag_ids` (uuid[]) to `product`; shop can show a product to one or more memberships (e.g. parent org) while granting a different membership on purchase. (2) **Membership picker for scale** — Replaced checkbox list with `AutoSuggestMulti`: search bar with autocomplete and selected memberships as removable badges (X), so 25–50–100+ memberships remain usable. (3) **Content/product edit UX** — Featured image for all content types (picker, 125px preview, clear); "Use for AI Agent Training" moved to bottom of Status card; product Status card shows created/updated dates; Membership tab copy clarified ("Who can view this product" / "Which membership(s) can see this product"). Other: core content types rendering and App Version Number (dashboard from mvt.md) marked complete per sessionlog.

**Context for Next Session:** Step 6 (Ecommerce nav + Products list) is complete. Next in Phase 09: **Step 7** (Product lib + RPC/API for shop/catalog and product detail). Run migration `130_product_visibility_mag_ids.sql` in Supabase SQL Editor if not yet applied. Sessionlog has remaining Phase 09 steps 7–29 and backlog (Banners, Carousel shortcode).

- [x] **1. CRM addresses (billing + shipping):** Treat existing `crm_contacts` address fields as **billing**. Add shipping columns: `shipping_address`, `shipping_city`, `shipping_state`, `shipping_postal_code`, `shipping_country`. Use shipping for delivery when any shipping field is set; otherwise use billing for both. Migration; update `CrmContact` type and RPCs; contact detail/edit UI: Billing address (existing) + Shipping address (optional, "if different").
- [x] **2. Product content type:** Add "Product" to `content_types` (slug e.g. `product`) as a **core default** (can't delete). Show it in **Settings → Customizer → Content types** and in **Settings → Taxonomy** so taxonomy can be applied to products. Hide it only from the main **Content list** view (products managed under Ecommerce → Products). Products are content rows with this type; use taxonomy for product categories/tags.
- [x] **3. Core taxonomy sections not deletable:** In Settings → Taxonomy, core sections (for core content types) must not be deletable. Identify core/system sections (e.g. by content_type or flag) and disable or hide Delete for them in the taxonomy UI.
- [x] **4. Related `product` table:** Migration (tenant schema). Columns: `content_id` (UUID FK → content.id, UNIQUE, NOT NULL), `price` (numeric/decimal; used at checkout, not pushed to Stripe), `currency` (text, default USD), `stripe_product_id` (text nullable; Stripe Product ID only; no Stripe Price), `sku` (text nullable), `stock_quantity` (integer nullable; null = no stock tracking; off by default), `gallery_id` (UUID nullable FK → galleries), `taxable` (boolean, default true), `shippable` (boolean, default false), `available_for_purchase` (boolean, default true). RLS; one row per product content. Product image gallery = featured_image_id (content) + gallery_id (product) → gallery_items for extra images.
- [x] **5. Code/batch schema for ecommerce:** Migration: add `use_type` to `membership_code_batches`; add discount columns or `coupon_discounts` table. Update batch create/edit UI and code generator for use_type and discount fields when use_type = discount. (Needed before checkout can apply coupons.)
- [x] **6. Ecommerce nav + Products list:** Add **Ecommerce** top-level sidebar nav; under it, **Products** (and later Orders). Products list shows only content where type = Product (join to `product` table). Single place for product management. Reuse existing components (content table, shortcodes, galleries, media).

- [x] **Proper rendering for core content types** - Like FAQ, Accordion, Quotes. Some CSS styling may be required. Is this a front end Dev feature and not needed for basic content entry?
- [x]**App Version Number** — Add app version to the admin dashboard; derive from mvt.md document.


---

### 2026-03-11 CT — Sessionlog cleanup: completed items removed, backlog lean

**Context for Next Session:** (See previous entry for full session context.) Sessionlog cleaned per workflow: completed Phase 2b block, all completed Other/Backlog items (Media Copy Shortcode, Share-intent, Terms and Policys, CRM Sorting, Form Submission List, Form Data Export, Code Generator Module), and the Code Generator Workflow section (scenarios + CG.0–CG.8 steps) removed. Backlog now lists only: Proper rendering for core content types, App Version Number, Banners. "Where we are" and "Next up" updated to reflect current state.

**Changes:**
- **Sessionlog:** Removed completed Phase 2b checklist; removed seven completed backlog lines and entire Code Generator Workflow section; kept only three unchecked backlog items. Shortcode "Done" summary updated to include Phase 2b.

---

### 2026-03-11 CT — Session wrap-up: Code Generator module complete, form submissions export, codes search

**Context for Next Session:** Code Generator module is complete (CG.0–CG.8). Batches list is a table; create-batch modal has scrollable body. Unified codes table (single-use + multi-use redemption rows) with batch and status filters, simple search bar (max 20 chars, client-side filter on code), Export CSV (filtered view), and record count. Manual "Mark used" for single-use codes on batch detail page (POST `/api/admin/membership-codes/codes/[id]/mark-used`). Redeem API and `redeemCode()` return `batch_id` for workflows (CG.1). Generator uses per-run duplicate prevention only (no DB pre-load). Form submissions list has date-range presets (including "All dates"), pagination, and CSV export with field picker. Codes block button row aligned (items-end, h-9). **Deferred:** MAG/membership column in codes table (user opted to hold off). **Next up:** See sessionlog — core content types rendering, App Version Number, Banners, or other backlog. Planlog Phase 9A updated with Code Generator module summary.

**Changes:**
- **Code Generator:** Batches table (Name, MAG, Type, Codes/Usage, Expires, Actions). Create modal scrollable. Unified codes API `GET /api/admin/membership-codes/codes?batchId=&status=&limit=`, Codes card with batch/status filters, search (max 20 chars), Export CSV, `codesFiltered` useMemo. Mark-used API and "Mark used" button on batch Explore page. `RedeemResult.batchId` and redeem API response `batch_id`. Duplicate prevention in generator: per-run only, comment in code.
- **Form submissions:** Date presets (All dates, 24h, 7d, 30d, custom), pagination (25/50/100), URL sync. Export CSV: GET export-fields, POST export with form + date range + selected fields; Export button and modal with form and field picker. "X records in range" moved to footer center.
- **Docs:** Sessionlog Code Generator Module marked complete; planlog Phase 9A updated.

**Key files:** `src/app/admin/crm/memberships/code-generator/CodeGeneratorClient.tsx`, `src/app/api/admin/membership-codes/codes/route.ts`, `src/app/api/admin/membership-codes/codes/[id]/mark-used/route.ts`, `src/lib/mags/code-generator.ts`, `src/app/api/members/redeem-code/route.ts`, `src/app/admin/crm/forms/submissions/SubmissionsListClient.tsx`, `docs/sessionlog.md`, `docs/planlog.md`, `docs/changelog.md`.

---

### 2026-03-10 18:30 CT — Session cleanup: Phase 2 Layout complete, step 15 dropped, sessionlog thinned; rules updated

**Context for Next Session:** Shortcode Phase 1, 1a, and Phase 2 (Layout wizard) are complete. Phase 2 uses the composite shortcode `[[layout|widths|height|col1{{COL}}col2...]]`; paired columns/col approach was superseded and removed from sessionlog. Step 15 (prompt/description per picker item) was dropped as not needed. Sessionlog was cleaned: completed Phase 1, 1a, and Phase 2 items were moved to this changelog entry and removed from sessionlog so the log stays thin. Cursor rules: `sessions.mdc` and `coding.mdc` updated so session end workflow is explicit (review chat, mark off sessionlog, add dated changelog entry with Context for Next Session, remove completed items from sessionlog, sync planlog). **Next up:** Phase 2b (form display routine, embed code, Form in picker and Layout wizard), then Phase 3 (Quote, FAQ, Accordion). See sessionlog.

**Changes:**
- **Sessionlog:** Phase 2 step 15 (prompt/description per item) removed — not needed. Phase 2 marked complete (14, 16, 17, 18, 19). Completed Phase 1, Phase 1a, and Phase 2 blocks removed from sessionlog; only Phase 2b, Phase 3, Other/Backlog, Paused remain. Design note updated to composite layout shortcode (no paired columns/col).
- **Cursor rules:** `sessions.mdc` — Ending a work session steps clarified (review chat, mark off sessionlog, add changelog entry with current date/time, move completed work into entry, Context for Next Session, remove completed from sessionlog). `coding.mdc` — Checklist explicitly requires reading `sessions.mdc` for session start/end workflow.

**Key files:** `docs/sessionlog.md`, `docs/changelog.md`, `.cursor/rules/sessions.mdc`, `.cursor/rules/coding.mdc`.

---

### 2026-03-04 16:30 CT — Session wrap-up: Author display from profile, Phase 2b form steps in sessionlog

**Context for Next Session:** Author display now uses the profile "Display name" (Settings → My Profile) when available: (1) Authors API appends current superadmin with `getProfileByUserId` so their profile display name appears in the author dropdown; (2) `getContentAuthorDisplayName` and `getCommentAuthorDisplayName` resolve auth users via new `getAuthUserDisplayName()` helper that checks profile first, then user_metadata (full_name, name, display_name), then email. So updating Display name in My Profile is reflected in the author picker and in post/comment author display. **Sessionlog:** Phase 2b steps added (no coding): 2b.1 Form display routine (inline render for `[[form:id]]`), 2b.2 Embed code in form manager, 2b.3 Form in main shortcode picker, 2b.4 Form in Layout wizard column options; form manager styling deferred. **Next up:** Continue shortcode Phase 2 (Layout wizard) or start Phase 2b (form display + embed + form in picker and Layout). See sessionlog.

**Changes:**
- **Author from profile:** `src/lib/blog-comments/author-name.ts` — `getAuthUserDisplayName()` uses `getProfileByUserId()` first, then Auth user_metadata; `getCommentAuthorDisplayName` and `getContentAuthorDisplayName` use it for auth-user resolution. `src/app/api/admin/authors/route.ts` — when appending superadmin to authors list, use `getProfileByUserId(user.id)` for display_name (profile → user.display_name → null).
- **Sessionlog:** Phase 2b — Form display, embed code, and shortcode integration (CRM): steps 2b.1–2b.4 and "Later" styling item added.

**Key files:** `src/lib/blog-comments/author-name.ts`, `src/app/api/admin/authors/route.ts`, `src/lib/supabase/profiles.ts`, `docs/sessionlog.md`, `docs/changelog.md`.

---

### 2026-03-09 CT — Session wrap-up: Shortcode Phase 1 complete, alignment, media picker, image size params

**Context for Next Session:** Phase 1 shortcodes are complete. Alignment is preserved when rendering: parser reads `text-align` from the containing block before each shortcode; ContentWithGalleries wraps shortcode output in a div with that alignment. Media/image shortcode picker: search (name, Slug/UID, taxonomy/tags via API), scrollable list with max-height, list/grid view toggle; API `/api/shortcodes/media-list` supports `?search=` and returns `uid` (slug); taxonomy search via `getMediaIdsWithTermMatching`. Media library image detail: Slug/UID shown in the blue metadata block (top right) and in Edit Metadata / read-only summary. Phase 1a (styling): Option A decided—params at shortcode only. Media shortcode supports `size` (positional or named: `[[media:id|medium]]`, `[[media:id|size=large]]`); renderer uses Tailwind size classes (small/medium/large/full), default medium; after picking an image, "Image size" dialog lets user choose size before inserting. **Next up:** Sessionlog Phase 2 (paired shortcodes: columns, container, flexbox); optional 9a.3 (align param on media shortcode). Other: Media Copy Shortcode, CRM sorting, Form submission list.

**Changes:**
- **Alignment:** `parse.ts` — `getAlignmentBeforeIndex()`, optional `alignment` on all shortcode parts; `ContentWithGalleries` — `wrapAlignment()` so shortcode output respects paragraph text-align.
- **Media list API:** `GET /api/shortcodes/media-list?search=` — uses `searchMedia()` and `getMediaIdsWithTermMatching()`; returns `id`, `name`, `uid` (slug), `thumbnailUrl`. Taxonomy helper `getMediaIdsWithTermMatching()` in `taxonomy.ts`.
- **Media picker:** `MediaPickerModal` — search input (debounced), list/grid toggle, scrollable area; displays uid in list view.
- **Media library:** `ImagePreviewModal` — Slug/UID in blue block (top right) and in metadata labels (Edit + summary).
- **Media shortcode size:** `parse.ts` — media shortcode parses positional or named `size`; `MediaShortcodeRender` — `MEDIA_SIZE_OPTIONS`, Tailwind size classes, default medium; `ShortcodePickerModal` — after image select, "Image size" dialog with Size dropdown, inserts `[[media:id|size]]`.

**Key files:** `src/lib/shortcodes/parse.ts`, `src/components/editor/ContentWithGalleries.tsx`, `src/app/api/shortcodes/media-list/route.ts`, `src/lib/supabase/taxonomy.ts`, `src/components/editor/MediaPickerModal.tsx`, `src/components/media/ImagePreviewModal.tsx`, `src/components/editor/MediaShortcodeRender.tsx`, `src/components/editor/ShortcodePickerModal.tsx`, `docs/sessionlog.md`, `docs/changelog.md`, `docs/planlog.md`.

---

### 2026-03-09 CT — Session wrap-up: Shortcode MVP planning, sessionlog cleanup, Next up = Shortcode implementation

**Context for Next Session:** This session was planning and discussion only (no shortcode code changes). Shortcode MVP scope agreed: universal shortcode picker (one icon, replace dedicated Image/Gallery toolbar buttons); public shared library table (`shortcode_types`) so new types are available to all tenant sites; parse/render logic stays in app code. Gallery will be repurposed as one shortcode type (picker by id/name). Carousel/rotator = existing gallery + slider display style (no new table). Quote carousel: block-with-rotator option and/or quote shortcode (quotes entity) for reuse. Alignment: Tiptap paragraph alignment applies to shortcode-in-paragraph; renderer should preserve wrapper for front end. Columns/Container/Flexbox = paired shortcodes (open/close); accordion = block or shortcode later. **Next up:** See sessionlog — Shortcode implementation Phase 1 (library table, universal picker, Gallery + Media + simple blocks + Button + Form + Snippet), Phase 2 (paired layout: Columns, Container, Flexbox), Phase 3 (Quotes, FAQ, Accordion entities/pickers). Other backlog: Media Copy Shortcode, CRM sorting, Form submission list, App version number.

**Changes:**
- **Changelog:** This entry.
- **Sessionlog:** Cleaned; completed Signup pipeline, Blog (RSS, SEO, Social Share, comments), GPUM Account settings removed from active list. New **Next up** section: **Shortcode implementation** with detailed steps for Phase 1 (public `shortcode_types` table, universal picker UI, repurpose Gallery, Media/Image, Separator, Section break, Spacer, Clear, Button, Form, Snippet), Phase 2 (paired shortcode parser and Columns, Container, Flexbox), Phase 3 (Quotes, FAQ, Accordion). Other/Backlog: Media Copy Shortcode, Terms and Policys, CRM Sorting, Form Submission List, App Version Number.
- **Planlog:** Shortcode Library MVP added under Phase 06 / Content; reference sessionlog for phased steps.

**Key files:** `docs/sessionlog.md`, `docs/changelog.md`, `docs/planlog.md`.

---

### 2026-03-07 CT — Session wrap-up: Drop-in ComposeEmail, SMTP branding MVP, contact UX, GPUM steps in sessionlog

**Context for Next Session:** Contact outbound email uses drop-in `ComposeEmail` (subject, body, attachments); send-email API and activity log support attachments. SMTP branding MVP: from-name fallback to site name when unset; minimal HTML wrapper for text-only sends. Contact: delete button on edit page only; top row order Status, Merge, Edit, Compose email. #DNC rule rephrased in coding.mdc. GPUM (member area) steps added to sessionlog: dashboard and My Profile in place; Account settings (/members/account) remains placeholder. **Next up:** See sessionlog — GPUM Account settings, blog RSS feed, blog comments, Media Copy Shortcode, CRM/forms/buttons.

**Changes:**
- **ComposeEmail:** New drop-in component `src/components/email/ComposeEmail.tsx` (to, toLabel, defaultSubject/Body, onSubmit, onSent, children as trigger, allowAttachments, maxAttachmentSize, maxAttachments). Dialog-based modal; optional attachments (base64). Contact page uses it via refactored ContactComposeEmailButton.
- **Send email + API:** `sendEmail()` and POST `/api/crm/contacts/[id]/send-email` accept attachments (filename + base64); activity note includes attachment count. `EmailAttachment` type in send.ts.
- **SMTP branding (step 6 MVP):** In send.ts, when from has no display name, fallback to `getSiteMetadata().name`. When only text provided, auto-wrap in minimal HTML (`<p style="white-space: pre-wrap;">`); escapeHtml helper.
- **Contact UX:** Delete button removed from contact detail page; added to contact edit page header. Contact detail top row order: Status, Merge, Edit, Compose email.
- **#DNC rule:** coding.mdc — when user includes #DNC, discussion only; no code/file/terminal unless user later explicitly asks to implement.
- **Sessionlog:** Outbound SMTP steps 4–7 and GPUM dashboard + My Profile marked complete; GPUM section added with remaining GPUM Account settings. Planlog: Completed/Reference updated; Phase 09 GPUM member area (public) checked.
- **Step 7:** Sessionlog step 7 (contact outbound email) checked complete.

**Key files:** `src/components/email/ComposeEmail.tsx`, `src/app/admin/crm/contacts/[id]/ContactComposeEmailButton.tsx`, `src/lib/email/send.ts`, `src/app/api/crm/contacts/[id]/send-email/route.ts`, `src/app/admin/crm/contacts/[id]/page.tsx`, `src/app/admin/crm/contacts/[id]/edit/page.tsx`, `.cursor/rules/coding.mdc`, `docs/sessionlog.md`, `docs/planlog.md`.

---

### 2026-03-05 (afternoon) CT Ã¢â‚¬â€ Session wrap-up: Notifications, SMTP, PWA Status app, blog template, tenant checklist, author

**Context for Next Session:** Notifications hub (Admin Ã¢â€ â€™ Settings Ã¢â€ â€™ Notifications), outbound SMTP (config, encryption, send), and PWA Status app (/status, manifest, push, VAPID) are in place. Form submit triggers notifyOnFormSubmitted; stub entry points exist for contact_joins_membership and member_signed_up. Blog: pagination, categories/tags on post, category/tag archives, author dropdown and display. Tenant setup checklist consolidated; env templates archived. **Next up:** See sessionlog Ã¢â‚¬â€ blog RSS feed, blog comments, SMTP contact-activity logging, Media Copy Shortcode, CRM/forms/buttons.


**Changes:**
- **Notifications settings:** New Admin â†’ Settings â†’ Notifications page (route, nav, feature gate `notifications`). NotificationsSettingsContent: action keys/labels, preferences API (GET/PATCH `/api/settings/notifications/preferences`), SMTP config block, link to Status app. Reference doc `docs/reference/notification-events-and-recipients.md` (form_submitted, contact_joins_membership, member_signed_up; recipients, wiring, adding events).
- **Outbound SMTP:** Tenant settings key `smtp` stores host, port, username, encrypted password (AES-256-CBC), from address, notification_recipients. `src/lib/email/`: smtp-config (get/set, encryption via env), send (nodemailer, sendEmail). Admin General Settings and Superadmin site settings: SMTP form (SmtpConfigForm), test endpoint `/api/settings/notifications/smtp/test`. Form submit API calls `notifyOnFormSubmitted` (email + PWA per preferences); stubs: `notifyOnContactJoinsMembership`, `notifyOnMemberSignedUp`.
- **PWA Status app:** Admin-only `/status` page: site stats (contacts, form submissions, upcoming events, recent activity), push-subscribe UI. Layout: dynamic, manifest link, viewport. Dynamic manifest `/manifest.webmanifest` (name, short_name, icons from PWA settings). PWA settings: `src/lib/pwa/settings.ts`, getPwaSettings/setPwaSettings/getPwaIconUrl; GET/PATCH `/api/settings/pwa`; General Settings card for PWA/install. Push: migration 116 `push_subscriptions` (tenant schema); save subscription POST `/api/settings/pwa/push-subscription`; VAPID public GET `/api/settings/pwa/vapid-public`; `src/lib/pwa/send-push.ts` (web-push), sendPushToSubscription; `public/sw.js` (push, notificationclick); StatusPushSubscribe component. Middleware: `/status` protected. Root layout: manifest link.
- **Tenant setup checklist:** `docs/tenant-site-setup-checklist.md` â€” single living doc for new tenant/fork setup. Merged content from archived zzz-CLIENT_SETUP_CHECKLIST, env-encryption-key-template, env-vapid-keys-template (env vars, VAPID generation, Supabase migrations list, Vercel env section, superadmin user, verification, troubleshooting). Templates archived under `docs/archived/`.
- **Blog template:** Pagination: migration 117 (get_published_posts_dynamic offset, get_published_posts_count_dynamic); getPublishedPosts(limit, offset), getPublishedPostsCount(); `/blog` list with `?page=` and Prev/Next. Categories/tags on single post: getTaxonomyTermsForContentDisplay(post.id, "post"); links to `/blog/category/[slug]` and `/blog/tag/[slug]`. Archive pages: getTermBySlugAndType, getPublishedPostsByTermId, getPublishedPostsCountByTermId; same list + pagination + access filtering as main blog. Author: GET `/api/admin/authors` (site-assigned users); Content Status block Author dropdown; author_id (tenant_user id) in insertContent/updateContent; public `/blog/[slug]` shows "By {display_name or email}" via getTenantUserById.
- **Build fix:** Status page display name: use `user?.display_name` (AuthUser) instead of `user?.user_metadata?.display_name` to fix deployment type error.
**Key files:** `src/app/admin/settings/notifications/`, `src/app/api/settings/notifications/`, `src/app/api/settings/pwa/`, `src/app/status/`, `src/app/manifest.webmanifest/route.ts`, `src/lib/email/`, `src/lib/notifications/`, `src/lib/pwa/`, `src/components/settings/NotificationsSettingsContent.tsx`, `src/components/settings/SmtpConfigForm.tsx`, `src/components/pwa/StatusPushSubscribe.tsx`, `src/app/(public)/blog/` (page, [slug], category/[slug], tag/[slug]), `src/app/api/admin/authors/route.ts`, `src/components/content/ContentEditorForm.tsx`, `src/lib/supabase/content.ts`, `src/lib/supabase/taxonomy.ts`, `supabase/migrations/116_push_subscriptions.sql`, `supabase/migrations/117_get_published_posts_pagination.sql`, `docs/tenant-site-setup-checklist.md`, `docs/reference/notification-events-and-recipients.md`.

---

### 2026-03-05 CT Ã¢â‚¬â€ Session summary: PHP-Auth docs, PRD, Roles step 5, sessionlog cleanup

**Context for Next Session:** PHP-Auth is fully documented as SSOT for roles, features, permissions, and audit. Roles transition step 5 (deprecation doc) complete. Sessionlog is trimmed to start with Next up only. **Next up:** See sessionlog (SMTP + contact activity, PWA notifications, Media Copy Shortcode, Terms/Policys link, CRM sorting, Form submission pagination/filter).

**Changes:**
- **PRD (docs/prd.md):** Technology Stack auth line updated; new subsection *PHP-Auth integration (SSOT for roles, features, permissions, and audit)* under Authentication Ã¢â‚¬â€ identity vs authorization, what PHP-Auth is SSOT for, tenant/gating in website-cms, when PHP-Auth is not configured, summary and reference links. Multi-Client Strategy note added for PHP-Auth-configured path.
- **Roles step 5 Ã¢â‚¬â€ Deprecation doc:** [php-auth-website-cms-tables-cross-reference.md](./reference/php-auth-website-cms-tables-cross-reference.md) Ã‚Â§2 expanded: admin_roles (not SSOT for role definitions; PHP-Auth auth_roles/roles API), role_features (not SSOT for roleÃ¢â€ â€™features), tenant_user_assignments read path (role from validate-user; fallback + team/is_owner), tenant_sites (unchanged; website-cms SSOT). Role resolution and effective-features bullets updated for configured vs fallback.
- **Archive:** authplanlog.md moved to [docs/reference/Repurpose/authplanlog.md](./reference/Repurpose/authplanlog.md); references updated in sessionlog, changelog, MFA-fix-005.
- **Sessionlog:** Where we are, Current Focus, and Remaining work sections removed; log now starts with Next up. Completed Roles step 5 and checklist removed.

---

### 2026-03-04 18:30 CT - Session wrap-up: F6 View As fix, Phase E (E10, E10a, E11)

**Context for Next Session:**
- **F6 and Phase E complete.** View As now uses PHP-Auth for role features when configured; effective = tenant Ã¢Ë†Â© role. Gating (normal user and view-as) uses PHP-Auth when configured via `getRoleFeatureSlugsForGating(roleSlug)` in feature-registry; fallback to local `listRoleFeatureSlugs` when PHP-Auth unavailable or on error. Deprecation documented: admin_roles/role_features are not SSOT for gating (see reference docs).
- **Remaining (optional):** Roles step 5 Ã¢â‚¬â€ document deprecation of read path for admin_roles, role_features, tenant_user_assignments (E10 already covers gating SSOT). **Next up:** See sessionlog (SMTP + contact activity, PWA notifications, Media Copy Shortcode, Terms/Policys link, CRM sorting, Form submission pagination/filter).

**Changes:**
- **F6 Ã¢â‚¬â€ View As Role fix:** `getRoleFeatureSlugsFromPhpAuth(roleSlug)` in `src/lib/php-auth/fetch-roles.ts`. Admin layout when view-as active and PHP-Auth configured: role features from PHP-Auth; effective = tenant Ã¢Ë†Â© role; superadmin view-as Ã¢â€ â€™ "all". Fallback to local when not configured.
- **E10 Ã¢â‚¬â€ Deprecation doc:** [php-auth-ssot-roles-features-plan.md](./reference/php-auth-ssot-roles-features-plan.md) (Phase 3) and [php-auth-website-cms-tables-cross-reference.md](./reference/php-auth-website-cms-tables-cross-reference.md) (Ã‚Â§2): PHP-Auth is SSOT for roleÃ¢â€ â€™feature assignments for gating; admin_roles, role_features fallback only.
- **E10a Ã¢â‚¬â€ Gating from PHP-Auth:** `getRoleFeatureSlugsForGating(roleSlug)` in `src/lib/supabase/feature-registry.ts`; used in `getEffectiveFeatureSlugs`, `getRoleFeatureSlugsForCurrentUser` (resolve-role), and admin layout view-as fallback. Roles 4a done.
- **E11:** Sessionlog trimmed (completed F6, Phase E, 4a removed); changelog and reference plan checklist updated.

---

### 2026-03-04 17:00 CT - Session wrap-up: Phase F F1Ã¢â‚¬â€œF5 complete; one-to-one gate mapping; Superadmin gate display

**Context for Next Session:**
- **Phase F:** F1Ã¢â‚¬â€œF5 done (role slugs in layout, upgrade page, sidebar hide/ghost, FeatureGuard Ã¢â€ â€™ upgrade, copy finalized). One-to-one gate mapping complete for CRM, Marketing, Calendar, Media, Settings, Support; Superadmin sidebar shows gate state (display-only) via `sidebarDisplayFeatureSlugs`. **Remaining:** F6 Ã¢â‚¬â€ View As Role fix (resolve role features from PHP-Auth when view-as active so effective = tenant Ã¢Ë†Â© role is correct).
- **Key files:** `src/app/admin/layout.tsx` (role + effective slugs, `sidebarDisplayFeatureSlugs` for superadmin), `src/components/admin/AdminLayoutWrapper.tsx`, `src/components/dashboard/Sidebar.tsx` (displayEffectiveSlugs, one-to-one sections), `src/lib/admin/route-features.ts` (FEATURE_PARENT_SLUG empty), `src/app/admin/upgrade/page.tsx`, `src/components/admin/FeatureGuard.tsx`, `docs/sessionlog.md` (Phase F remaining: F6).

**Changes:**
- **Changelog:** This entry; sessionlog completed items summarized here.
- **Sessionlog:** Trimmed to lean: all completed items removed (PHP-Auth M0Ã¢â‚¬â€œM5 table, M3 steps, M5 Phases AÃ¢â‚¬â€œD, Roles 1Ã¢â‚¬â€œ4 table, Phase F F1Ã¢â‚¬â€œF5 rows). Only remaining work kept: F6, Phase E (E10, E10a, E11), Roles 4a/5, Next up, Paused/Later. Full completion history in this changelog and planlog.

**Completed (Phase F, from sessionlog):**
- **F1** Role feature slugs in layout: `getRoleFeatureSlugsForCurrentUser()`, both role and effective slugs passed from layout to sidebar/guard.
- **F2** Single upgrade page: `/admin/upgrade` with copy Ã¢â‚¬Å“Not included in your plan. Request supportÃ¢â‚¬Â and CTAs (Back to Dashboard, Quick Support).
- **F3** Sidebar hide by role, ghost by plan: sections hidden when not in role; items in role but not in effective shown ghosted with onClick Ã¢â€ â€™ upgrade page.
- **F4** FeatureGuard redirects to upgrade page (modal then OK Ã¢â€ â€™ `/admin/upgrade`).
- **F5** Copy finalized; upgrade page and FeatureGuard use same message.
- **One-to-one gate mapping:** CRM, Marketing, Calendar, Media, Settings, Support (and children) each gated by own slug; `FEATURE_PARENT_SLUG` cleared; sidebar link/ghost per slug.
- **Superadmin gate display (Option A):** When superadmin, sidebar uses `sidebarDisplayFeatureSlugs` (tenant-enabled slugs) for display only so nav shows ghosted state for gated-off features; guards unchanged (superadmin still has access).

---

### 2026-02-26 CT - Session wrap-up: PHP-Auth conversion milestone; Phase F (gating UX) step plan added

**Context for Next Session:**
- **PHP-Auth migration:** M0Ã¢â‚¬â€œM5 complete. Central store (validate-user, sync-user-role), central-only read (M4), superadmin UI redesign (M5 Phase D: Dashboard, gating table, Users, nav). Roles transition steps 1Ã¢â‚¬â€œ4 done; Step 4a (getEffectiveFeatureSlugs from PHP-Auth) and Step 5 (deprecation doc) pending. Phase E (E10, E10a, E11) and Phase F (gating/role navigation UX) are next.
- **Phase F (new):** Step plan added in sessionlog: role-based hide (sidebar, sub-level), plan-based ghost + single upgrade page, FeatureGuard Ã¢â€ â€™ upgrade page. Steps F1Ã¢â‚¬â€œF5; start next session with F1 (role feature slugs in layout) or 4a (roleÃ¢â€ â€™features for gating).
- **Key files:** `docs/sessionlog.md` (Phase F, Current Focus), `src/lib/auth/resolve-role.ts`, `src/lib/supabase/feature-registry.ts`, `src/components/admin/FeatureGuard.tsx`, `src/components/dashboard/Sidebar.tsx`, `docs/reference/php-auth-ssot-roles-features-plan.md`.

**Changes:**
- **Changelog:** This entry summarizes the PHP-Auth conversion milestone and adds Context for Next Session. Completed work below moved from sessionlog as summaries.
- **Sessionlog:** Cleaned; Current Focus set to Phase F. Phase F Ã¢â‚¬â€ Gating and Role Limit Navigation step plan added (F1Ã¢â‚¬â€œF5). Completed M3/M5/Phase D/Roles items remain as reference in sessionlog; Ã¢â‚¬Å“Recently completedÃ¢â‚¬Â trimmed; two completed Next up items (Roles API hierarchical, PHP-Auth roles 403) removed from Next up.

**Completed (summaries from sessionlog):**
- **M0Ã¢â‚¬â€œM5:** Connect PHP-Auth, populate central, dual-read, writes to central (sync-user-role), central-only read (M4 steps 1Ã¢â‚¬â€œ11), superadmin UI redesign (M5). M3 sync: new endpoint, fullName/newUser, assign/update/remove wired; recovery doc. M5 Phase A (PHP-Auth contract/docs), B (role picker, read-only Roles), C (feature registry from PHP-Auth), D (D6 no site picker, D7 Dashboard + metrics/gating on site detail, D8 Users + Related Tenant Users, D9 nav). Phase E (E10, E10a, E11) and Roles Step 5 pending.
- **Roles transition:** Steps 1Ã¢â‚¬â€œ4 done: role definitions from PHP-Auth, roleÃ¢â‚¬â€œfeatures display, sync + M3 recovery doc, M4 central-only read. Step 4a (getEffectiveFeatureSlugs from PHP-Auth) and Step 5 (deprecation doc) pending.
- **Next up (removed from list as done):** Roles API hierarchical features/permissions (parentSlug, tree, role detail Permissions/Features tabs). PHP-Auth roles 403/display (AUTH_ROLES_SCOPE, scope=website-cms).

---

### 2026-02-17 CT - Session wrap-up: M4 (central-only read) steps 1Ã¢â‚¬â€œ6, validate-user assignment, login UX

**Context for Next Session:**
- **M4:** Steps 1Ã¢â‚¬â€œ6 done: resolve-role no fallback when PHP-Auth configured; middleware uses validate-user for role (Edge); role helpers (isSuperadminFromRole, isAdminRole, isTenantAdminRole). Login still redirects back with Ã¢â‚¬Å“couldnÃ¢â‚¬â„¢t be verifiedÃ¢â‚¬Â on first request despite diagnose showing HTTP 200 and role Ã¢â‚¬â€ likely first request sends old/no session cookie; 500ms delay and router.push added; if still failing, consider middleware calling an internal API (Node) for validate-user instead of Edge fetch.
- **Validate-user:** New API returns `assignment.role` (and permissions/features). We use `getRoleSlugFromValidateUserData(data)` (prefer assignment.role.slug, fallback org). Types and `validateUserWithStatus` added for diagnostics.
- **Login:** Sign out link; reason=no_central_role message + Ã¢â‚¬Å“Check why (diagnose)Ã¢â‚¬Â calling GET /api/auth/validate-user-diagnose; link to validate-user-troubleshooting.md; 500ms delay before router.push after sign-in.
- **Superadmin:** Auth test page (/admin/super/auth-test) runs health, validate-api-key, php-auth-status. New API routes: GET php-auth-health, POST php-auth-validate-key (superadmin or role-based when PHP-Auth configured).
- **Next:** Resolve post-login first-request role check (Edge vs cookie timing or proxy validate-user from Node); then M4 steps 7Ã¢â‚¬â€œ10 (supabase-auth doc, API routes role checks, recovery doc). Key files: `src/middleware.ts`, `src/app/admin/login/page.tsx`, `src/lib/php-auth/validate-user.ts`, `docs/reference/m4-central-only-read-plan.md`.

**Changes:**
- **M4 (resolve-role + middleware):** getRoleForCurrentUser/getRoleForCurrentUserOnSite return null when PHP-Auth configured and validate-user fails or no org; getEffectiveFeatureSlugsForCurrentUser uses role only from getRoleForCurrentUser; getTeamManagementContext uses getRoleForCurrentUser when configured; isSuperadminFromRole, isAdminRole, isTenantAdminRole in role-mapping + re-export from resolve-role. Middleware: when PHP-Auth configured, role from validateUser + getRoleSlugFromValidateUserData; super routes require SUPERADMIN, admin routes require admin slug; no Ã¢â‚¬Å“already logged inÃ¢â‚¬Â redirect from /admin/login when configured (avoids loop).
- **Validate-user:** PhpAuthValidateUserAssignment type; validateUserWithStatus(accessToken) returns { data, status }; getRoleSlugFromValidateUserData(data) prefers data.assignment.role.slug. Call sites (resolve-role, middleware, php-auth-status) use getRoleSlugFromValidateUserData.
- **Login:** Sign out button (handleSignOut); reason=no_central_role message with Ã¢â‚¬Å“Check why (diagnose)Ã¢â‚¬Â and validate-user-diagnose API (GET /api/auth/validate-user-diagnose, minimal response); 500ms delay before router.push(redirect) after sign-in.
- **Auth test:** Superadmin Ã¢â€ â€™ Auth test page; GET /api/admin/php-auth-health, POST /api/admin/php-auth-validate-key; php-auth-status and new routes use role-based superadmin when PHP-Auth configured. Sidebar nav link (Activity icon).
- **Docs:** M4 plan test checklist and link to validate-user-troubleshooting; login page and M4 plan reference troubleshooting doc.

---

### 2026-02-17 CT - Session wrap-up: Verify session page shows 2FA bypass state

**Context for Next Session:**
- **Verify session:** When `NEXT_PUBLIC_DEV_BYPASS_2FA` is set, middleware skips the AAL2 requirement so you can access superadmin without completing MFA. The verify-session page now detects this and shows: (1) MFA row detail "Not verified (2FA bypass is on Ã¢â‚¬â€ middleware is not requiring MFA)" and (2) an amber note that 2FA bypass is on and to turn it off to enforce MFA. No logic change Ã¢â‚¬â€ clarifies why "MFA not verified" can appear while you can still reach superadmin.
- **Next:** M4 central-only read (see [reference/m4-central-only-read-plan.md](./reference/m4-central-only-read-plan.md)); optional role-based post-login redirect; then D7/D8 (tabbed Dashboard, Superadmin Users). Sessionlog/planlog unchanged for focus.

**Changes:**
- **Verify session page** (`src/app/admin/super/verify-session/page.tsx`): Import `isDevModeBypassEnabled` from mfa.ts. When bypass is on and AAL is not aal2, MFA check detail explains that 2FA bypass is on and middleware is not requiring MFA. Added amber banner: "2FA bypass is on (NEXT_PUBLIC_DEV_BYPASS_2FA). Middleware is not requiring MFAÃ¢â‚¬Â¦ Turn it off to enforce MFA."

---

### 2026-02-17 CT - Session wrap-up: PHP-Auth roles API scope optional; 403 still pending

**Context for Next Session:**
- **PHP-Auth roles:** Roles are fetched from PHP-Auth only (SSOT). We call `GET {AUTH_BASE_URL}/api/external/roles` with X-API-Key; scope is **optional**: if **AUTH_ROLES_SCOPE** is set we send `?scope=<value>`, otherwise we omit scope so PHP-Auth derives from the API key. New PHP-Auth deployed; when scope omitted it returns **403**: "Application type \"web-app\" does not match any role scope. Valid scopes: php-authhub, website-cms. Set Application type to one of these." With **AUTH_ROLES_SCOPE=website-cms** (added to .env.local) we still saw errors at session end Ã¢â‚¬â€ not yet verified after deploy.
- **Next steps:** (1) In PHP-Auth admin, set the **Application type** for the website-cms application to **website-cms** (instead of web-app) so either omitted scope or `?scope=website-cms` returns 200 and roles. (2) Retest Superadmin Ã¢â€ â€™ Roles and role pickers (Settings Ã¢â€ â€™ Users); remove DEBUG blocks and debug hint on Roles page once working. (3) Ensure roles exist in PHP-Auth for scope website-cms so the list is non-empty.
- **Key files:** `src/lib/php-auth/fetch-roles.ts` (optional AUTH_ROLES_SCOPE), `src/app/api/admin/roles/route.ts`, `src/app/api/admin/php-auth-status/route.ts`, `docs/reference/php-auth-external-roles-api.md`, `.env.local` (AUTH_ROLES_SCOPE=website-cms; do not commit if in .gitignore).

**Changes:**
- **Roles API scope optional:** fetch-roles.ts sends `?scope=...` only when AUTH_ROLES_SCOPE is set; otherwise no query (PHP-Auth uses application type from API key). php-auth-status probe URL updated to match. Docs updated: scope optional; recommend omitting or using app type.
- **Config:** AUTH_ROLES_SCOPE=website-cms added to .env.local to request website-cms roles (valid scopes in PHP-Auth: php-authhub, website-cms). Application type in PHP-Auth for this app is currently web-app, causing 403 when omitted; explicit scope may work after Application type is set to website-cms.
- **Session end:** Roles page still shows "No roles found" until PHP-Auth returns 200 with roles; DEBUG blocks and debug hint left in place for next session.

---

### 2026-02-23 CT - Session wrap-up: PHP-Auth M0 integration (validate-user, audit-log, dual-read, role slugs)

**Context for Next Session:**
- **PHP-Auth M0 done:** Env config, validate-user client, audit-log helper, dual-read in resolve-role, and role slug convention (use PHP-Auth slug everywhere; no internal slug). Add AUTH_BASE_URL, AUTH_ORG_ID, AUTH_APPLICATION_ID, AUTH_API_KEY to .env.local and Vercel; test with PHP-Auth locally (port 5000) or staging.
- **Roles:** PHP-Auth slugs (website-cms-superadmin, website-cms-admin, website-cms-editor, website-cms-creator, website-cms-gpum) are the single reference. GPUM = CRM members only (member auth, not admin UI). Use `isMemberRole(role)` and `PHP_AUTH_ADMIN_ROLE_SLUGS` when gating admin vs member. Feature-registry maps PHP-Auth slug Ã¢â€ â€™ legacy slug for DB queries until DB is migrated.
- **Next:** M3 (writes to central), then optional M4 (central-only read). Consider migrating admin_roles/role_features/tenant_user_assignments to PHP-Auth slugs and removing legacy mapping.
- **Key files:** `src/lib/php-auth/` (config, validate-user, role-mapping, audit-log), `src/lib/auth/resolve-role.ts`, `src/lib/supabase/feature-registry.ts`, `docs/reference/php-auth-integration-clarification.md`, `docs/reference/php-auth-website-cms-tables-cross-reference.md`.

**Changes:**
- **PHP-Auth integration (M0):** Added `src/lib/php-auth/config.ts` (getPhpAuthConfig, isPhpAuthConfigured), `validate-user.ts` (validateUser, getOrgForThisApp), `role-mapping.ts` (toPhpAuthRoleSlug, PHP_AUTH_ROLE_SLUG, legacySlugToPhpAuthSlug, phpAuthSlugToLegacySlug, isMemberRole, PHP_AUTH_ADMIN_ROLE_SLUGS), `audit-log.ts` (pushAuditLog). Dual-read in resolve-role: try PHP-Auth validate-user first; fallback to user_metadata/tenant_user_assignments; return PHP-Auth slug; full-access check for website-cms-superadmin. Audit log wired to login API and auth callback (login_success, login_failed).
- **Role slugs:** Use PHP-Auth slug as single reference (no internal slug). Official slugs: website-cms-superadmin, website-cms-admin, website-cms-editor, website-cms-creator, website-cms-gpum (GPUM = CRM members, not admin users). Feature-registry accepts PHP-Auth slug and maps to legacy for DB during transition.
- **Docs:** php-auth-integration-clarification.md (scope, env, dual-read, role table, GPUM note, SSOT); php-auth-website-cms-tables-cross-reference.md (table mapping, PHP-Auth schema); prd-technical.md (AUTH_* env vars); sessionlog M0 marked completed.

---

### 2026-02-17 CT - Session wrap-up: PHP-Auth repurpose planning (authplanlog.md)

**Context for Next Session:**
- Planning only (no code changes). **Current top priority:** see and work from [authplanlog.md](./reference/Repurpose/authplanlog.md) Ã¢â‚¬â€ Section 1 (modify PHP-Auth app) and Section 2 (modify website-cms app). Plan covers: data/schema cleanup (keep auth_users; simplify roles to Superadmin, admin-style, GPUM); MFA (TOTP) implementation notes from website-cms (form POST, token-relay fallback on Vercel); API keys generated and stored in PHP-Auth only; no session carry-over between PHP-Auth and website-cms; auth persists across website-cms forks (one MFA for all forks). Sessionlog Current focus points to authplanlog as next focus.
- Key doc: `docs/reference/Repurpose/authplanlog.md` (archived). Reference: `docs/reference/RepurposeAuthApp/` (AUTH_APP_OVERVIEW_SCHEMA.md, AuthApp-prd.md). Planlog/sessionlog "Integrate with PHPAUTH standalone app" item remains; authplanlog is the detailed step-by-step plan for that work.

**Changes:**
- **authplanlog.md:** Created and refined: two-section plan (Section 1 PHP-Auth, Section 2 website-cms). Added API key responsibility (PHP-Auth generates/stores; website-cms receives/stores in env). Added MFA implementation notes from website-cms (Ã‚Â§1.2.1: form POST, token relay for Vercel, standalone challenge/success). Clarified session rules (Ã‚Â§1.2.2): no carry-over to/from PHP-Auth; auth persists across website-cms forks (one login + MFA for all forks). Summary table updated. No changelog/sessionlog/planlog checkoffs this session (planning only).

---

### 2026-02-12 CT - Session wrap-up: planning and docs; Member auth checked off

**Context for Next Session:**
- Session was planning and docs only (no code changes). Next up in sessionlog: Outbound SMTP emailer + contact activity stream; PWA Notifications (admin alerts); Media "Copy Shortcode" (and "Adds protection to hide URL info"); Terms and Policys manager.
- Member auth confirmed mostly complete: public `/login` has signin + signup and signup code field with redeem-code automation; `/members/*` protected by middleware; `/api/auth/member/*` deferred as optional.
- Decisions: admin notifications via PWA push page (not email); protected video/download and media shortcode design discussed (proxy routes, gallery URL building, optional `[[media:id]]` shortcode); public signup/signin already has signup code and automations.

**Changes:**
- **Planlog:** Member auth item checked off (optional register on `/login`, middleware for member routes done; `/api/auth/member/*` optional/deferred).
- **Sessionlog:** Already contained expanded steps for outbound SMTP emailer, PWA notifications, Media "Copy Shortcode"; no removals this session.

---

### 2026-02-13 CT - Merge field selector (side-by-side), CRM external UIDs (4 columns)

**Context for Next Session:**
- **Merge:** Contact merge (detail + bulk) now has a side-by-side field selector: table with Field | Primary | Secondary | Keep (Primary/Secondary) | Proposed. Notes and related data described as combined (not pick-one). Optional `fieldChoices` in POST /api/crm/contacts/merge; mergeContacts() applies choices for core and custom fields. Bulk merge suggests primary (more complete or more recent); GET /api/crm/contacts/[id]/custom-fields added for merge preview.
- **CRM external UIDs:** Four first-class columns on contacts: `external_crm_id` (Anychat), `external_vbout_id`, `external_stripe_id`, `external_ecommerce_id`. Migration 113 adds the three new columns and updates list/detail RPCs. getContactByExternalId(source, id) in crm.ts for anychat | vbout | stripe | ecommerce. Merge and on-member-signup set the new fields. No custom-field lock or system ecommerce custom field.
- **Key files:** `src/lib/supabase/crm.ts` (mergeContacts + fieldChoices, MERGEABLE_CORE_KEYS, getContactByExternalId, ExternalIdSource), `src/components/crm/MergeSideBySide.tsx`, `src/app/admin/crm/contacts/[id]/ContactMergeButton.tsx`, `src/components/crm/MergeBulkDialog.tsx`, `src/app/api/crm/contacts/merge/route.ts`, `src/app/api/crm/contacts/[id]/custom-fields/route.ts` (GET), `supabase/migrations/113_crm_contacts_four_external_uids.sql`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Merge field selector:** MergeSideBySide component (Field | Primary | Secondary | Keep | Proposed); default choice primary-if-non-empty else secondary. ContactMergeButton and MergeBulkDialog fetch both contacts + custom fields and show side-by-side; bulk suggests primary by completeness/recent. POST /api/crm/contacts/merge accepts optional fieldChoices; mergeContacts() uses it for core and custom fields. GET /api/crm/contacts/[id]/custom-fields for merge preview.
- **CRM external UIDs (4 columns):** Migration 113 adds external_vbout_id, external_stripe_id, external_ecommerce_id to crm_contacts; get_contacts_dynamic and get_contact_by_id_dynamic updated. CrmContact type and merge logic extended; getContactByExternalId(source, externalId) added; on-member-signup sets new fields to null. Custom-field lock and system ecommerce custom field cancelled in favor of 4th column.
- **Docs:** Sessionlog cleaned; next up empty.

---

### 2026-02-13 CT - Session wrap-up: CRM contact merge (detail + bulk), merge field selector on backlog

**Context for Next Session:**
- **CRM contact merge:** Implemented and working. (1) **Detail page:** Merge button in contact header opens dialog with dire "This action is not reversible" warning, dropdown to pick contact to merge into current one, required checkbox, "Merge permanently" (destructive). (2) **Bulk:** Select exactly 2 contacts Ã¢â€ â€™ Bulk actions Ã¢â€ â€™ "Merge 2 contacts" (only when not in Show trash). MergeBulkDialog lets user choose which contact to keep (primary); the other is merged into it and soft-deleted. Merge logic: primary keeps non-empty core fields, secondary fills blanks; related data (notes, submissions, MAGs, custom fields, consents, lists, taxonomy) reassigned or combined; secondary soft-deleted.
- **Next up (sessionlog):** Merge field selector/confirmation Ã¢â‚¬â€ optional UI to choose which contactÃ¢â‚¬â„¢s value wins per field (full preview or conflict-only). CRM external UIDs (schema, custom field lock, temporary ecommerce, helpers) remain on planlog.
- **Key files:** `src/lib/supabase/crm.ts` (mergeContacts, MERGEABLE_CORE_KEYS), `src/app/api/crm/contacts/merge/route.ts`, `src/app/admin/crm/contacts/[id]/ContactMergeButton.tsx`, `src/app/admin/crm/contacts/[id]/page.tsx`, `src/components/crm/MergeBulkDialog.tsx`, `src/components/crm/ContactsListBulkBar.tsx`, `src/app/admin/crm/contacts/ContactsListClient.tsx`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Contact merge (detail):** ContactMergeButton with irreversible warning, contact dropdown, confirmation checkbox; POST /api/crm/contacts/merge; mergeContacts() in crm.ts (core fields, external_crm_id, notes, form_submissions, MAGs, custom fields, consents, marketing lists, taxonomy, soft-delete secondary).
- **Contact merge (bulk):** "Merge 2 contacts" in Bulk actions when exactly 2 selected and not in trash; MergeBulkDialog to pick primary vs secondary with same warning/checkbox; on success clear selection and refresh.
- **Docs:** Sessionlog: completed merge and dashboard items removed; Merge field selector/confirmation added as next up. Planlog: Phase 07 CRM contact merge checked off.

---

### 2026-02-12 CT - Session wrap-up: Activity Stream, dashboard restructure, OmniChat link, RAG header

**Context for Next Session:**
- **Dashboard:** Metric blocks at top (Total Contacts, Form submissions with 24h/7d/30d/all, Content items, Media, Events with by-type). Tabs: Activity (default) | RAG. Activity tab shows combined stream (notes, form submissions, contact added) with search and type filter; RAG tab shows knowledge card with updated header. All working.
- **CRM:** Per-contact Activity Stream extended (Contact added, Form submissions, MAG assignments, Marketing list joins). Sidebar "New" badge refreshes after bulk actions and import via `crm-data-changed` event. Import refreshes and dispatches event; "Back to contacts" for navigation.
- **OmniChat:** Sidebar link now points to https://chat.phpmedia.com, opens in new tab.
- **API/integrations:** Discussed: no public API; Anychat (push to CRM) and VBout (send contacts/lists, receive activity) will use secret-per-tenant or webhook verification to protect endpoints. Rate limiting not needed for admin-only marketing routes.
- **Key files:** `src/app/admin/dashboard/page.tsx`, `DashboardTabsClient.tsx`, `FormSubmissionsMetricCard.tsx`, `EventsMetricCard.tsx`, `DashboardActivityStream.tsx`, `RagKnowledgeCard.tsx`, `src/components/dashboard/Sidebar.tsx`, `src/lib/supabase/crm.ts` (getContactsCount, getFormSubmissionsCount, getDashboardActivity), `src/components/crm/ContactNotesSection.tsx`, `docs/sessionlog.md`, `docs/planlog.md`.

**Changes:**
- **Activity Stream (per contact):** Contact added line; form submissions ("Submitted [Form name]"); MAG assignments ("Added to [MAG name]"); marketing list joins ("Added to list [name]"). getFormSubmissionsByContactId() in crm.ts.
- **CRM sidebar badge:** Sidebar listens for `crm-data-changed`; ContactsListClient and import page dispatch it after bulk actions/import; badge refetches without full reload.
- **Admin dashboard restructure:** Metric row (contacts, form submissions with period buttons, content count, media, events with by-type). Tabs: Activity (combined stream, filters) | RAG. getContentCount(), getEventsCount(), getEventsCountByType() added.
- **RAG card header:** "RAG (Retrieval Augmented Generation) Knowledge for AI Agent Training".
- **OmniChat:** Link href https://chat.phpmedia.com, target _blank, rel noopener noreferrer.
- **Docs:** Sessionlog trimmed; planlog Activity Stream dashboard widget checked off; changelog context for next session.

---

### 2026-02-12 CT - MFA: set cookies on success page (one-time token)

**Context for Next Session:**
- **MFA Vercel fix:** Cookies are now set on the success page document response instead of the API. Verify API stores session cookies in `mfa_upgrade_tokens`, redirects 302 to `/mfa/success?t=TOKEN`; success page (Server Component) reads token, sets cookies via `cookies().set()`, deletes token, renders. Run migration **110_mfa_upgrade_tokens.sql** in Supabase SQL Editor before testing.
- **Key files:** `src/app/api/auth/mfa/verify/route.ts`, `src/app/mfa/success/page.tsx`, `supabase/migrations/110_mfa_upgrade_tokens.sql`.

**Changes:**
- **Migration 110:** `public.mfa_upgrade_tokens` table (token, cookies jsonb, expires_at); RLS on, service-role only.
- **Verify API:** On success with redirect, insert cookies into table, redirect 302 to `/mfa/success?t=...` (no Set-Cookie on API).
- **Success page:** Read `t`, load cookies from DB, set via next/headers `cookies()`, delete token; redirect to challenge if missing/expired.
- **MFAChallenge:** Handle `error=expired` and `error=server` from URL.

---

### 2026-02-12 CT (late) - MFA: form POST for reliable cookie persistence

**Context for Next Session:**
- **MFA fix:** Switched from fetch to form POST so browser does full navigation to verify API; cookies apply reliably on document load. API redirects to /mfa/success first (meta refresh), then success page countdown Ã¢â€ â€™ admin.
- **Key files:** `src/components/auth/MFAChallenge.tsx`, `src/app/api/auth/mfa/verify/route.ts`.

**Changes:**
- **Form POST:** MFAChallenge uses form action/method POST instead of fetch; full page navigation so Set-Cookie applies on document load.
- **API:** Meta refresh redirects to /mfa/success?redirect=... (not directly to admin).

---

### 2026-02-12 CT (late) - MFA standalone flow, success page with delay

**Context for Next Session:**
- **MFA flow:** Standalone `/mfa/challenge` and `/mfa/success` pages (minimal layout, no admin sidebar). After verify, user lands on success page with "Success!" and 3-second countdown, then redirects to admin dashboard. Gives browser time to apply session cookies before final redirect.
- **Key files:** `src/app/mfa/` (layout, challenge, success), `src/components/auth/MFAChallenge.tsx`, `src/components/auth/MFASuccessClient.tsx`, `src/middleware.ts`, `src/app/api/auth/mfa/verify/route.ts`. Admin `/admin/mfa/challenge` and `/admin/mfa/success` redirect to `/mfa/*` for backward compat.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Standalone MFA:** New `/mfa` route group with minimal layout; challenge and success pages.
- **Success page:** MFASuccessClient shows "Success!" with checkmark, 3-second countdown, then redirect to admin.
- **Middleware:** Redirects to `/mfa/challenge` when AAL2 needed; `isMfaChallengeOrEnroll` includes `/mfa/challenge` and `/mfa/success`.
- **Verify flow:** MFAChallenge fetch POST Ã¢â€ â€™ verify API returns 200 + Set-Cookie Ã¢â€ â€™ client navigates to `/mfa/success?redirect=...` Ã¢â€ â€™ success page waits 3s Ã¢â€ â€™ redirect.
- **Cleanup:** Removed MFA_TRACE logs from verify route.

---

### 2026-02-13 CT - RAG doc packer, content types (FAQ/Quote), Add New modal, robots.txt, RAG warning

**Context for Next Session:**
- **RAG:** Article-based packing in `src/lib/rag.ts` (whole articles per URL; FAQ never split; oversize articles sub-split with "Blog post"/"Continued from" headers). Configurable via `RAG_MAX_TOKENS_PER_PART`. robots.txt disallows `/api/rag/`. Dashboard shows instructional note when partCount >= 5. Cache getRagStats() skipped (bot-only, sparse traffic).
- **Content types:** FAQ added (migration 107); Page removed from UI and from DB (migrations 107, 108). Core types (Post, Snippet, Quote, Article, FAQ) cannot be edited/deleted in Settings > Content Types. Add New opens modal to choose type; type fixed on document (new + edit). Custom fields moved to dedicated tab; "No custom fields for this content type" when none.
- **Templates:** New FAQ content gets body template (Topic/Q/A, single line); new Quote gets "Quote: Ã¢â‚¬Â¦ / Author: Ã¢â‚¬Â¦" instructional template. Taxonomy shows empty when no section config (e.g. FAQ).
- **UX:** Add Content and Edit Content pages have Cancel/Create or Cancel/Update in header (duplicate of footer). Add New type modal taller, scrollable, spacing between label and description.
- **Key files:** `src/lib/rag.ts`, `src/app/robots.ts`, `src/components/dashboard/RagKnowledgeCard.tsx`, `src/app/admin/content/ContentPageClient.tsx`, `src/components/content/ContentEditorForm.tsx`, `src/components/settings/ContentTypesBoard.tsx`, `src/app/admin/content/new/ContentNewClient.tsx`, `src/app/admin/content/[id]/edit/EditContentClient.tsx`, `src/lib/supabase/taxonomy.ts`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **RAG doc packer:** packArticlesIntoSegments() packs by article; FAQ type never split; oversize non-FAQ sub-split with headers. getRagContentRows() joins content_types for type_slug. getMaxTokensPerPart() + RAG_MAX_TOKENS_PER_PART env.
- **robots.txt:** `src/app/robots.ts` disallows `/api/rag/` so crawlers don't index RAG URL; bot still uses public URL.
- **RAG warning:** RagKnowledgeCard shows instructional note when partCount >= 5 (scale back or shorten content).
- **Content types:** Migration 107 adds FAQ; 108 removes Page content and type. ContentTypesBoard and Content list/Add New exclude Page. Core types: Edit and Delete disabled in Settings.
- **Add New flow:** Modal to choose type Ã¢â€ â€™ navigate to /admin/content/new?type=slug. Content type fixed on document (new and edit).
- **Custom fields:** New tab "Custom fields" after Membership; empty state "No custom fields for this content type."
- **FAQ/Quote templates:** getFaqTemplateBody() and getQuoteTemplateBody() prefill body on create (initial state so Tiptap shows on first paint). Taxonomy: no section config Ã¢â€ â€™ empty categories/tags (e.g. FAQ).
- **Header actions:** ContentNewClient and EditContentClient have Cancel + Create/Update in header (form ref + onSavingChange).
- **Add New modal:** Taller (max-h 70vh/520px), label/description spacing, scroll when many types.
- **Docs:** Sessionlog and planlog RAG optimization items checked off; sessionlog cleaned; FAQ packing rule in planlog/mvt/sessionlog.
- **Pre-launch cleanup & code review:** Dead code removed (ChangeStatusDialog, PostEditor). Stale 2FA TODOs removed in integrations; getAAL implemented in GET/PUT /api/admin/integrations. Code review: security (RLS, no secrets in client, auth + 2FA on integrations); modular alignment (routes/lib vs mvt.md). Refactor: ContactDetailClient Ã¢â€ â€™ ContactNotesSection, ContactCustomFieldsSection, ContactMarketingListsSection, ContactMagsSection; Marketing Lists/Memberships suggested items; Sidebar Ã¢â€ â€™ sidebar-config.ts; ContactsListClient Ã¢â€ â€™ ContactsListFilters, ContactsListBulkBar. Planlog "Code Review, Security & Modular Alignment" checked off. Security module discussed.

---

### 2026-02-12 CT (evening) - Vercel deploy: redirect loop, MFA flow, verify still stuck

**Context for Next Session:**
- **Vercel:** App deploys; admin was blocked by ERR_TOO_MANY_REDIRECTS and MFA. Fixes applied (below). **MFA verify still not working:** user sees challenge, enters code, clicks Verify Ã¢â€ â€™ stays on "Verifying..." and never completes (or redirect doesnÃ¢â‚¬â„¢t land on dashboard). Next session: debug why Ã¢â‚¬â€ e.g. `mfa.verify()` not resolving on Vercel, cookies not persisting after verify, or middleware still not seeing AAL2 after full-page redirect.
- **Done this session:** Middleware cookie carrier (setAll + copy to redirects) to fix redirect loop; skip MFA redirect when path is /admin/mfa/challenge or enroll; getCurrentUserFromRequest returns `{ user, session }` and middleware uses session.aal for AAL (getAAL used service-role, no session in Edge); 2FA bypass respects NEXT_PUBLIC_DEV_BYPASS_2FA in any env; getEnrolledFactors/hasEnrolledFactors use SSR client so server sees userÃ¢â‚¬â„¢s factors; enroll page redirects to challenge when user already has factors; MFAChallenge: 20s timeout on verify + window.location.replace(redirectTo) after success. Build fixes: Session.aal type cast, client.ts getSupabaseEnv() for all clients, getSetCookie type in middleware.
- **Key files:** `src/middleware.ts`, `src/lib/auth/supabase-auth.ts`, `src/lib/auth/mfa.ts`, `src/components/auth/MFAChallenge.tsx`, `src/app/admin/mfa/enroll/page.tsx`, `src/lib/supabase/client.ts`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Redirect loop (Vercel):** Cookie carrier in middleware; setAll writes refresh cookies to response; copyCookiesTo copies to redirects; skip AAL2 redirect on /admin/mfa/challenge and /admin/mfa/enroll.
- **AAL in middleware:** getCurrentUserFromRequest returns `{ user, session }`; middleware uses session.aal instead of getAAL(user) (service-role has no session in Edge).
- **2FA bypass:** isDevModeBypassEnabled() no longer requires NODE_ENV=development; only checks NEXT_PUBLIC_DEV_BYPASS_2FA.
- **MFA server factors:** getEnrolledFactors() uses createServerSupabaseClientSSR() so challenge/enroll pages see userÃ¢â‚¬â„¢s factors; enroll redirects to challenge when already enrolled.
- **MFA verify UX:** 20s timeout on verify; success path uses window.location.replace(redirectTo). Verify still not completing in production Ã¢â‚¬â€ to be debugged next session.
- **Build:** Session.aal type assertion; client.ts uses getSupabaseEnv() in createClientSupabaseClient, createServerSupabaseClient, createServerSupabaseClientSSR; ResponseWithGetSetCookie type for getSetCookie in middleware.

---

## Ã°Å¸Å¡â‚¬ MILESTONE Ã¢â‚¬â€ LAUNCH TO PRODUCTION (2026-02-12)

**This release marks the first production launch.** The application is deployed to a live domain on Vercel and is **LIVE**. Pre-launch refactor and documentation are complete; Main and Dev branches are in place for CI/CD. Post-launch: full smoke test on live site, then security check and OWASP review.

---

### 2026-02-12 CT - Session wrap: refactor, SimpleCommenter docs, branches, milestone

**Context for Next Session:**
- **MILESTONE:** App is ready for production deploy. After pushing this commit, deploy to Vercel and go LIVE. Then: full smoke test on live domain Ã¢â€ â€™ security check and outstanding updates Ã¢â€ â€™ full OWASP review.
- **Branches:** `main` (production) and `dev` (integration/staging) exist on origin. Work on `dev`, merge to `main` for releases; CI/CD can deploy `main` Ã¢â€ â€™ production, optionally `dev` Ã¢â€ â€™ staging.
- **Refactor (done):** ContactDetailClient split into ContactNotesSection, ContactCustomFieldsSection, ContactMarketingListsSection, ContactMagsSection; suggested items for Marketing Lists and Memberships; Sidebar nav Ã¢â€ â€™ `sidebar-config.ts`; ContactsListClient Ã¢â€ â€™ ContactsListFilters and ContactsListBulkBar. Copy label "Copy To Activity Stream." Fixes: showMags declaration order, ContactMagsSection confirm-remove dialog.
- **SimpleCommenter:** PRD and docs updated: production deployment tool, script always on forked tenant sites; tenant turns on via special URL, adds comments, turns off when not needed. Not dev-only; not for blog comments.
- **Key files:** `src/components/crm/Contact*Section.tsx`, `ContactsListFilters.tsx`, `ContactsListBulkBar.tsx`, `src/components/dashboard/sidebar-config.ts`, `docs/prd.md` (Third-Party Integrations), `IntegrationsManager.tsx`, `integrations.ts`, `(public)/layout.tsx`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Refactor:** ContactNotesSection, ContactCustomFieldsSection, ContactMarketingListsSection, ContactMagsSection; Marketing Lists and Memberships suggested items when search empty; sidebar-config.ts; ContactsListFilters and ContactsListBulkBar. Copy button label "Copy To Activity Stream." Bug fixes: showMags before useEffect; ContactMagsSection confirm-remove dialog.
- **SimpleCommenter:** PRD, prd-technical, IntegrationsManager, layout comment, integrations.ts JSDoc Ã¢â‚¬â€ now described as hybrid tenant feedback tool, always deployed on forked sites, tenant on/off via special URL.
- **Git:** `dev` branch created and pushed; `main` and `dev` ready for CI/CD.
- **Session docs:** Sessionlog and changelog updated; milestone noted.

---

### 2026-02-11 CT (later) - Content fixes, add/edit layout, RAG bot URL, Quick Support

**Context for Next Session:**
- **Content:** Dynamic RPCs (content + taxonomy) are called with `supabase.schema("public").rpc(...)` so PostgREST finds them; content data stays in tenant schema. Content editor loads body on first paint (form state init from `item.body`, RichTextEditor key by `item.id`). Add/edit page layout: header (Back + bold "Edit Content" or "Add Content"); two cards 60%/40% (left: type, name, slug; right: status, Use for AI Training); body editor; tabs Taxonomy settings / Membership settings; Cancel and Create/Update right-justified. Taxonomy saved after create. Debug logging removed from content.ts, ContentEditorForm, EditContentClient.
- **RAG:** Dashboard RAG card shows "URL for your bot" (or "URLs for your bot") when partCount >= 1 so the single-URL case is visible and copyable.
- **Quick Support:** Page reverted to simple embed (heading, description, iframe). No git push this session.
- **Next up:** See [sessionlog.md](./sessionlog.md) Ã¢â‚¬â€ Pre-launch cleanup & code review. Key files: `src/lib/supabase/content.ts`, `src/lib/supabase/taxonomy.ts`, `src/components/content/ContentEditorForm.tsx`, `src/app/admin/content/[id]/edit/EditContentClient.tsx`, `src/components/dashboard/RagKnowledgeCard.tsx`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Content 404 fix:** All dynamic RPCs in `content.ts` and `taxonomy.ts` use `.schema("public").rpc(...)` so the browser client (default schema = tenant) finds the functions; data remains in tenant schema.
- **Content editor:** Form initializes `data` from `item?.body`; RichTextEditor key `item?.id ?? "new"` so body appears on load and when switching items. Tiptap `immediatelyRender: false` to avoid SSR hydration warning.
- **Content add/edit layout:** EditContentClient and ContentNewClient header: Back link + bold mode only. ContentEditorForm: 60/40 grid cards (left: content type, name, slug; right: status, Use for AI Training); full-width body editor; Tabs (Taxonomy settings: categories/tags, excerpt, custom fields; Membership settings: access level, visibility, MAG, restricted message); buttons right-justified. Taxonomy applied after insert for new content.
- **RAG dashboard:** RagKnowledgeCard shows URL card when partCount >= 1 (title "URL for your bot" or "URLs for your bot"); single-URL case now copyable.
- **Quick Support:** Restored to original (heading, description, iframe only).
- **Cleanup:** Removed all [DEBUG] logs from content.ts, ContentEditorForm.tsx, EditContentClient.tsx; updateContent returns false when no row updated.

### 2026-02-11 CT - Pre-launch cleanup: dead code, 2FA integrations, code review

**Changes:**
- **Dead code:** Removed unused `ChangeStatusDialog` (replaced by SetCrmFieldsDialog) and `PostEditor` (posts use content redirect).
- **Integrations 2FA:** Removed stale TODOs; GET/PUT `/api/admin/integrations` now enforce getAAL (aal2); integrations page comment updated (middleware enforces 2FA for /admin/super).
- **Code review:** Spot-checked security (RLS in migrations, no secrets in client, auth + 2FA) and modular alignment (routes/lib vs mvt.md). Sessionlog and planlog updated.

### 2026-02-11 CT - Feature Guard: sidebar order, roles CRUD, feature registry 1:1, ghosted display, Settings

**Context for Next Session:**
- **Feature Guard / Roles & Features** is in place: sidebar order matches design (Dashboard Ã¢â€ â€™ OmniChat Ã¢â€ â€™ CRM Ã¢â€ â€™ Marketing Ã¢â€ â€™ Calendar Ã¢â€ â€™ Media Ã¢â€ â€™ Content Ã¢â€ â€™ Settings Ã¢â€ â€™ Support); Roles list page with Add/Delete role (system roles Admin, Editor, Creator, Viewer locked); per-role feature editor at `/admin/super/roles/[roleSlug]`; feature registry aligned 1:1 with sidebar via migrations 103Ã¢â‚¬â€œ105; route-features map all paths to slugs; blocked sidebar items shown **ghosted** (visible, non-clickable) for upsell; Settings sub-items in role assignment and sidebar are General, Style, Taxonomy, Customizer, Users; My Profile always visible (no feature gate). Run migrations 103, 104, 105 in Supabase SQL Editor if not already applied.
- **Next up:** See [sessionlog.md](./sessionlog.md) Ã¢â‚¬â€ Pre-launch cleanup & code review, RAG Page Builder. Key files: `src/components/dashboard/Sidebar.tsx`, `src/lib/admin/route-features.ts`, `src/components/superadmin/RolesList.tsx`, `src/components/superadmin/RolesManager.tsx`, `src/lib/supabase/feature-registry.ts`, `supabase/migrations/103_*.sql`, `104_*.sql`, `105_*.sql`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Sidebar:** Reordered to Dashboard, OmniChat, CRM (Contacts, Forms, Form Submissions, Memberships, Code Generator), Marketing (Lists), Calendar (Calendar, Resources), Media (Library, Galleries), Content, Settings, Support; Calendar as main nav after Marketing; OmniChat single link; Marketing twirldown with Lists.
- **Roles & Features:** List page at `/admin/super/roles` with cards; click role Ã¢â€ â€™ editor at `/admin/super/roles/[roleSlug]` (no role dropdown). Add role (dialog: slug, label, description); Delete role with confirm (system roles non-deletable, lock icon). API: POST /api/admin/roles, DELETE /api/admin/roles/[roleSlug]; feature-registry: createRole, deleteRole, getRoleBySlug, SYSTEM_ROLE_SLUGS.
- **Feature registry 1:1 with sidebar:** Migration 103 adds/orders omnichat, form_submissions, lists, calendar, events, resources, library, support + children; 104 adds Settings children (general, style, taxonomy, customizer, users); 105 disables legacy settings rows (fonts_colors, content_types, content_fields, settings_crm, security, api). Roles API uses listFeatures(false) so only enabled features show.
- **Route-features:** pathToFeatureSlug for all new paths (library, form_submissions, omnichat, lists, events, resources, support children, settings children); /admin/settings/profile Ã¢â€ â€™ null (always allowed); FEATURE_PARENT_SLUG and SIDEBAR_FEATURE_MAP updated. Sidebar mediaSubNav uses library; crmSubNav uses form_submissions.
- **Ghosted display:** Sidebar shows all sections; items without access render as greyed, non-clickable (opacity-50, cursor-not-allowed, title "Upgrade your plan to access"). Single links (Dashboard, OmniChat, Content) and twirldowns (CRM, Marketing, Calendar, Media, Settings) support ghosted; sub-items within a section can be link or ghosted by feature. Support remains always clickable.
- **Settings:** Sidebar settingsSubNav has featureSlug for General, Style, Taxonomy, Customizer, Users; My Profile has no featureSlug (always visible). Route guards for /admin/settings/* by slug; FEATURE_PARENT_SLUG for settings children. Role assignment shows only those five under Settings.

### 2026-02-11 CT (later) - Bulk Set CRM Fields (Standard + Custom)

**Context for Next Session:**
- **Bulk Set CRM Fields** is live: one bulk action in the contacts list dropdown, **"Set CRM Fields"**, replaces the former "Change status" item. Dialog step 1: choose **Standard field** or **Custom field**. Standard: set Status for all selected (existing `POST /api/crm/contacts/bulk-status`). Custom: pick one custom field, set value or "Clear value" for all selected (new `POST /api/crm/contacts/custom-fields/bulk`); value inputs by type (text, textarea, select, multiselect, checkbox, etc.). Plan doc `docs/bulk-custom-fields-plan.md` can be archived or removed; implementation steps 1Ã¢â‚¬â€œ4 complete; optional cap/toast (step 5) skipped for v1.
- **Next up:** See [sessionlog.md](./sessionlog.md) and [planlog.md](./planlog.md). Consider adding planlog item for "Bulk Set CRM Fields" and checking it off if not already done.
- **Key files:** `src/components/crm/SetCrmFieldsDialog.tsx`, `src/app/admin/crm/contacts/ContactsListClient.tsx` (bulk menu + dialog), `src/app/api/crm/contacts/custom-fields/bulk/route.ts`, `src/lib/supabase/crm.ts` (`upsertContactCustomFieldValueBulk`). `ChangeStatusDialog` no longer used in list flow (file remains).
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Backend:** `upsertContactCustomFieldValueBulk(contactIds, customFieldId, value)` in `crm.ts`; bulk upsert into `crm_contact_custom_fields`; `value: null` clears for selected contacts.
- **API:** `POST /api/crm/contacts/custom-fields/bulk` Ã¢â‚¬â€ body `{ contactIds, custom_field_id, value }`; auth, validation (non-empty contactIds, valid custom_field_id), calls bulk upsert.
- **Dialog:** `SetCrmFieldsDialog` Ã¢â‚¬â€ step 1: Standard field | Custom field; Standard = Status only (status chips, submit to bulk-status); Custom = fetch custom field definitions, pick one field, value by type or "Clear value", submit to custom-fields/bulk. Back/Cancel; reset on close.
- **Contacts list:** Bulk menu "Change status" replaced with **"Set CRM Fields"**; `SetCrmFieldsDialog` with `contactStatuses` and `onSuccess` refresh. `ChangeStatusDialog` removed from this flow.

### 2026-02-11 CT - CRM Contacts List complete (pagination, bulk actions, trash)

**Context for Next Session:**
- **CRM Contacts List** is complete: pagination (25/50/100), row selection and Check all, bulk action bar (search + Show trash + Bulk actions), Export (CSV/PDF, core + custom fields, 10k cap), Add to list, Remove from list, Change status, Taxonomy (single category/tag add or remove), Delete (soft), Restore, Empty trash (confirmation with dire warning), Show Trashed filter. Backend: `deleted_at` on `crm_contacts` (migration 102), list RPC excludes trashed; bulk APIs for status, list add/remove, taxonomy, soft delete, restore, purge. Purge and single-contact delete clear `taxonomy_relationships` so no orphaned records.
- **Next up:** See [sessionlog.md](./sessionlog.md) Ã¢â‚¬â€ Emailer (built-in), Complete Feature Guard. Key paths: `src/app/admin/crm/contacts/ContactsListClient.tsx`, `src/lib/supabase/crm.ts`, `src/components/crm/`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Pagination & selection:** `ContactsListClient` Ã¢â‚¬â€ pageSize 25/50/100, currentPage, footer (page size, Prev/Next, Ã¢â‚¬Å“Showing XÃ¢â‚¬â€œY of ZÃ¢â‚¬Â), checkbox column, selectedIds, Check all cycle, selection persists across bulk actions.
- **Bulk actions:** Dropdown right of search. Export (dialog: format, field selector core + custom, 10k limit, immediate download), Add to list, Remove from list, Change status (dialog), Taxonomy (single term add/remove dialog), Delete (soft, confirm dialog), Restore (when viewing trash), Empty trash (disabled when no trashed; confirm with dire warning).
- **Trash:** Migration 102 Ã¢â‚¬â€ `deleted_at` on `crm_contacts`; `get_contacts_dynamic` excludes trashed; `getTrashedContacts()`, Show trash (N) / Show active contacts inline with search. Restore and Empty trash APIs; purge and `deleteContact()` delete `taxonomy_relationships` for contact(s) first to avoid orphans.
- **APIs:** `bulk-status`, `bulk-delete`, `bulk-restore`, `purge-trash`, `taxonomy/bulk`; list add/remove already present. `crm.ts`: `updateContactsStatusBulk`, `softDeleteContactsBulk`, `restoreContactsBulk`, `purgeAllTrashedContacts`; `crm-taxonomy.ts`: `addContactsToTermBulk`, `removeContactsFromTermBulk`.
- **Sessionlog:** Completed CRM steps removed; Current Focus and Context updated. **Planlog:** CRM contacts list item checked off.

### 2026-02-10 CT (evening) - CRM contacts list plan; session wrap

**Context for Next Session:**
- **Next focus:** CRM Contacts List Ã¢â‚¬â€ pagination, selection, bulk actions, and trash. Full implementation steps are in [sessionlog.md](./sessionlog.md) under **"CRM Contacts List Ã¢â‚¬â€ implementation steps"** (16 steps: pagination, selection, bulk action bar, Export/Add to list/Remove from list/Change status/Taxonomy/Delete/Restore/Empty trash, Show Trashed filter, backend/DB for trashed state and bulk APIs).
- **This session:** Planning only. No code or database changes. Calendar module remains at a good stopping point (public calendar, ICS, filters). No RLS or DB left in a vulnerable state.
- **Key file for next work:** `src/app/admin/crm/contacts/ContactsListClient.tsx`; server: `page.tsx`, `src/lib/supabase/crm.ts`.

**Changes:**
- **Sessionlog:** Current Focus set to CRM Contacts List. Added full "CRM Contacts List Ã¢â‚¬â€ implementation steps" (pagination 25/50/100, footer left=page size / center=pages / right=count; checkbox column, Check all cycle, selection persists across bulk actions; bulk dropdown right of search; Export, Add to list, Remove from list, Change status, Taxonomy single-term add/remove, Delete soft, Restore, Empty trash with dire warning; Show Trashed filter; backend trashed state and bulk APIs).
- **Planlog:** Phase 07 Ã¢â‚¬â€ added CRM contacts list enhancement item referencing sessionlog.

### 2026-02-10 CT (afternoon) - Calendar: public calendar, ICS, resource filter fix, session wrap

**Context for Next Session:**
- **Next session may be on another machine.** Read [sessionlog.md](./sessionlog.md) first; it has handoff context (repo, pnpm, calendar state, key paths, next up). Then read this changelog entry and the previous one.
- **Calendar module:** Admin calendar complete (CRUD, recurrence, one-step create, filters, Resources CRUD at /admin/events/resources). **Public calendar** at **/events** (public layout): Events nav link in header; page fetches GET /api/events/public; click event Ã¢â€ â€™ detail modal; "Subscribe to calendar (ICS)" in header and modal. **Public = not hidden, not membership-protected:** `access_level=public`, `visibility=public`, `status=published`. ICS feed: GET /api/events/ics (same filter). Resource/participant filter on admin calendar now works for recurring events (assignments requested by real event ID; filter lookup uses eventIdForEdit(e.id)).
- **Key files:** `src/lib/supabase/events.ts` (getPublicEvents, isPublicEvent), `src/app/api/events/public/route.ts`, `src/app/api/events/public/[id]/route.ts`, `src/app/api/events/ics/route.ts`, `src/app/(public)/events/` (page + PublicCalendarPageClient), `src/app/(public)/layout.tsx` (Events nav), `src/app/admin/events/EventsPageClient.tsx` (real IDs for assignments + filter).
- **Next up (optional):** Resources CRUD polish, conflict check (14Ã¢â‚¬â€œ17), Step 5 testing/docs. Feature guard (32) deferred. No RLS or DB left in a vulnerable state.

**Changes:**
- **Public calendar & ICS:** GET /api/events/public (list public-only events), GET /api/events/public/[id] (single event or occurrence; 404 if not public), GET /api/events/ics (text/calendar feed, public-only). isPublicEvent() and getPublicEvents() in events.ts. Public page at /events with EventsCalendar, detail modal, ICS subscribe link. Events link in public header nav. EventsCalendar accepts optional onSelectEvent for public detail modal.
- **Resource/participant filter (recurring):** EventsPageClient requests assignments by real event IDs (eventIdForEdit); filter uses real ID when looking up eventResourceMap/eventParticipantMap so recurring occurrences show correctly when filtering by resource or participant.
- **Participants & Resources tab:** Empty resources state has button "Add resources (Calendar Ã¢â€ â€™ Resources)" linking to /admin/events/resources. Defensive parsing for resources API response shape.
- **Session wrap:** Sessionlog updated with Context for Next Session for handoff to another machine. Planlog: public calendar/ICS treated as done (sessionlog next-up list updated).

### 2026-02-10 CT - Calendar: one-step create (taxonomy, participants, resources)

**Context for Next Session:**
- **Calendar one-step create** is done: new events can set taxonomy, participants (team + CRM), and resources before first save; all applied on submit. Taxonomy: create mode in `TaxonomyAssignmentForContent` (optional `contentId`). Participants: single type-to-search (AutoSuggestMulti) from full team + CRM; composite ids `team_member:id` / `crm_contact:id`; pending state for new events, POST after create. Resources: multi-select (AutoSuggestMulti); pending resource ids for new events, POST after create. Participants & Resources tab shown for both create and edit (no "save first" gate).
- **Next up:** See sessionlog Ã¢â‚¬â€ Resources CRUD, conflict check, public calendar/ICS, then optional items. Feature guard (32) deferred. Key files: `EventFormClient.tsx`, `EventParticipantsResourcesTab.tsx`, `TaxonomyAssignmentForContent.tsx`, planlog "Calendar event detail Ã¢â‚¬â€œ One-step create".

**Changes:**
- **Taxonomy on new events:** `TaxonomyAssignmentForContent` supports create mode (`contentId` optional); load terms only, controlled state; EventFormClient shows taxonomy tab for new events; taxonomy applied via `setTaxonomyForContent` after POST (unchanged).
- **Participants tab:** Replaced three dropdowns with one AutoSuggestMulti (team + CRM contacts, composite ids). New events: `pendingParticipants` state, applied on submit via POST `/api/events/:id/participants`. Existing events: add/remove via same UI and existing APIs.
- **Resources tab:** Single-select Ã¢â€ â€™ AutoSuggestMulti (multi-select). New events: `pendingResourceIds`, applied on submit via POST `/api/events/:id/resources`. Existing events: add/remove via API.
- **Sessionlog:** Trimmed to lean format; phase checklist and one-step details moved to planlog/changelog.

### 2026-02-09 CT (evening) - Calendar: taxonomy fix, search/filters, sessionlog planning

**Context for Next Session:**
- **Calendar module (admin):** Schema done (events, event_exceptions, participants, resources, junctions). Admin calendar at /admin/events with month/week/day/agenda views, event create/edit form (taxonomy + memberships tabs), cover image, link_url. **Taxonomy fix:** `taxonomy.ts` schema fallback changed from "public" to "website_cms_template_dev" so event categories save correctly.
- **Calendar search and filters:** EventsFilterBar added: row 1 = search input + Reset button (right justified); row 2 = Categories, Tags, Memberships multi-select. Client-side filtering; loads taxonomy terms (event section), MAGs, and taxonomy relationships for visible events. Tags dropdown always visible between Categories and Memberships.
- **Sessionlog planning (docs only):** Added architecture notes (one calendar; participants/resources assigned TO events; view switching = filter). Public vs Internal: event form selector (Public = public calendar, Internal = admin only), maps to event_type; calendar filter checkboxes (Public, Internal); public route only shows event_type='public'. Participant picker: search-based (combobox/modal). Resource picker: same pattern. Resources CRUD: resource table editor as sub-link under Calendar (/admin/events/resources).
- **Next up:** See sessionlog Ã¢â‚¬â€ Feature guard, Public calendar/ICS, Resources CRUD, Participant/Resource pickers, Public vs Internal form control, Recurring events, Conflict checks. Key files: `src/app/admin/events/`, `src/components/events/`, `src/lib/supabase/events.ts`, `src/lib/supabase/taxonomy.ts`, `docs/sessionlog.md`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **taxonomy.ts:** Schema fallback `"public"` Ã¢â€ â€™ `"website_cms_template_dev"` (11 occurrences) so taxonomy_relationships and taxonomy_terms use correct client schema.
- **EventsFilterBar:** New component with search + Reset, Categories/Tags/Memberships filters.
- **EventsPageClient:** Search, filter state; loads taxonomy terms, configs, MAGs, event taxonomy relationships; client-side filtering; Tags always rendered.
- **sessionlog.md:** Architecture notes; Public vs Internal on form and calendar; participant/resource picker as search-based; Resources CRUD as sub-link under Calendar; public route only event_type='public'.

### 2026-02-06 CT (evening) - Gallery per-media MAG filter; Membership and media items planned

**Context for Next Session:**
- **Gallery per-media protection** is implemented: `GET /api/galleries/[id]/public` filters items by mag-tag. `getMagUidsForCurrentUser()` in `content-protection.ts` resolves session Ã¢â€ â€™ member Ã¢â€ â€™ contact Ã¢â€ â€™ MAG uids; `filterMediaByMagTagAccess(mediaIds, userMagUids)` keeps only media the user can see (no mag-tag, or user has matching MAG). Admins/superadmins bypass and see all items. Public gallery with mixed public + membership-tagged media shows different item sets to anonymous vs members with that MAG.
- **Next up (sessionlog):** Membership and media items Ã¢â‚¬â€ (1) Make media assignable to dynamic memberships via **media_mags** table (true protection; mag-tag optional for filtering), API + media item UI membership selector, switch protection logic to media_mags; (2) Red "M" badge on gallery list/grid for membership items; (3) Red "M" badge in media library (list + grid) for items in a membership. See `docs/sessionlog.md` Ã¢â€ â€™ "Membership and media items (up next)."
- **Key files:** `src/lib/mags/content-protection.ts` (getMagUidsForCurrentUser, filterMediaByMagTagAccess), `src/app/api/galleries/[id]/public/route.ts`, `docs/sessionlog.md`, `docs/planlog.md`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Gallery public API:** After `checkGalleryAccess`, response items are filtered by per-media MAG: `getMagUidsForCurrentUser()`, `filterMediaByMagTagAccess(mediaIds, userMagUids)`; admins bypass. Enables public galleries with mixed public/membership media to display different items per viewer.
- **content-protection.ts:** Added `getMagUidsForCurrentUser()` (session Ã¢â€ â€™ member Ã¢â€ â€™ getMagUidsForContact).
- **Docs:** Sessionlog Ã¢â‚¬â€ "Membership and media items (up next)" block added (media_mags, protection rewire, red M badges in gallery and media library). Current Focus set to this work. Planlog Ã¢â‚¬â€ Gallery media bullet updated; "Membership and media items" planned items added.

### 2026-02-06 CT - Tenant admin team (Owner flag, Settings Ã¢â€ â€™ Users) verified; Content Ã¢â‚¬Å“Is MembershipÃ¢â‚¬Â filter

**Context for Next Session:**
- **Tenant admin team management (Settings Ã¢â€ â€™ Users, Owner flag)** is complete and verified: migration 090 (`is_owner` on `tenant_user_assignments`), types/CRUD, `getTeamManagementContext()`, Settings Ã¢â€ â€™ Users link (adminOnly + canManageTeam), `/admin/settings/users` page, GET/POST/PATCH `/api/settings/team`, superadmin `is_owner` in tenant-sites users API, SettingsUsersContent (list, add, role, remove; Owner badge; Remove disabled for Owners unless superadmin). View as Creator correctly hides the Users link.
- **Content tab:** Ã¢â‚¬Å“Is MembershipÃ¢â‚¬Â checkbox filter added (after tags; Reset Filters right-justified); filters list to items with `access_level` members | mag. Migration 092 and Membership column were already in place.
- **Next:** Phase 09 (content protection, membership feature switch) or other sessionlog items. Key files: `docs/sessionlog.md`, `docs/planlog.md`, `src/lib/auth/resolve-role.ts`, `src/app/api/settings/team/route.ts`, `src/app/admin/content/ContentPageClient.tsx`.

**Changes:**
- **Content filter:** `ContentPageClient.tsx` Ã¢â‚¬â€ `filterMembershipOnly` state, Ã¢â‚¬Å“Is MembershipÃ¢â‚¬Â checkbox after tags, included in `hasFilters` and reset; filter row always shown; Reset Filters with `ml-auto`. No new dependencies.
- **Docs:** Sessionlog Ã¢â‚¬â€ First priority (tenant admin team management) marked complete and removed from sessionlog to keep it lean. Planlog Ã¢â‚¬â€ Completed / Reference: added bullet for tenant admin team management (Settings Ã¢â€ â€™ Users, Owner flag). Changelog Ã¢â‚¬â€ this entry.

### 2026-02-03 CT (afternoon) - Membership area, CRM sync on member pages only, CRM fixes, speed docs

**Context for Next Session:**
- **Membership:** Members Area nav (dropdown: Dashboard, Profile, Account) in public header when logged in. Member profile page edits display name and avatar (user_metadata). Apply code block on member dashboard; redeem-code API works when member has `members` row. **Sync (CRM contact + members row) runs only in `src/app/(public)/members/layout.tsx`**, not on every public pageÃ¢â‚¬â€keeps rest of site fast. Membership limited to certain pages for now; shortcode feature will need adjustments (see PRD/planlog).
- **Automations:** New signup Ã¢â€ â€™ CRM contact (status New) via `src/lib/automations/on-member-signup.ts`; triggered from auth callback (type=signup), login page (when session after signUp), and members layout. Duplicate fix: `getContactByEmail` uses `.limit(1)` and returns first row so duplicates no longer cause PGRST116 or re-create contacts.
- **CRM:** Contact delete on detail page (Delete button, DELETE `/api/crm/contacts/[id]`, `deleteContact` in crm.ts). List columns: Last name, First name, Full name, Phone, Status, Updated. Member display name syncs to contact `full_name` when existing contact found. Full name shown in list; formatSupabaseError in getContactByEmail for clearer errors.
- **Public header:** When logged in: Welcome {displayName}, Log Out; Members Area dropdown. AuthUser has optional `display_name` from user_metadata.
- **Docs:** PRD and planlog have Performance (Speed) guidelineÃ¢â‚¬â€notify of features that may slow the system. Member sync and performance and Ã¢â‚¬Å“membership limited to certain pages; shortcode adjustmentsÃ¢â‚¬Â documented. Sessionlog has performance note and handoff. Pagination for CRM list is in sessionlog backlog.
- **Next:** First priority (Tenant admin team management, Settings Ã¢â€ â€™ Users, Owner flag) or Phase 09 content protection / login redirect. Key files: `src/app/(public)/members/layout.tsx`, `src/lib/automations/on-member-signup.ts`, `src/app/admin/crm/contacts/`, `docs/prd.md`, `docs/planlog.md`, `docs/sessionlog.md`.

**Changes:**
- **Public header:** Welcome {displayName} and Log Out when logged in; Members Area dropdown (Dashboard, Profile, Account). `PublicHeaderAuth`, `PublicHeaderMembersNav`; `AuthUser.display_name` in supabase-auth.
- **Automations:** `src/lib/automations/on-member-signup.ts` (ensureMemberInCrm); auth callback and login page trigger; members layout runs sync only (removed from public layout). `getContactByEmail` uses `.limit(1)`; layout try/catch for missing CRM.
- **Member area:** Profile page (display name, avatar URL) via `MemberProfileForm`; Apply code block on dashboard; `createMemberForContact` in members layout so redeem-code works.
- **CRM:** deleteContact in crm.ts; DELETE in `/api/crm/contacts/[id]`; ContactDeleteButton on detail page. List: Full name column, order Last/First/Full name/Phone/Status/Updated. ensureMemberInCrm updates existing contact full_name from member display name.
- **Docs:** PRDÃ¢â‚¬â€Performance (Speed) and Member sync and performance; membership limited to certain pages; shortcode adjustments when implemented. PlanlogÃ¢â‚¬â€Performance guideline at top; Phase 9C Performance bullet; membership limited + shortcode note. SessionlogÃ¢â‚¬â€performance note; member routes step 4 updated; pagination for CRM in backlog.

### 2026-02-03 CT - Auth: password policy, forgot/change password, TOTP on Profile, 2FA optional, invite redirectTo, tenant auth header

**Context for Next Session:**
- **Auth/password/TOTP work done.** Password policy (12 chars, denylist) in `src/lib/auth/password-policy.ts`; forgot password flow (link, `/admin/login/forgot`, `/admin/login/reset-password`) with policy; My Profile change-password card and Security card with TOTP (MFAManagement); 2FA required only for superadmin on login; CRM recommendation banner on Profile; invite redirectTo our reset-password so first password meets policy; tenant site name on auth pages; hardening confirmed. Deeper auth-page design deferred to client site design.
- **Next:** First priority in sessionlog Ã¢â‚¬â€ Tenant admin team management (Settings Ã¢â€ â€™ Users, Owner flag). Key docs: `docs/sessionlog.md`, `docs/planlog.md`.

**Changes:**
- **Password policy:** `src/lib/auth/password-policy.ts` (min 12, max 128, denylist, normalizePassword, validatePassword, buildExtraDenylist).
- **Forgot password:** Login page "Forgot password?" link; `/admin/login/forgot` (request reset); `/admin/login/reset-password` (set new password with policy); success message on login when `?reset=success`.
- **My Profile:** Change password card (current + new + confirm, policy validation); Security card for non-superadmin uses MFAManagement with allowRemoveLastFactor true; CRM 2FA recommendation banner (dismissible) when hasCrmAccess and no factors.
- **MFA:** Enroll redirect when already has factors Ã¢â€ â€™ `/admin/settings/profile`. Login: only superadmin without factors forced to enroll; tenant admins optional.
- **Invite:** POST tenant-sites users and POST settings team pass `redirectTo: origin + /admin/login/reset-password` so invite acceptance uses our policy.
- **Tenant auth pages:** Layout resolves site name when unauthenticated; AdminLayoutWrapper shows tenant site name header on login/forgot/reset-password.
- **Sessionlog:** Top-priority block replaced with completed summary; next up = First priority (Tenant admin team management).

### 2026-02-03 CT - Phase 09 sub-phases (9A, 9E, 9B, 9D) sessionlog; Phase 12 cancelled

**Context for Next Session:**
- **Sessionlog is unchanged** and ready for tomorrow: Phase 09 (membership working), 9C (members & ownership), 9A (code redemption UI), 9E (gallery enhancement), 9B (marketing research), 9D (AnyChat integration) each have ordered steps or plan references. Pick up from **Next up** in `docs/sessionlog.md`.
- **Phase 12 (Visual Component Library):** Cancelled in planlog. We use the simple Code Library (code blocks/snippets), not a visual component catalog or page section editor; all Phase 12 items marked N/A.
- **Key docs:** `docs/sessionlog.md` (next steps), `docs/planlog.md` (Phase 09 overview table, 9A/9C/9E Ã¢â‚¬Å“What we built vs what we need,Ã¢â‚¬Â 9B/9D full scope, Phase 12 cancelled).

**Changes:**
- **Planlog:** Phase 9A Ã¢â‚¬Å“What we built vs what we needÃ¢â‚¬Â and Phase 9E same (with built/still-needed bullets); Phase 9E overview table and checkboxes updated; Phase 12 status set to Cancelled, all items marked [x] N/A (retained for reference).
- **Sessionlog:** Phase 9A steps (member Apply code, login access code, no-ambiguous preset); Phase 9E steps (external video embed, thumbnail strip, taxonomy filter, shortcode UX, deferred); Phase 9B block (research 2 email platforms, plan reference); Phase 9D block (review AnyChat docs, add integration, plan reference). Sessionlog kept as-is for next session.

### 2026-02-03 CT - View as Role + Site, sub-level feature guards, Roles UI hierarchy

**Context for Next Session:**
- **View as Role + Site** is implemented and tested: Superadmin dashboard card (Site + Role selector), cookie override, red banner with Exit, layout uses `getEffectiveFeatureSlugs(tenantId, roleSlug)` when active; Superadmin link stays visible. No git push this session.
- **Feature hierarchy:** Top-level ON = all sub-items allowed (sidebar + route guard); top-level OFF = only explicitly enabled sub-items. Sub-routes mapped (contacts, marketing, forms, memberships, code_generator); `canAccessFeature` and FeatureGuard use parent slug so having CRM grants all CRM sub-routes.
- **Roles & Features UI:** Toggling a top-level (e.g. CRM) ON turns on all its sub-items; toggling OFF turns off all sub-items. Operator can then turn individual sub-items on manually. Applies to all top-level sections.
- **Next:** Smoke-test core flows; Settings Ã¢â€ â€™ Team; or add new items to sessionlog. Sessionlog cleared to a clean slate.

**Changes:**
- View as Role + Site: `src/lib/admin/view-as.ts`, layout override in `admin/layout.tsx`, banner + Exit in `AdminLayoutWrapper`, `ViewAsCard` on Superadmin page; force-dynamic layout; guard when view-as active never pass "all".
- Sub-level guards: `pathToFeatureSlug` for contacts, marketing, forms, memberships, code_generator, listsÃ¢â€ â€™marketing; sidebar CRM/Media sub-nav by featureSlug; `FEATURE_PARENT_SLUG` and `canAccessFeature` parent rule; FeatureGuard uses `canAccessFeature`.
- RolesManager: top-level toggle adds/removes parent + all children; help text updated. Planlog View as Role + Site checked off.

### 2026-02-03 CT - Sessionlog cleanup; View as Role + Site planned

**Context for Next Session:**
- **Sessionlog is now lean.** Removed completed build-plan items, long MVP checklist, terminology table, route/table renames, and Superadmin layout detail. Sessionlog keeps only: current focus, next up, and View as Role + Site (planned). For full history and backlog use `planlog.md` and `changelog.md`.
- **Done (lives in planlog/changelog only):** Effective features (sidebar filter + FeatureGuard modal), profile (migration 087, Settings Ã¢â€ â€™ Profile), dynamic header (site + role), content editor full page, migrations 081Ã¢â‚¬â€œ087, tenant sites/users/roles UI, route renames. No need to re-read these in sessionlog.
- **Next:** Smoke-test core flows; then Settings Ã¢â€ â€™ Team or View as Role + Site implementation. View as Role + Site spec is in sessionlog (short) and planlog (Phase 18b).

**Changes:**
- **Sessionlog:** Pruned to ~50 lines. Kept: workflow, current focus, next up, View as Role + Site (planned), handoff pointer. Removed: MVP "What's left" list, build plan with done/remaining checkboxes, terminology table, route and table renames, Superadmin layout bullets.
- **Changelog:** This entry added.

### 2026-02-03 CT - Session wrap: Coming Soon snippet, Tiptap alignment, Site Mode UX

**Context for Next Session:**
- **Migrations 088 & 089:** If not yet run, copy `supabase/migrations/088_tenant_sites_coming_soon_message.sql` and `089_tenant_sites_coming_soon_snippet_id.sql` into Supabase SQL Editor and run in order. Adds `coming_soon_message` and `coming_soon_snippet_id` to `tenant_sites`.
- **Priority next step** (sessionlog): Change content creation editor from **modal to full page** with a **back button top left**; modal is too small. Tracked in planlog under Admin content UI.
- **Coming Soon:** Site Mode (General Settings + Superadmin Ã¢â€ â€™ Tenant Sites Ã¢â€ â€™ detail) uses a **snippet dropdown** (Content library, type Snippet). Coming Soon page renders the selected snippet with formatting, links, images, galleries when set; otherwise falls back to headline/message from settings. Snippets API: `GET /api/settings/snippets`, `GET /api/admin/tenant-sites/[id]/snippets`.
- **Tiptap:** Rich text editor has **left/center/right/justify** alignment in toolbar; `@tiptap/extension-text-align@2.1.13`; same extension in `ContentWithGalleries` for public render.
- **Key files:** `GeneralSettingsContent.tsx`, `TenantSiteModeCard.tsx`, `src/app/(public)/coming-soon/page.tsx`, `RichTextEditor.tsx`, `ContentWithGalleries.tsx`, `src/lib/supabase/tenant-sites.ts`, `src/lib/supabase/content.ts` (getSnippetOptions, getContentByIdServer), site-mode API routes, `ComingSoonSnippetView.tsx`.
- No RLS or DB left in a vulnerable state.

**Changes:**
- **Coming Soon (snippet-based):** Migrations 088 (coming_soon_message), 089 (coming_soon_snippet_id). Types and CRUD for both; site-mode GET/PATCH return/accept coming_soon_snippet_id. Snippet dropdown (Select) in General Settings and TenantSiteModeCard; options from GET snippets APIs. Coming Soon page fetches snippet by id when set and renders via ComingSoonSnippetView; else uses getComingSoonCopy(). Radix Select "None" uses value `__none__` (empty string not allowed). updateTenantSite returns `{ ok, error }` so API can return real DB errors to client.
- **Tiptap text alignment:** Added @tiptap/extension-text-align; toolbar buttons (AlignLeft, AlignCenter, AlignRight, AlignJustify) in RichTextEditor; TextAlign in ContentWithGalleries EXTENSIONS for generateHTML.
- **Sessionlog:** "Priority next step" Ã¢â‚¬â€ Content editor modal Ã¢â€ â€™ full page with back button. **Planlog:** Unchecked item under Admin content UI for same.

### 2026-02-03 CT - Session wrap: quick wins (migration 085, remove Integrations from Superadmin)

**Context for Next Session:**
- **Migration 085** (`supabase/migrations/085_client_admins.sql`) is added but not run. When ready: copy contents into Supabase SQL Editor and run. Tables: `client_admins` (id, user_id, email, display_name, status), `client_admin_tenants` (admin_id, tenant_id, role_slug). Next step is types + lib + auth/session resolution for these tables (step 1 in sessionlog).
- **Integrations** removed from Superadmin: sidebar no longer shows Integrations link; Superadmin dashboard card for Integrations removed. Header scripts (GA, VisitorTracking, SimpleCommenter) remain in Code Snippets / integrations table; route `/admin/super/integrations` and API still exist if needed.
- **Build plan** in sessionlog unchanged: after running 085, do client_admins lib + auth resolution, then tabbed Dashboard, Users page, etc.

**Changes:**
- Added `supabase/migrations/085_client_admins.sql`: `client_admins`, `client_admin_tenants` tables; grants to authenticated and service_role.
- Sidebar: removed Integrations from `superadminSubNav`; updated comment.
- Superadmin dashboard (`/admin/super`): removed Integrations card.
- Sessionlog: noted quick wins in Done; step 1 migration checkbox; step 2 Integrations done.

### 2026-02-03 CT - Modular design, feature boundaries, per-module version marking (docs)

**Changes:**
- **PRD:** New subsection Ã¢â‚¬Å“Modular Design & Feature BoundariesÃ¢â‚¬Â (after Deployment Model). Code organized by product feature so each feature can be identified and updated or selectively synced to forks; principle Ã¢â‚¬Å“one feature Ã¢â€°Ë† one coherent boundary.Ã¢â‚¬Â Light **version marking (per module)** documented Ã¢â‚¬â€ forks may diverge, so version control can be per module (comment header or manifest) to compare and selectively update.
- **prd-technical:** New section 8 Ã¢â‚¬Å“Feature Boundaries & Modular Code MapÃ¢â‚¬Â with feature Ã¢â€ â€™ paths table (Content, CRM, Media, Galleries, Forms, Settings, Auth/MFA, Superadmin, Public). New subsection Ã¢â‚¬Å“Version Marking (Per Module)Ã¢â‚¬Â with options A (comment header), B (manifest), C (Git); recommend Option A to start.
- **planlog:** New phase Ã¢â‚¬Å“Code Review, Security, Optimization & Modular AlignmentÃ¢â‚¬Â Ã¢â‚¬â€ documentation (design) items checked; security review, optimization pass, modular alignment (refactor), and optional version marking as unchecked tasks.

**Key files:** `docs/prd.md`, `docs/prd-technical.md`, `docs/planlog.md`.

### 2026-02-03 CT - Session wrap: build fixes, tenant roles/features/team/profile plan

**Context for Next Session:**
- **Build passes:** Lint and type errors fixed across multiple files (Link usage, escaped entities, script/API/auth types, login Suspense for useSearchParams). `pnpm run build` completes successfully.
- **MVP plan in sessionlog:** Tenant roles, feature scope, team, and profile. Seven-step plan: (1) feature registry + role_features, (2) tenant features + getEffectiveFeatures, (3) Phase 03 client_tenants/client_admins/client_admin_tenants + role, (4) superadmin UI (roles, tenant features, assign users), (5) sidebar/route enforcement, (6) Settings Ã¢â€ â€™ Team (tenant admin adds Editor/Creator/Viewer only), (7) profile pages (super under Superadmin; admin/team under Settings). Execute in that order.
- **Key files:** `docs/sessionlog.md` (plan and focus), `docs/planlog.md` (Phase 03, 18, 18b reference). No DB or RLS left in a vulnerable state.

**Changes:**
- Code: ESLint/TypeScript fixes (super page Link; MFAChallenge, FormEditor, ColorsSettings, FontsSettings escaped entities; add-gallery script, galleries page, CRM mags, form submit, galleries mags route, redeem-code route, supabase-auth, content-protection, code-snippets, galleries-server, galleries.ts, licenses; login and admin/login Suspense for useSearchParams). Build succeeds.
- Docs: sessionlog updated with full roles/features/team/profile plan and profile step; completed items (donor folder, build passes) pruned from sessionlog. MVP focus = execute plan steps 1Ã¢â‚¬â€œ7.

### 2026-01-30 CT - PRD and planlog: specs and planning (no code changes)

**Context for Next Session:**
- **Documentation-only session.** Significant updates to PRD and planlog to capture product and technical specs for future development. No code or migrations changed.
- **Planning added/updated:** Page composition (sections in public schema; content UUID/title); RAG Knowledge Document (Phase 16a), Digicards (Phase 11b); central automations layer (trigger/response); FAQ block content type; color palette refactor (preset library in public schema); reusable sections/component library in public schema; **Tenant Team Members, roles & profile** (Phase 18b Ã¢â‚¬â€ Creator role, per-role feature set, team member profile as source for Digicards; Team Ã¢â€°Â  CRM).
- **Next priorities** unchanged: Phase 11 Deployment Tools, reusable components; implement specs when ready.

**Key Files Changed:**
- `docs/prd.md` Ã¢â‚¬â€ Tenant Team Members & Roles (Creator, per-role feature set, custom roles, team member profile; Team Ã¢â€°Â  CRM); Color Palette (central preset table in public); Page composition (sections library in public schema); Admin Users = Team Members; MAG vs Roles updated
- `docs/planlog.md` Ã¢â‚¬â€ Phase 00 (creator role); Phase 01 (color palette refactor: central preset in public); Phase 06 (page composition sections in public, FAQ block, content UUID); Phase 07 (central automations layer); Phase 11b (Digicards Ã¢â€ â€ team profile); Phase 12 (component library in public schema); Phase 16a (RAG Knowledge Document); Phase 18 (per-role note); Phase 18b (Tenant Team Members, Roles & Profile)

**Changes:**
- PRD: Team members & roles (Creator, editor, viewer, client_admin; custom roles; per-role feature set); team member profile (access + Digicards source); Team Ã¢â€°Â  CRM. Color palette and sections library: central tables in public schema.
- Planlog: New/expanded phases and tasks for automations, FAQ block, color palette refactor, sections in public, RAG, Digicards, and Phase 18b (team, roles, profile).

### 2026-01-30 CT - Session wrap: Code Generator Explore page, RAG + Digicards planning

**Context for Next Session:**
- **Code Generator complete** (admin-side): Create batches, generate codes, redeem via API. "Explore" button opens dedicated batch detail page (`/admin/crm/memberships/code-generator/batches/[id]`) with redemption table and contact links. Testing pending: create a batch and redeem to verify.
- **Next priorities:** (1) Phase 11 Deployment Tools (setup, reset, archive scripts), (2) Reusable components + component library for public pages.
- **Planning added:** Phase 16a (RAG Knowledge Document for external AI agents), Phase 11b (Digicards).
- **Deferred:** End-to-end membership testing until public pages exist.

**Key Files Changed:**
- `src/app/admin/crm/memberships/code-generator/batches/[id]/page.tsx` Ã¢â‚¬â€ new batch detail page
- `src/app/admin/crm/memberships/code-generator/batches/[id]/BatchExploreClient.tsx` Ã¢â‚¬â€ client component for redemption table
- `src/app/admin/crm/memberships/code-generator/CodeGeneratorClient.tsx` Ã¢â‚¬â€ "Explore" button, removed codes modal
- `src/app/api/admin/membership-codes/batches/[id]/codes/route.ts` Ã¢â‚¬â€ added contact_id to response
- `docs/planlog.md` Ã¢â‚¬â€ Phase 9A codes API checked off; Phase 16a, 11b added

**Changes:**
- Code Generator: "View table" Ã¢â€ â€™ "Explore" button; dedicated page with Code, Status, Contact/Email (link to contact), Redeemed timestamp.
- Planlog: Phase 16a (RAG Knowledge Document Export), Phase 11b (Digicards).

### 2026-01-30 CT - Session wrap: Membership, Code Generator, Phase 11 priority

**Context for Next Session:**
- **Synced to planlog:** Multi-MAG schema (gallery_mags junction), GalleryEditor Membership Protection, gallery MAG access (checkGalleryAccess, standalone + API), Member login page.
- **Phase reorder:** Phase 11 (Deployment Tools) before Phase 10 (API). API dev deferred until component structure exists.
- **Next priorities:** (1) Membership wrap-up (items not requiring public pages), (2) Phase 9A Code Generator, (3) Phase 11 Deployment Tools, (4) Reusable components + component library for public pages.
- **Deferred:** End-to-end membership testing until public pages exist for reliable testing.
- **Sessionlog** pruned and updated with new focus.

**Key Files Changed:**
- `docs/sessionlog.md` Ã¢â‚¬â€ rewritten with new priorities
- `docs/planlog.md` Ã¢â‚¬â€ checked off completed items, Phase 10/11 status updated

### 2026-01-30 CT - Gallery Phase 2: ImagePreviewModal assign media to galleries

**Context for Next Session:**
- **Gallery Phase 2** complete. ImagePreviewModal has "Assign to galleries" section: checkbox badges for published galleries, add/remove media via gallery_items. Migrations 071Ã¢â‚¬â€œ073 ran successfully.
- **Next:** Gallery Phase 3 (GalleryEditor media picker with taxonomy filter), or Phase 4 (shortcode spec, parser, GalleryRenderer).

**Key Files Changed:**
- `src/lib/supabase/galleries.ts` Ã¢â‚¬â€ getPublishedGalleries, getGalleriesForMedia, addMediaToGallery, removeMediaFromGallery
- `src/components/media/ImagePreviewModal.tsx` Ã¢â‚¬â€ Assign to galleries section with checkbox badges

**Changes:**
- Galleries lib: getPublishedGalleries, getGalleriesForMedia (with gallery name/slug), addMediaToGallery, removeMediaFromGallery.
- ImagePreviewModal: Assign to galleries section; load published galleries and current assignments; toggle to add/remove media from galleries.

### 2026-01-30 CT - Members Table & Ownership (User Licenses)

**Context for Next Session:**
- **Phase 9C (Members & Ownership)** implemented: `members` and `user_licenses` tables, utilities, types. Migrations 072, 073 ready to run in Supabase SQL Editor. See `docs/reference/members-and-ownership-summary.md` for design.
- **Elevation flow:** Simple signup = contact only. Member = purchase OR admin grant OR signup code. Form `auto_assign_mag_ids` only for qualifying forms.
- **Next:** Run migrations 072 and 073 in Supabase; continue Gallery Enhancement Phase 2 (ImagePreviewModal assign media to galleries) or Phase 9A Code Generator (requires members table).

**Key Files Changed:**
- `supabase/migrations/072_members_table.sql` Ã¢â‚¬â€ members(contact_id, user_id nullable), RLS
- `supabase/migrations/073_user_licenses_table.sql` Ã¢â‚¬â€ user_licenses(member_id, content_type, content_id), RLS
- `src/lib/supabase/members.ts` Ã¢â‚¬â€ getMemberByContactId, getMemberByUserId, createMemberForContact, resolveMemberFromAuth
- `src/lib/supabase/licenses.ts` Ã¢â‚¬â€ hasLicense, grantLicense, revokeLicense, getMemberLicenses, filterMediaByOwnership
- `src/types/database.ts` Ã¢â‚¬â€ members, user_licenses types
- `docs/reference/members-and-ownership-summary.md` Ã¢â‚¬â€ design summary
- `docs/planlog.md` Ã¢â‚¬â€ Phase 9C added and items checked off
- `docs/sessionlog.md` Ã¢â‚¬â€ Phase 9C items completed

**Changes:**
- Members table: qualified contacts (MAG + auth). Existence of row = member; user_id nullable until register.
- User licenses table: per-item ownership for media and courses (iTunes-style "My Library"). Access: MAG OR ownership.
- Members utilities: getMemberByContactId, getMemberByUserId, createMemberForContact (idempotent), resolveMemberFromAuth.
- Licenses utilities: hasLicense, grantLicense, revokeLicense, getMemberLicenses, filterMediaByOwnership.

### 2026-01-30 CT - MAG mag-tag creation, content-protection helper, Gallery Enhancement plan

**Context for Next Session:**
- **Gallery Enhancement** is the priority. Start with Phase 1: migration for galleries (status, access_level, required_mag_id), GalleryEditor status field. Then Phase 2: ImagePreviewModal assign media to galleries; Phase 3: taxonomy filter in gallery media picker; Phase 4Ã¢â‚¬â€œ6: shortcode, builder UIs, public page. Full plan in planlog "Gallery Enhancement" section.
- **Membership protection testing** depends on galleries being functional. After galleries: member auth, checkContentAccess, filter gallery items by mag-tag, end-to-end testing.
- **MAG mag-tags:** On MAG create/update, taxonomy tag `mag-{uid}` auto-created in image, video, membership sections. Existing MAGs: save on detail view creates tag.
- **content-protection.ts:** Helper to resolve mag-tags on media, check user MAGs for visibility. Ready for gallery API integration once member auth exists.

**Key Files Changed:**
- `src/lib/supabase/taxonomy.ts` Ã¢â‚¬â€ ensureMagTagExists, addMagTagSlugToSections, membership section
- `src/lib/mags/content-protection.ts` Ã¢â‚¬â€ getMagTagSlugsOnMedia, canAccessMediaByMagTags, filterMediaByMagTagAccess, getMagUidsForContact
- `src/app/api/crm/mags/route.ts` Ã¢â‚¬â€ call ensureMagTagExists after create
- `src/app/api/crm/mags/[id]/route.ts` Ã¢â‚¬â€ call ensureMagTagExists after update
- `src/app/admin/crm/memberships/[id]/MAGDetailClient.tsx` Ã¢â‚¬â€ Dialog warning when UID/MAG-TAG changed (unsync relations, manual update)
- `supabase/migrations/070_add_membership_taxonomy_section.sql` Ã¢â‚¬â€ membership section for mag-tag grouping
- `docs/planlog.md` Ã¢â‚¬â€ Gallery Enhancement phase (7 phases)
- `docs/sessionlog.md` Ã¢â‚¬â€ focus galleries first, then membership

**Changes:**
- MAG create/update: auto-create taxonomy tag `mag-{uid}` in image, video, membership sections. Idempotent.
- Membership taxonomy section: new staple section for filtering mag-tags in Taxonomy Settings.
- MAGDetailClient: UID/MAG-TAG change warning dialog (relations unsync, manual update needed).
- content-protection: resolve mag-tags on media, filter by user MAGs for visibility.
- Gallery Enhancement plan: schema, assignment (mediaÃ¢â€ â€galleries), shortcode (spec, parser, renderer), builder UIs, public page.

### 2026-01-29 22:45 CT - Contact Detail UI Restructure & Memberships Complete

**Context for Next Session:**
- **Memberships (CRM MAG management):** Complete and tested. List/detail/create/edit MAGs, assign from MAG detail and from contact detail, draft visibility, search with auto-suggest, confirmation dialogs.
- **Contact Detail UI:** Restructured following design reference. Main card: name+company top left, clickable status badge + Edit top right, two columns (Contact Info with Person icon row | Address), Form Submission Message with Copy to Notes. Tabbed section below: Notes | Taxonomy | Custom Fields | Marketing Lists | Memberships. Tab content cards sized appropriately.
- **Developer Cheatsheet:** Created `.cursor/rules/cheatsheet.mdc` with common commands (kill Node processes, port management, Next.js cache clearing) and useful links (docs, Supabase, tools). Localhost section at top for quick access.
- **Ready for:** Mag-tag restriction for media/galleries (auto-create `mag-{uid}` tags, filter gallery by user's MAGs).

**Key Files Changed:**
- `src/app/admin/crm/contacts/[id]/page.tsx` - Restructured layout, added Person icon row with last name + full name
- `src/app/admin/crm/contacts/[id]/ContactDetailTabs.tsx` - New tabbed interface component
- `src/app/admin/crm/contacts/[id]/ContactDetailClient.tsx` - Added `activeSection` prop, modal confirmation for MAG removal, clear button for search, useEffect to sync notes on refresh
- `src/app/admin/crm/contacts/[id]/ContactCardStatusBadge.tsx` - Clickable status badge with modal
- `src/app/admin/crm/contacts/[id]/CopyMessageToNotesButton.tsx` - Already had router.refresh()
- `.cursor/rules/cheatsheet.mdc` - New developer reference file
- `docs/sessionlog.md` - Pruned completed items, updated for next session
- `docs/planlog.md` - Phase 09 status updated to Complete

**Changes:**
- **Contact Detail Layout:** Name + company at top left; clickable status badge (opens modal) + Edit button at top right; two columns: Contact Information (Person icon with last name, full name | Email | Phone | Company) and Address (Street | City, State, ZIP); Form Submission Message section below with Copy to Notes button.
- **Tabbed Interface:** Notes, Taxonomy, Custom Fields, Marketing Lists, Memberships tabs. Each tab renders in a card (min-height 450px). State preserved when switching tabs (one ContactDetailClient instance with activeSection prop).
- **Memberships Tab:** Search bar with clear button (X when text entered), auto-suggest dropdown, modal confirmation dialog when removing membership (not suppressed by Cursor browser).
- **Copy to Notes:** Added useEffect to sync notes state when initialNotes changes, so Notes tab updates immediately after copy.
- **Cheatsheet:** Commands for killing Node processes, checking ports, clearing Next.js cache, full clean restart. Links to Next.js, React, TypeScript, Tailwind, shadcn/ui, Supabase, Lucide icons, dev tools.

### 2026-01-29 - CRM wrap-up; sessionlog pruned; next: memberships
- **Context for Next Session:** CRM Custom Fields section is complete (form filter, persist accordion open state, PATCH custom-fields API, inline edit per row). Sessionlog synced to planlog and pruned; items that will be implemented with memberships remain in sessionlog. **Next:** Membership code Ã¢â‚¬â€ Memberships page (`/admin/crm/memberships`), MAG list/select/contacts, list/create/edit MAGs; then Review walk-through; Boei integration in a future session.
- **Updated:** `docs/sessionlog.md` Ã¢â‚¬â€ Wrapped up CRM (Custom Fields form filter, persist open, inline edit, API). Checked off and removed completed items; kept Ã‚Â§4 Memberships (MAG tables/RPCs, mags.ts, Admin Memberships page), Ã‚Â§5 Review, Ã‚Â§6 Boei for next work. Current focus set to memberships.
- **Synced:** Completed sessionlog steps matched and checked in `docs/planlog.md` (Phase 08 Custom Fields already marked done).
- **Note:** Doc(s) moved to `docs/archived` to keep root clean (per user).

### 2026-01-28 (session wrap-up) - CRM/forms evaluation; Boei next session
- **Context for Next Session:** CRM and forms in good shape. This session: evaluation and sessionlog update (sidebar "New" badge, fixed "New" status, status on Taxonomy card, contact list columns/sort/clickable row, form submit API and submissions list). **Next up:** Optional Custom Fields form filter; Phase 09 Memberships; full review walk-through. **Next session:** Review [Boei](https://boei.help/) docsÃ¢â‚¬â€page widget (forms, links, chatbot); use Boei API to add forms/submissions into CRM. Sessionlog Ã‚Â§6 has the Boei review task.
- **Updated:** `docs/sessionlog.md` Ã¢â‚¬â€ Added Ã‚Â§6 Next session: Boei integration (review); Context updated for handoff.

### 2026-01-28 (evaluation) - CRM and forms completed; sessionlog updated
- **Context for Next Session:** CRM and forms are in good shape. **Completed (this session / evaluation):** Sidebar "New" badge (red counter on CRM header, slug `new`; fixed "New" status in Settings Ã¢â€ â€™ CRMÃ¢â‚¬â€non-deletable, slug read-only); status selector on contact detail Taxonomy card (Save persists status + taxonomy, `router.refresh()` updates Contact card); contact list columns (Last name, First name, Email, Phone, Status, Updated), sort by last name, whole row clickable to view; form submit API and submissions list (`/admin/crm/forms/submissions`). **Next up:** Optional Custom Fields form filter on contact detail; Phase 09 Memberships (MAG list, select MAG Ã¢â€ â€™ contacts) if not done; then full review walk-through.
- **Updated:** `docs/sessionlog.md` Ã¢â‚¬â€ Added "Completed (this session / evaluation)" summary; checked off form submission API, form submissions view, and Contact Status Ã‚Â§8; reordered Forms Ã‚Â§3 (submit + submissions done, filter-by-form deferred); updated Context for changelog handoff.

### 2026-01-28 17:30 CT - Session wrap-up: Forms page fixes, custom field types, form-field assignment plan
- **Context for Next Session:** Forms page (`/admin/crm/forms`) fixed and extended. **Error fetching forms** resolved: `forms` table lacked `auto_assign_tags` / `auto_assign_mag_ids`; migration 059 added those columns. `forms.fields` NOT NULL caused "null value in column fields" on create; migration 060 made `fields` nullable + default `[]`. Removed `.from()` fallback in `getForms` (prd-technical: reads via RPC only). Added `formatSupabaseError` in crm.ts for clearer RPC errors. Custom field types: **select** and **multiselect**; options in `validation_rules.options` (one per line in UI). Forms tab: add/edit/delete form definitions (name, slug). **Next up:** **Assign form fields to form** Ã¢â‚¬â€ Form = logical grouping of custom fields. Steps in `sessionlog.md` Ã‚Â§3 (migration for formÃ¢â‚¬â€œfield link, RPC/crm.ts, Forms UI multi-select, API). **Filter by form on contact Custom Fields tab** deferred until form-field assignment is done.
- **Updated:** `sessionlog.md` Ã¢â‚¬â€ Form registry (list, new, edit) marked done and pruned; added "Assign form fields to form" (migration, RPC, UI, API) and "Filter by form on contact Custom Fields tab (later)". Context for next session.
- **Updated:** `planlog.md` Ã¢â‚¬â€ Phase 08 form registry UI marked done (Custom Fields + Forms tabs, select/multiselect, migrations 059/060); added "Assign form fields to form" and optional contact-filter steps.
- **Updated:** `src/lib/supabase/crm.ts` Ã¢â‚¬â€ `formatSupabaseError`, `getForms` RPC-only (no `.from()` fallback).
- **Updated:** `src/app/admin/crm/forms/CrmFormsClient.tsx` Ã¢â‚¬â€ Custom field types select/multiselect; options textarea in modal; `validation_rules.options` on save.
- **Added:** `supabase/migrations/059_add_missing_forms_columns.sql` Ã¢â‚¬â€ add `auto_assign_tags`, `auto_assign_mag_ids` to `forms`.
- **Added:** `supabase/migrations/060_fix_forms_fields_column.sql` Ã¢â‚¬â€ make `forms.fields` nullable, default `[]`.

### 2026-01-26 19:00 CT - Session wrap-up: Phase 05 check-off, build/runtime fixes, docs
- **Context for Next Session:** Content phase (1Ã¢â‚¬â€œ13) complete. Dev server runs clean; `/admin/content` loads without Fast Refresh full-reload errors. **Phase 05** (Media Library) checked off in planlog; **Phase 06** (Content, legacy redirects) done. **Fixes this session:** `@radix-ui/number` added as explicit dependency (resolve "Module not found" build error); Content page split into `ContentPageClient` + server `page` with `<Suspense>` around `useSearchParams` (fix "Fast Refresh had to perform a full reload due to a runtime error"). Sessionlog cleared; planlog and changelog updated.
- **Updated:** `planlog.md` Ã¢â‚¬â€ Phase 05 marked complete (core), deferred items noted; "Phase 05 created: media, media_variants" in schemas section.
- **Updated:** `package.json` Ã¢â‚¬â€ `@radix-ui/number` ^1.1.1.
- **Updated:** `admin/content` Ã¢â‚¬â€ `ContentPageClient.tsx` (client, `useSearchParams`), `page.tsx` (server, `Suspense` wrapper).
- **Updated:** `sessionlog.md` Ã¢â‚¬â€ pruned completed steps; Current Focus / Next Up reset for next session.

### 2026-01-26 17:15 CT - Legacy routes redirect (Step 12)
- **Context for Next Session:** Step 12 complete. `/admin/posts`, `/admin/posts/new`, `/admin/posts/[id]` redirect to `/admin/content?type=post`; `/admin/pages` redirects to `/admin/content?type=page`. Content page reads `?type=` and sets type filter. Phase 06 content work done. `PostEditor` unused (can remove later).
- **Updated:** `admin/content/page.tsx` Ã¢â‚¬â€ `useSearchParams`, `useEffect` to set `typeFilter` from `?type=`.
- **Replaced:** `admin/posts/page`, `admin/posts/new/page`, `admin/posts/[id]/page` Ã¢â‚¬â€ redirect to `/admin/content?type=post`.
- **Added:** `admin/pages/page.tsx` Ã¢â‚¬â€ redirect to `/admin/content?type=page`.

### 2026-01-26 16:45 CT - Public blog/page routes (Step 11)
- **Context for Next Session:** Step 11 complete. Public routes: homepage `/` (page slug `/` or fallback), blog list `/blog`, single post `/blog/[slug]`, dynamic pages `/[slug]`. `RichTextDisplay` renders Tiptap JSON Ã¢â€ â€™ HTML with prose. `generateMetadata` for post/page titles. Duplicate `app/page.tsx` removed; `(public)/page` is sole homepage. Added `@tiptap/core` for `generateHTML`. Next: legacy redirects (12).
- **Added:** `RichTextDisplay` (StarterKit, Image, Link; `generateHTML` + prose), `(public)/blog/page`, `(public)/blog/[slug]/page`, `(public)/[slug]/page`.
- **Updated:** `(public)/page` Ã¢â‚¬â€ fetch page `/`, render or fallback; `package.json` Ã¢â‚¬â€ `@tiptap/core`.
- **Removed:** `app/page.tsx` (use `(public)/page` only).

### 2026-01-26 15:30 CT - Settings twirldown, sub-page routing, Content Types/Fields placeholders
- **Context for Next Session:** Settings is now a sidebar twirldown with sub-pages (General, Fonts, Colors, Taxonomy, Content Types, Content Fields, Security, API). Default settings page is General. Content Types and Content Fields are placeholders for the content phase. Sidebar + settings routing ready before building the content system.
- **Sidebar**
  - Settings is a twirldown: link to `/admin/settings` (redirects to General) + chevron to expand/collapse. Sub-links: General, Fonts, Colors, Taxonomy, Content Types, Content Fields, Security, API (order as specified).
  - Persist open state in `localStorage` (`sidebar-settings-open`). When on any `/admin/settings` route, keep twirldown open and set stored state to open.
- **Settings routing**
  - `/admin/settings` redirects to `/admin/settings/general`. New sub-pages: `general`, `fonts`, `colors`, `taxonomy`, `content-types`, `content-fields`, `api`. `security` unchanged.
  - Fonts/Colors: server page fetches `getDesignSystemConfig`, client wrapper holds state and saves via `POST /api/admin/settings/design-system`. Taxonomy remains `TaxonomySettings` on its own page.
  - General and API: migrated from former tabs. Content Types and Content Fields: placeholder cards (manage types; manage custom fields per type).
- **Removed** `SettingsTabs`; MFA enroll redirect when user has factors now goes to `/admin/settings/security`.
- **Files:** `Sidebar.tsx`, `settings/page.tsx` (redirect), `settings/general|fonts|colors|taxonomy|content-types|content-fields|api/page.tsx`, `FontsSettingsPageClient`, `ColorsSettingsPageClient`, `api/api-base-url.tsx`, `mfa/enroll/page.tsx`.

### 2026-01-26 14:00 CT - SimpleCommenter documented as dev feedback tool (not blog comments)
- **Context for Next Session:** SimpleCommenter is explicitly documented as a development/client feedback tool for pinpoint annotations on the site during dev/staging. It must be disabled in production. It is not a blog comment system; blog comments are a separate, future consideration.
- **Added:** `prd.md` Ã¢â‚¬â€ "Third-Party Integrations" section describing Google Analytics, VisitorTracking.com, and SimpleCommenter (purpose, when to enable/disable, "not blog comments").
- **Added:** `prd-technical.md` Ã¢â‚¬â€ "SimpleCommenter (simple_commenter)" subsection under Integrations (purpose, config, script injection, blog comments clarification).
- **Updated:** `IntegrationsManager.tsx` Ã¢â‚¬â€ SimpleCommenter description: "Client feedback tool for dev/staging: pinpoint annotations on the site. Disable in production. Not for blog comments."
- **Updated:** `integrations.ts` Ã¢â‚¬â€ JSDoc; `(public)/layout.tsx` Ã¢â‚¬â€ comment above SimpleCommenter script.
- **Updated:** `planlog.md` Ã¢â‚¬â€ Script injection bullet now states SimpleCommenter is dev feedback, disable in production, not blog comments.

### 2026-01-24 23:30 CT - Media Library: Images/Videos, Taxonomy Filters, Upload Modal, Video Placeholder
- **Context for Next Session:** Media library now supports images and videos end-to-end. View mode (Images/Videos/All), taxonomy filter row (Categories/Tags, Reset Filters), and Upload Media modal with file upload (images + video, auto-detect) and Add Video URL. Migration 040 adds `media_type` and `video_url`; RPCs updated (DROP then CREATE for return-type change). Grid shows Video icon placeholder when `media_type === 'video'` and no thumbnail. Optional follow-ups: ImagePreviewModal video-specific view, section configs for images/videos, UI to assign taxonomy to media.
- Migration 040 fix and media type support
  - Fixed "cannot change return type" error: DROP custom-schema wrappers and public RPCs before CREATE; recreate wrappers with `media_type`/`video_url` in return, re-grant execute
  - `040_add_media_type_and_video_url.sql`: adds `media_type`, `video_url` to media; updates `get_media_with_variants`, `get_media_by_id`, `search_media` (public + wrappers)
  - Types and `createMedia` already support `media_type`/`video_url`; RPC mapping in `media.ts` returns them
- Step 2: View mode and Upload Media button
  - Header: type dropdown (Images/Videos/All) same line as title, "Upload Media" button, stats use "images"/"videos"/"items" by mode
  - Wrapper: `viewMode` state, filter by `media_type`, persist `mediaLibraryViewMode`, bulk delete "items" wording
- Step 3: Taxonomy filter row
  - Filter row above search: Categories multi-select, Tags multi-select, Reset Filters (clears categories, tags, search; not view mode)
  - `getMediaTaxonomyRelationships(mediaIds)`, `getTermsForMediaViewMode(terms, configs, viewMode)` in taxonomy lib
  - `TaxonomyMultiSelect` dropdown (checkboxes), filter media by selected terms via `taxonomy_relationships`
- Step 4: Upload Media modal Ã¢â‚¬â€œ two modes
  - **Upload file:** `MediaFileUpload` Ã¢â‚¬â€œ drop/browse, accept images + video (mp4, webm, mov). Auto-detect image vs video; images get variants, videos upload raw, `video_url` = storage URL
  - **Add Video URL:** `AddVideoUrlForm` Ã¢â‚¬â€œ URL + optional name, validate YouTube/Vimeo/Adilo, `normalizeVideoUrl`, create media with `video_url`
  - Storage: `validateVideoFile`, `validateVideoUrl`, `uploadVideoFileToStorage`, `getVideoFormatFromFile`, `normalizeVideoUrl`
  - Modal tabs: "Upload file" | "Add Video URL"; title switches by mode
- Step 5: Grid video placeholder
  - `ImageList`: when `media_type === 'video'` and no thumbnail, show Video icon + "Video" label in aspect-square cell; empty state "Upload media to get started"
- **Files changed**
  - `supabase/migrations/040_add_media_type_and_video_url.sql` (DROP+CREATE RPCs, wrappers, grants)
  - `src/types/media.ts` (`MediaCreatePayload.original_format` extended for video/url)
  - `src/lib/supabase/media.ts`, `src/lib/media/storage.ts` (video helpers, validation, upload)
  - `src/lib/supabase/taxonomy.ts` (getMediaTaxonomyRelationships, getTermsForMediaViewMode)
  - `src/components/media/`: MediaLibraryHeader, MediaLibraryWrapper, TaxonomyMultiSelect, AddVideoUrlForm, MediaFileUpload, ImageList

### 2026-01-24 22:45 CT - Taxonomy System: Search, Scroll & Section-Scoped Filtering Architecture
- **Context for Next Session:** Taxonomy management UI is fully functional with search + scroll on all 3 tables (Sections, Categories, Tags). PRD updated with section-scoped filtering architecture explaining how sections act as filters over the shared taxonomy. All form submission issues fixed (no multiple submissions, forms don't disappear after save). Ready to integrate taxonomy into content editors (Posts, Pages, Media) - this is next phase.
- Taxonomy System Documentation & Architecture Update
  - Updated `docs/prd.md` with comprehensive section 4 (Taxonomy System)
  - Added **section-scoped filtering** architecture (new discovery during dev - not in original PRD)
  - Documented two scoping models: suggested sections vs. explicit filtering
  - Real-world use case: Blog section has categories like "Technology", "Travel"; Portfolio section has "Web Design", "Branding" - same shared terms, different per-section availability
  - Added database schema documentation for `suggested_sections` field and `section_taxonomy_config` table
- Search & Scroll Features on Taxonomy Settings UI
  - **Sections Table**: Search by display name/slug + max-h-500px scrollable container + sticky header
  - **Categories Table**: Search by name/slug + hierarchical smart filtering (shows parents if child matches) + scrollable + sticky header
  - **Tags Table**: Search by name/slug + scrollable + sticky header
  - All 3 tables have real-time search filtering as user types
  - Empty state messaging: "No items match your search" or "No items found"
  - Search icons from lucide-react for clear affordance
- Form State Management Improvements
  - Added `saving` state to track form submissions and prevent multiple clicks
  - Button disabled state during submission with loading spinner
  - Fixed full-page loading after save - now reloads data silently without hiding form
  - Form state cleanup when switching between different edit operations (e.g., edit section Ã¢â€ â€™ edit category no longer conflicts)
  - Tab switching when editing term - switches to appropriate tab so form is visible
  - Delete cleanup - resets form if deleting currently edited item
- Documentation Cleanup (planlog.md)
  - Consolidated session work into main Implementation Phases tracking (Phase 04)
  - Deleted top-level "Quick Session Summary" detail items (kept just summary header)
  - All items already marked [x] in main phase tracking
  - Clean session handoff structure with "Important Context for Next Session"
- **Files Changed:**
  - Updated: `src/components/settings/TaxonomySettings.tsx` (search/scroll on all 3 tables, form state management, improved UX)
  - Updated: `src/types/taxonomy.ts` (no changes, already had correct types)
  - Updated: `src/lib/supabase/taxonomy.ts` (no changes, already had correct functions)
  - Updated: `docs/prd.md` (section 4: Taxonomy System with section-scoped filtering architecture)
  - Updated: `docs/planlog.md` (session cleanup, Phase 04 documentation, context for next session)
- **Testing:** All 3 tables show search functionality + scrolling. Real-time filtering works correctly. Sticky headers stay visible while scrolling. Form state management prevents conflicts when editing different items.
- **Next Steps:** Integrate taxonomy into content editors (Post editor, Page editor, Media upload). Create category selector component (hierarchical) and tag input component (autocomplete). Add taxonomy filtering to admin content lists.

### 2026-01-24 19:00 CT - Color Palette System Enhancement: Extended Presets, Global Palette Table & Live Preview
- **Context for Next Session:** Color palette system significantly enhanced with 20+ predefined palettes, global per-tenant palette storage (persistent across sections), and live preview sections on both Colors and Fonts settings pages. UX improved with better palette browsing, selection, and real-time visual feedback. Design system fully functional and ready for content editor integration.
- Color Palette System Expansion
  - Extended predefined palette library from 8 to 20+ professional palettes
  - Added palettes covering multiple design systems and use cases (Material Design, Tailwind, Nord, Dracula, Solarized, GitHub, Gruvbox, One Dark, Catppuccin, etc.)
  - Each palette includes descriptive metadata for browsing and categorization
- Global Palette Data Table (Per-Tenant)
  - Created new `global_palettes` table to store saved color palettes per tenant (persistent storage)
  - Implemented per-tenant isolation - each tenant's palettes stored separately in client schema
  - Palettes accessible across all sections and content editors
  - Added RPC function to retrieve global palettes by tenant (bypassing PostgREST schema search issues)
  - Enables users to save custom palettes and reuse across project
- Live Preview Sections
  - **Colors Settings Page:** Added live preview section showing:
    - Current selected colors in a visual grid/swatch display
    - Real-time updates as colors are changed
    - Sample text/UI elements showing how colors apply in context
  - **Fonts Settings Page:** Added live preview section showing:
    - Font family previews with sample text in different weights
    - Real-time rendering as font selections change
    - Size and weight variations displayed
  - Both previews use actual CSS variables for consistency with deployed design
- Enhanced UX
  - Improved palette selection UI with search/filter capability
  - Better visual feedback when switching palettes
  - Preview updates smoothly as user makes changes
  - Saved palettes listed separately from presets for easy access
- **Files Changed:**
  - New: `supabase/migrations/026_create_global_palettes_table.sql` (per-tenant palette storage)
  - New: `supabase/migrations/027_create_global_palettes_rpc.sql` (RPC for palette retrieval)
  - New: `supabase/migrations/028_enable_rls_global_palettes.sql` (security policies)
  - Updated: `src/components/settings/ColorsSettings.tsx` (live preview section added)
  - Updated: `src/components/settings/FontsSettings.tsx` (live preview section added)
  - Updated: `src/lib/supabase/design-system.ts` (global palette functions)
  - Updated: `docs/prd.md` (Design System section updated with global palettes feature)
  - Updated: `docs/planlog.md` (phase update with new palette features)
- **Testing:** Live previews render correctly and update in real-time. Global palettes persist across page reloads. Per-tenant isolation verified. All 20+ preset palettes load and apply successfully.
- **Next Steps:** Integrate design system settings into content editors. Implement palette selection in post/page/media editing. Add color/font overrides per content type if needed.

### 2026-01-22 18:30 CT - Color Palette Layout, Planlog Update, .cursor Duplicate Cleanup
- **Context for Next Session:** Color palette UI uses 3Ãƒâ€”5 grid (Alternate 1 in row 2, Alternates 2Ã¢â‚¬â€œ6 in row 3). Labels match schema (Alternate 1Ã¢â‚¬â€œ6). Planlog includes "Color palette schema evolution (consider)" for `color01`Ã¢â‚¬â€œ`color15` + user-defined labels. Docs live only in `docs/`; `.cursor/` holds only `rules/`. Ready to test palette features, continue Phase 02/05, or explore color01Ã¢â‚¬â€œcolor15 when desired.
- Color palette layout (ColorsSettings)
  - Reorganized to **3 rows Ãƒâ€” 5 columns** to fix unbalanced 5-column grid (core 9 = 5+4, alternates 6 = 5+1)
  - Row 1: Primary, Secondary, Accent, Background, Background Alt
  - Row 2: Foreground, Foreground Muted, Border, Link, Alternate 1
  - Row 3: Alternate 2Ã¢â‚¬â€œ6
  - Single "Brand & theme colors (15)" section; merged former Core/Alternate blocks
- Reverted label renames (no Hover / Alternate 1Ã¢â‚¬â€œ5)
  - Kept schema keys as `alternate1`Ã¢â‚¬â€œ`alternate6`; display labels stay "Alternate 1"Ã¢â‚¬â€œ"Alternate 6"
  - Avoids label/schema mismatch (e.g. "Alternate 1" Ã¢â€ â€ `alternate2`)
- Planlog: added "Color palette schema evolution (consider)" to Session Continuation
  - Future option: `color01`Ã¢â‚¬â€œ`color15` fixed keys + user-defined labels; store labels separately; migration from current keys
  - Enables flexible naming (e.g. Hover, Success) without schema changes
- Removed duplicate docs from `.cursor/` root (accidental copy/paste)
  - Compared 14 `.md` files in `.cursor/` vs `docs/`; 13 identical, `planlog.md` differed (docs newer, has color-palette step)
  - Deleted all 14 duplicates from `.cursor/`; `docs/` is sole source of truth for project docs
  - Retained `.cursor/rules/` (coding.mdc, MCP.md, structure.mdc)
- **Files Changed:**
  - Updated: `src/components/settings/ColorsSettings.tsx` (3Ãƒâ€”5 grid, single palette section, label revert)
  - Updated: `docs/planlog.md` (color01Ã¢â‚¬â€œcolor15 step in Session Continuation)
  - Deleted: 14 duplicates from `.cursor/` root (`ADDING_NEW_TABLES_CHECKLIST.md`, `ADDING_NEW_TABLES.md`, `ARCHITECTURE_DECISION_SCHEMAS.md`, `changelog.md`, `CLIENT_SETUP_CHECKLIST.md`, `MFA_SETUP.md`, `planlog.md`, `prd.md`, `SECURITY_RPC_FUNCTIONS.md`, `SESSION_SUMMARY.md`, `STATUS.md`, `SUPABASE_SCHEMA_SETUP.md`, `TESTING_2FA.md`, `TESTING_SETUP_SCRIPT.md`)
- **Next Steps:** Test palette features; Phase 02 (admin dark theme) or Phase 05 (Media Library); consider color01Ã¢â‚¬â€œcolor15 when ready

### 2026-01-22 16:38 CT - Color Palette Library & Multi-Schema Table Documentation
- **Context for Next Session:** Color palette system is fully functional. All palettes load correctly. Design System Settings UI complete. Ready to test palette features or continue with Phase 02/Phase 05.
- Implemented 15-color palette system (9 core colors + 6 alternates)
  - Updated `ColorPalette` type to include `alternate1` through `alternate6` colors
  - Updated `DEFAULT_DESIGN_SYSTEM` with default alternate color values
  - Updated CSS variable generation to include alternate colors
  - Updated `DesignSystemSettings` UI with 3-column layout for all 15 colors
- Created color palette library system with database storage
  - Created `color_palettes` table migration (`012_create_color_palettes_table.sql`)
  - Inserted 8 predefined palettes (Material Design, Tailwind, etc.) via migration (`013_insert_predefined_color_palettes.sql`)
  - Created RPC functions in `public` schema to bypass PostgREST schema search issues (`018_create_color_palettes_rpc.sql`)
  - Created `PaletteLibrary` component for browsing, saving, and applying palettes
  - Integrated palette library into Design System Settings UI (2nd position, after fonts)
- Fixed PostgREST custom schema table access issue
  - **Problem:** PostgREST couldn't find `color_palettes` table in custom schema (looked in `public` instead)
  - **Solution:** Created RPC functions in `public` schema that query custom schema (same pattern as `settings` table)
  - **Key Learning:** New tables added after initial schema setup require RPC functions for PostgREST to find them
  - Created comprehensive documentation for this pattern
- Created comprehensive documentation for adding new tables to custom schemas
  - `docs/ADDING_NEW_TABLES.md` - Complete guide with security analysis
  - `docs/ADDING_NEW_TABLES_CHECKLIST.md` - Quick reference checklist
  - `docs/SECURITY_RPC_FUNCTIONS.md` - Security analysis of RPC function workaround
  - Updated `docs/CLIENT_SETUP_CHECKLIST.md` with reference to new table guide
- Architecture decision: Kept multi-schema approach (not switching to multi-tenant tables)
  - RPC function workaround is secure and manageable (~5 min per new table)
  - Better data isolation and compliance benefits
  - Documentation makes pattern repeatable
- Code cleanup
  - Removed debug test route (`/api/admin/color-palettes/test`)
  - Cleaned up console.log statements from palette components
  - Added documentation comments to verification scripts
- **Files Changed:**
  - New: `supabase/migrations/012_create_color_palettes_table.sql`
  - New: `supabase/migrations/013_insert_predefined_color_palettes.sql`
  - New: `supabase/migrations/014_enable_rls_color_palettes.sql`
  - New: `supabase/migrations/015_refresh_postgrest_after_color_palettes.sql`
  - New: `supabase/migrations/016_verify_color_palettes_permissions.sql`
  - New: `supabase/migrations/017_force_postgrest_refresh.sql`
  - New: `supabase/migrations/018_create_color_palettes_rpc.sql`
  - New: `src/types/color-palette.ts`
  - New: `src/lib/supabase/color-palettes.ts`
  - New: `src/components/settings/PaletteLibrary.tsx`
  - New: `src/app/api/admin/color-palettes/route.ts`
  - New: `src/app/api/admin/color-palettes/[id]/route.ts`
  - New: `docs/ADDING_NEW_TABLES.md`
  - New: `docs/ADDING_NEW_TABLES_CHECKLIST.md`
  - New: `docs/SECURITY_RPC_FUNCTIONS.md`
  - Updated: `src/types/design-system.ts` (15-color system)
  - Updated: `src/lib/design-system.ts` (alternate colors)
  - Updated: `src/app/globals.css` (alternate color fallbacks)
  - Updated: `src/components/settings/DesignSystemSettings.tsx` (palette library integration, section reordering)
  - Updated: `docs/CLIENT_SETUP_CHECKLIST.md` (new table guide reference)
  - Updated: `docs/planlog.md` (session continuation section)
- **Next Steps:** Test palette features (create custom palette, apply predefined), continue Phase 02 (admin dark theme), or move to Phase 05 (Media Library)

### 2026-01-21 21:10 CT - Component Library Reference System, CRM Architecture & Workflow Improvements
- Added Component Library Reference System specification to PRD
  - Library-first development workflow (search first, create spec, then build)
  - Component metadata format with JSDoc-style header comments
  - Database schema for component library with development status tracking
  - Image support (screenshots, wireframes, examples) for visual reference
  - Auto-discovery system for component scanning
  - Superadmin UI for component library management (`/admin/super/components`)
  - Component spec creation before development
  - Status tracking (planned Ã¢â€ â€™ in progress Ã¢â€ â€™ complete)
  - Tight coupling between library entries and component files via `@library_id`
- Added Phase 13 to planlog for Component Library Reference System implementation
  - Marked as low priority (nice-to-have, not critical for MVP)
  - Comprehensive implementation tasks for library-first workflow
- **Completely redesigned Forms & CRM architecture in PRD (CRM-first approach)**
  - Replaced visual form builder with developer-authored components mapping to CRM fields
  - CRM as source of truth: All contact data lives in CRM tables, not separate form submission storage
  - Company-centric architecture: Companies as first-class entities with robust B2B data
  - Relational data model: Multiple emails/phones per contact, many-to-many contact-company relationships
  - Comprehensive consent management (ICANN/GDPR/TCPA compliance)
    - Consent audit trail with IP address, user agent, timestamp, consent text
    - Email and phone marketing consent tracking
    - Consent withdrawal with automatic DND status updates
  - DND (Do Not Disturb) status management
    - Automatic DND (on unsubscribe, bounce, complaint)
    - Manual DND (admin override)
    - DND enforcement for email/phone marketing
    - DND history audit trail
  - Duplicate detection logic (perfect match Ã¢â€ â€™ update, partial match Ã¢â€ â€™ flag for review)
  - Form registry as developer helper (not form builder)
  - Cookie consent management system
    - Cookie categories (essential, analytics, marketing, functional)
    - Browser storage (localStorage) + optional database storage
    - Links to CRM contacts when user identified
    - GDPR/ePrivacy Directive compliant
  - Complete database schema for CRM system (contacts, companies, emails, phones, consents, DND history, cookie consents)
  - Updated API endpoints for CRM operations
- Added CRM implementation phases to planlog
  - Phase 5A: CRM MVP (minimal CRM for Phase 5 membership integration)
  - Phase 10B: CRM-First Forms & Compliance System (full implementation)
  - Detailed implementation tasks for CRM schema, utilities, admin UI, consent management, DND, cookie consent
- Updated workflow documentation (structure.mdc)
  - Changed to single-push approach at session end
  - Update all documentation first, then commit and push everything together
  - More efficient workflow with atomic commits

### 2026-01-21 16:40 CT - Session Wrap-up: Setup Script Testing Ready
- Updated planlog to mark "Test Automated Client Setup Script" as the very next step
- Created comprehensive testing guide (`docs/TESTING_SETUP_SCRIPT.md`)
- Updated Phase 0 status to reflect design system foundation completion
- All changes committed and pushed to GitHub

### 2026-01-21 16:29 CT - Supabase Schema Setup & Design System Foundation
- Fixed PostgREST custom schema access issue using RPC functions
  - Created RPC functions in `public` schema to query custom schemas
  - Updated `src/lib/supabase/settings.ts` to use RPC functions instead of direct table queries
  - Resolved "schema must be one of the following" errors
- Implemented design system loading from database
  - Created `src/lib/design-system.ts` for design system utilities
  - Created `src/components/design-system/DesignSystemProvider.tsx` for CSS variable injection
  - Updated `src/app/layout.tsx` to load and apply design system from database
  - Added default design system settings migration (`003_design_system_settings.sql`)
  - Design system now loads CSS variables and Google Fonts from database
- Created automated client setup script
  - Added `scripts/setup-client-schema.ts` for one-command client schema creation
  - Script automates: schema creation, migrations, RPC functions, RLS policies, storage buckets
  - Added `pnpm setup-client` command to `package.json`
  - Created comprehensive `docs/CLIENT_SETUP_CHECKLIST.md` with automated and manual steps
- Implemented Supabase security best practices
  - Created RLS policies for all tables (`010_enable_rls_and_policies.sql`)
  - Fixed function search_path security warnings (`011_fix_function_search_path.sql`)
  - Created permissions migration for exposed schemas (`004_expose_schema_permissions.sql`)
- Created comprehensive documentation
  - `docs/CLIENT_SETUP_CHECKLIST.md` - Step-by-step client setup guide
  - `docs/SUPABASE_SCHEMA_SETUP.md` - Schema exposure instructions
  - `docs/ARCHITECTURE_DECISION_SCHEMAS.md` - Architecture rationale and alternatives
  - Updated `docs/planlog.md` with test steps for automated setup script
- Created migration scripts for schema setup
  - `004_expose_schema_permissions.sql` - Grant permissions to API roles
  - `005_refresh_postgrest_cache.sql` - PostgREST cache refresh
  - `008_create_settings_rpc.sql` - RPC functions for settings access
  - `009_insert_default_settings.sql` - Default design system values
  - `010_enable_rls_and_policies.sql` - RLS setup
  - `011_fix_function_search_path.sql` - Security fix

### 2026-01-21 14:30 CT - Phase 0: Supabase Auth Integration Implementation
- Implemented Supabase Auth integration replacing custom Auth API
- Created `src/lib/auth/supabase-auth.ts` with authentication utilities:
  - `getCurrentUser()` and `getCurrentUserFromRequest()` for session management
  - `validateTenantAccess()` for multi-tenant schema validation
  - `hasRole()` for role-based access control
  - Helper functions: `isSuperadmin()`, `isClientAdmin()`, `isMember()`
- Updated login flow to use Supabase Auth (`signInWithPassword()`)
- Updated middleware to validate Supabase Auth sessions and enforce tenant access
- Created user management utilities (`src/lib/supabase/users.ts`):
  - Functions for creating Superadmin, Client Admin, and Member users
  - User metadata management and password updates
- Created Superadmin system area (`/admin/super`) with platform-wide utilities
- Updated Sidebar to conditionally show Superadmin link based on user role
- Removed old Auth API code (`api-client.ts`) and dependencies
- Updated session management to use Supabase Auth

### 2026-01-21 09:15 CT - Template Workflow and Feature Planning
- Updated PRD to standardize template Ã¢â€ â€™ client fork workflow and promotion process back to the template via PRs
- Documented promotable component library vs site-specific glue folder structure and promotion checklist
- Added developer workflow guidance for ingesting UI ideas (Vercel v0/inspiration) and migrating simple Pages Router sites into the template
- Added standby/coming-soon site mode specification for early deployment + domain setup (with SEO safety guidance)
- Added form submission email notifications plan using Nodemailer (SMTP) with documented `SMTP_*` environment variables
- Added Event Calendar as a core feature (public views + event modal, admin management, API endpoints, ICS subscription feed) and tracked implementation tasks in planlog

### 2026-01-21 11:00 CT - Security, Roles, CRM/Memberships, Integrations, and AI RAG Planning
- Formalized role model in PRD/planlog: Superadmin (cross-tenant) + Client Admin + GPU (public visitor) + GPUM (member)
- Expanded Supabase Auth metadata strategy and middleware enforcement for superadmin bypass + tenant scoping
- Added 2FA/MFA requirements and implementation plan (TOTP first; SMS planned for later with external SMS provider)
- Documented image strategy (local vs CDN) and media optimization plan (store original + generate variants; helper utility guidance)
- Extended CRM scope to include membership management; emphasized easy client admin workflows for member status and group assignment
- Simplified ecommerce-to-membership integration to tag-based assignment (no payment transaction duplication; webhook/API key path)
- Added third-party `<head>` integration management as core system capability:
  - Always-on scripts: Google Analytics, VisitorTracking.com, SimpleCommenter.com
  - Vendor IDs stored in superadmin settings; scripts injected into public layouts only
- Added AI chatbot roadmap: CMS content as RAG knowledge base (Supabase PGVector) as a later phase in PRD/planlog

### 2026-01-20 15:00 CT - Membership Platform Architecture
- Added comprehensive membership platform section to PRD
- Documented dual authentication system (admin users vs member users)
- Added membership groups and access control architecture
- Documented content protection system (public, members, group access levels)
- Added database schema for membership system (membership_groups, members, user_memberships tables)
- Updated route structure with member routes (`/login`, `/register`, `/members/*`)
- Added admin routes for membership management (`/admin/memberships`, `/admin/members`)
- Added Phase 5: Membership Platform to planlog with detailed implementation tasks
- Renumbered subsequent phases (Archive/Restore, Reset, CLI, Storage, API, Polish)
- Updated architecture notes with membership platform details
- Added membership-specific future enhancements to planlog

### 2026-01-20 10:00 CT - Documentation and Architecture Planning
- Merged detailed implementation plan into `docs/planlog.md`
- Organized implementation phases (0-10) with priority order
- Documented Supabase Auth integration strategy
- Updated PRD with complete Supabase Auth architecture
- Enhanced multi-schema strategy documentation
- Updated `.cursor/rules/structure.mdc` with planlog workflow (items never deleted, only checked off)
- Initialized Git repository
- Set up project for multi-machine development (docs synced via Git)

### 2024-12-XX - Authentication System Change
- Changed from custom Auth API to Supabase Auth
- Removed dependency on external auth web app
- Implemented multi-tenant auth using Supabase user metadata
- Users associated with tenant schemas via `user_metadata.tenant_id`
- Simplified authentication flow with native Supabase Auth integration
- Updated environment variables (removed AUTH_API_URL and AUTH_API_KEY)
- Enhanced multi-schema strategy documentation

### 2024-12-XX - Architecture Documentation
- Added Developer-Centric Component Architecture section to PRD
- Documented Archive & Restore System architecture
- Added CI/CD & Maintenance Strategy documentation
- Added Project Lifecycle Management section
- Updated project structure to reflect component library approach

### 2024-12-XX - Documentation Restructure
- Separated planning from change history
- Created `planlog.md` for planned work and backlog
- Updated `changelog.md` to focus on completed changes only
- Added cross-references between documentation files
- Created `structure.mdc` with documentation structure specifications

### 2024-12-XX - Single App Architecture Refactor
- Refactored from multi-deployment subdomain model to single-app path-based routing
- Moved admin routes to `/admin/*` structure
- Updated middleware for new route protection model
- Consolidated public and admin into single Next.js app
- Updated all component navigation links to new paths
- Updated middleware to redirect `/admin` to `/admin/dashboard` or `/admin/login`

### 2024-12-XX - Documentation Consolidation
- Moved `prd/prd.md` to `docs/prd.md`
- Converted `prd/plan.md` to `docs/changelog.md`
- Merged README.md content into PRD
- Updated `.cursorrules` to reflect new documentation structure
- Removed outdated README.md

### 2024-12-XX - Initial Implementation
- Project structure initialized
- Next.js 15 with TypeScript configured
- Tailwind CSS and shadcn/ui setup
- Supabase client with schema switching
- Authentication middleware and API integration
- Database migration system created
- Core type definitions

**Phase 1: Foundation**
- Initialized Next.js 15 project with TypeScript
- Set up Tailwind CSS and shadcn/ui
- Configured Supabase client with schema switching
- Created authentication middleware
- Set up project structure

**Phase 2: Database & Schema Management**
- Created Supabase migration system
- Implemented schema creation utility

**Phase 3: Core Admin UI**
- Dashboard layout with navigation
- Media library (upload, list, manage)
- Blog posts CRUD with rich text editor
- Basic settings page

**Phase 4: Advanced Content Types**
- Gallery management
- Form builder
- Form submissions CRM view

**Phase 5: REST API**
- Implemented all API endpoints
- Added rate limiting
- Added response caching

**Phase 6: Polish & Deployment**
- Error handling and validation
- Loading states and UX improvements
- Deployment configuration
- Documentation
