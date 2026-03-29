# Messages & notifications — wiring roadmap

**Purpose:** Living checklist for what belongs in **`thread_messages` / `conversation_threads`** (“messages”) vs **`contact_notifications_timeline`** (“notifications”), and whether each idea is implemented end-to-end (write path + correct read/UX + GPUM/admin rules where applicable).

**Product plan (archived copy):** [plan-message-center-roadmap.md](./plan-message-center-roadmap.md) — Message Center UX, MAG rules, GPUM opt-in, implementation sequence.  
**GPUM MVP execution (step plan):** [plan-gpum-message-center-mvp.md](./plan-gpum-message-center-mvp.md) — All stream + conversation drill-down, MAG gates, filters; v1.1 scope called out. **Template repo:** prioritize **function** on GPUM surfaces; **minimal visual polish** — tenant forks use **bespoke design**.

**Specs:** Table shapes and enums — [prd-technical § Phase 18C](../prd-technical.md#phase-18c-directory-and-messaging).  
**How to use:** Add rows under **Ideas / backlog** as you think of them; check boxes when wired; note the `kind` / `thread_type` / API path in changelog or PR when helpful.

---

## COMMENT:GROUP (MAG shared thread vs announcements)

**Purpose:** Lock **product behavior** for the **one group comment thread per MAG** (`conversation_threads.thread_type = mag_group`, `mag_id`) and how it differs from **broadcast announcements**.

| Topic | Decision |
|--------|-----------|
| **Scope** | **One thread per MAG** — every contact in that MAG shares the **same** room (public within the membership). **Not** one thread per person. |
| **GPUM visibility** | Eligible members see the thread in **Messages and notifications** (e.g. **Conversations** filter) when policy allows **and** the thread **exists / has activity** as defined by implementation. **No announcement is required** for the thread to show. |
| **Announcements** | **Separate** product: **scoped**, **short / splash** timeline-style delivery (`executeAdminBroadcast` / timeline). Different role from ongoing **COMMENT:GROUP** chat. |
| **Admin row label** | **COMMENT:GROUP** in Message Center (both sides use the same term for clarity). |
| **Admin click-through — COMMENT:GROUP** | Opens **membership (MAG) admin detail** to continue the thread (comments tab / equivalent). |
| **Admin click-through — announcement** | Opens **read-only announcement** with full text; **no** requirement to navigate away; **hide** MAG assignment UI on read if not needed. |
| **Moderation** | **In-thread:** trust model (members already scoped to MAG); **no** per-message queue. **Levers:** **conversation toggle** on membership (admin **off** switch); **admin** sees **who** posted and may open **CRM contact** to act on a person. |
| **GPUM attribution** | Show **who** said what; **no** click-through to **DM** or other members’ profiles. |

**Implementation checklist:** [planlog.md](../planlog.md) → **Phase 18C** → bullet block **COMMENT:GROUP — MAG shared group thread**.

**Technical note:** DB type remains **`mag_group`**; **COMMENT:GROUP** is the **user-facing / stream** label unless you add a Customizer display name later.

---

## GPUM: target notifications (member-facing checklist)

**Audience:** What **GPUMs** (signed-in members) should see under **Messages and notifications** (`/members/messages`, dashboard preview). **Staff-only** lines belong on **`contact_notifications_timeline`** with **`visibility = admin_only`**; `getMemberActivity` in `crm.ts` **drops** `admin_only` rows so internal team notices do not appear in the member stream.

**Preferred pattern:** **Atomic** events → **`contact_notifications_timeline`** with `client_visible` or `both`, stable `kind`, `subject_type` / `subject_id` for deep links, **`source_event`** for idempotency (retries/webhooks). **Conversation-shaped** traffic → **threads** (merged into the GPUM stream via `gpum-member-stream.ts`).

Check each box when **write path** (order service, tasks API, events, etc.) **and** **GPUM read path** (timeline row ingested or synthesized in `getMemberActivity` / merged stream) are done. Several items below are **not wired yet** on the producer side — this section is the backlog so modules can hook notifications as they ship.

**GPUM read path (today):** `getMemberActivity` → `buildMemberStreamItemsFromActivity` → `GET /api/members/message-center`. See **GPUM visibility contract** under [Cross-cutting](#cross-cutting) below. **Member profile vs CRM contact fields:** [member-profile-vs-crm-contact.md](./member-profile-vs-crm-contact.md).

### GPUM merged stream API (implemented)

**Route:** `GET /api/members/message-center` (`src/app/api/members/message-center/route.ts`).

| Query param | Role |
|-------------|------|
| `filter` | `all` (default), `conversations`, or `notifications` — applied in `filterMemberStreamItems` after merge. |
| `date_from` / `date_to` | Optional inclusive calendar window (`normalizeMessageCenterDateRange`); widens upstream fetch when active. |
| `limit` | Page size; clamped (e.g. 1–200). Client uses `80` default / `200` when a date range is active. |
| `cursor` | Opaque keyset token from a prior response’s `nextCursor`. **When present,** legacy `items` is always `[]` so activity paging is not mixed with stream paging. |

**Response fields:** `streamItems` (page of merged union rows), `nextCursor`, `hasMore`, `memberContactId`, and legacy dashboard `items` (only for the **first** request without `cursor`).

**`streamItems` kinds** (`gpum-message-center.ts`): **`notification`** (timeline + synthetic CRM activity, `admin_only` excluded via `getMemberActivity`); **`conversation_head`** (support + MAG group threads the member may see — `unread`, `threadId`, `threadType`); **`announcement_feed`** (MAG “announcements only” line when the member does not get a full community head — `threadId` set when a `mag_group` thread exists for drill-down).

**Ordering and pagination:** Newest-first sort with stable tie-break on `id` (`compareMemberStreamItemsNewestFirst`). **`paginateMemberStreamItems`** (`gpum-message-center-pagination.ts`, server-only `Buffer`) returns a slice and encodes `nextCursor` as base64url JSON `{ "v": 1, "at": "<iso>", "id": "<string>" }`. Upstream merge window: `getMemberMessageCenterMergedStream` with `streamMergeMax` (e.g. **480**) so older pages are available without refetching unbounded rows.

**MAG (read vs post):** **Listing / stream visibility** uses **`memberCanSeeMagGroupThread`** (`gpum-mag-eligibility.ts`). **Sending** messages uses **`assertCanPostThreadMessage`** / `mag-thread-policy.ts` on `POST /api/conversation-threads/[threadId]/messages` — do not assume read access implies post access.

**UI:** `MemberActivityStream.tsx` — **Load more** appends the next page using the same `filter` / dates / `limit` as the initial fetch.

**Manual QA matrix (GPUM Phase 5):** Support thread happy path; MAG **`allow_conversations`** on/off; member **global + per-MAG** opt-in off; **missing display name** (thread hidden from stream per policy); **All** still shows notifications without forcing MAG entry; **Conversations** vs **Notifications** filters; **Load more** with filters and date range. **Step-by-step runbook:** [qa-gpum-message-center-phase-53.md](../qa-gpum-message-center-phase-53.md).

### Ecommerce & orders

- [ ] **Order placed** — When an order is created for the member’s `contact_id`; copy e.g. **“Order placed”**; deep link to member order detail (`/members/orders/[id]` or canonical route).
- [ ] **Order status changes** — e.g. **Processing → Complete** (and other meaningful transitions); prefer **one timeline row per transition** or a clear idempotent rule (`source_event` from `order_id` + `status` or event id) to avoid duplicates.
- [ ] **Ordered product / fulfillment status** — Product the member **ordered** (or explicitly follows) changes lifecycle (e.g. **In production → Available**); define `kind`, linkage **order_line → product/content**, and member-visible copy. **Product shelf/fulfillment status** on the catalog side should come from a **Customizer-backed slug** on `product` (planned core slugs: `available`, `backordered`, `in_production`, `out_of_stock` — see [sessionlog.md](../sessionlog.md) § **Ecommerce — product customer-facing status (Customizer)**); notifications fire on **slug transitions** once that column exists.

**Today (partial):** `getMemberActivity` already pushes synthetic **order** lines from the `orders` table for the contact (body includes status snippet). **Not yet:** dedicated **“Order placed”** / transition events as first-class timeline kinds with stable filtering and Customizer labels. **Not yet:** Customizer **product** status — only **`stock_quantity`** + **`available_for_purchase`** today.

### Membership (MAG)

- [ ] **Membership joined** — Copy e.g. **“Membership {name} joined on {date}”**; align or dedupe with existing **`mag_assignment`**-style activity so the stream does not double-notify.
- [ ] **Membership removed** — Optional counterpart row when access is revoked.

**Today (partial):** synthetic **mag_assignment**-type activity from contact MAG data appears in `getMemberActivity`; refine when product copy and timeline `kind` are locked.

### Support tickets

- [ ] **Support ticket created / submitted** — When the GPUM **creates** a standalone support task or **submits** the first message on a support thread; optional **distinct timeline row** if product wants a line separate from thread preview / task thread head.

**Today (partial):** support **conversation heads** and **thread_messages** merge into the GPUM stream; an explicit **“ticket submitted”** notification event may still be missing.

### Tasks

- [ ] **Task assigned** — When an admin **assigns** the contact to a task (`task_followers.contact_id`, `tasks.contact_id`, or equivalent); member-visible timeline row + link to allowed task/member route when GPUM task UI exists.
- [ ] **Task reminders** — When **[Phase 20 — calendar & reminders](../planlog.md#phase-20-calendar--reminders--personal-ics-feeds)** is fully implemented: in-app GPUM notification + email/push per spec; must respect **internal-only** / GPUM visibility rules.

### Projects

- [ ] **Added to a project** — When the contact is linked as a **project member** (directory / `project_members` or equivalent); timeline row + deep link when member-facing project UI exists.

### Events & calendar

- [ ] **Added to an event** — When the contact is added as **participant** or via **event resources** linkage; timeline row + link to member-safe event view if applicable.
- [ ] **Event reminders** — Same **Phase 20** reminder stack as tasks; GPUM-visible only.

### Digital / product follow (cross-cutting commerce)

- [ ] **Product status for purchasers** — Complements **§ Ecommerce & orders** above: any **“following”** or **entitlement** state (not only order line) that should surface **Available** / **Ready** style updates; keep `source_event` idempotent.

---

## Store A — Thread messages (`conversation_threads`, `thread_messages`, `thread_participants`)

Use for **conversation-shaped** data: threaded text, authors (`author_user_id` / `author_contact_id`), optional `parent_message_id`.

- [x] **Blog comments** — one thread per post (`thread_type = blog_comment`, `subject_type = content`, `subject_id = post id`). Code: `blog-comment-messages.ts`, `/api/blog/comments`, migration **192**.
- [ ] **Task comments** — thread per task or ticket (`thread_type = task_ticket`, subject = task). Prefer over `crm_notes` + `conversation_uid` for new work.
- [ ] **DM messages** — direct / small group (`thread_type = direct` or `group`, `thread_participants`). Enumeration-safe patterns on cold surfaces per PRD.
- [ ] **Support thread** (`thread_type = support`).
- [ ] **MAG group room — COMMENT:GROUP** (`thread_type = mag_group`, `mag_id`). **Product name:** **COMMENT:GROUP** (admin + GPUM). **Policy (migration 214):** `mags.allow_conversations` — when `false`, only **superadmin + tenant admin** (`website-cms-superadmin` / `website-cms-admin`) may post (announcements / broadcast); GPUM posts blocked unless community is on, GPUM has `crm_contacts.mag_community_messaging_enabled`, and row in `crm_contact_mag_community_opt_in` for that MAG. API: `POST /api/conversation-threads/[threadId]/messages` enforces via `mag-thread-policy.ts`. Admin **Message Center** lists thread heads in `getAdminMessageCenterStream`. **Spec:** [§ COMMENT:GROUP](#commentgroup-mag-shared-thread-vs-announcements).
- [ ] **Product comments** (`thread_type = product_comment`) — ecommerce / product pages.

### Ideas / backlog (messages)

- [ ] *(add rows above or here as needed)*

---

## Store B — Contact notifications timeline (`contact_notifications_timeline`)

Use for **atomic, list-friendly events** on a contact (or recipient): `kind`, `visibility`, `title`/`body`, `subject_type`/`subject_id`, `source_event` for idempotency.

- [ ] **Contact added** — system line for new contact (may still surface via CRM activity only today).
- [ ] **Form submitted** — align with `form_submitted` kind + `source_event` if deduping webhooks/submits.
- [ ] **Membership (MAG) added** — e.g. `mag_assigned`.
- [ ] **Membership (MAG) removed** — optional counterpart row.
- [ ] **Event created** — or invited / RSVP (define product); disambiguate from calendar `events` table naming in UI.
- [ ] **Task assigned** — contact linked to task.
- [ ] **Project assigned** — contact linked to project.
- [x] **Staff note / client-visible message (manual CRM)** — admin **Messages and Notifications** card; `staff_note` / `message` + visibility.

### Ideas / backlog (notifications)

- [ ] Marketing list added / removed  
- [ ] Order / subscription lifecycle rows (see prd-technical §18C.5 examples) — **GPUM detail list:** [§ GPUM: target notifications → Ecommerce & orders](#gpum-target-notifications-member-facing-checklist)  
- [ ] Task / project / event assignment rows for GPUM — [§ GPUM: target notifications](#gpum-target-notifications-member-facing-checklist) (Tasks, Projects, Events)  
- [ ] *(add rows above or here as needed)*

---

## Cross-cutting

- [ ] **Merged stream** — admin + GPUM single API (`UNION`, sort, cursor, visibility rules). **Admin dashboard:** unified feed in `src/lib/message-center/admin-stream.ts` + `GET /api/admin/message-center`; thread-head rows + timeline + CRM synthesizers; Customizer seeds `message_center_*` scopes (migration **214**).  
- [x] **Contact detail (admin)** — legacy **CRM notes & activity** block removed; only **Messages and Notifications** (`contact_notifications_timeline`) on the contact tab. Further merge (e.g. thread previews) TBD.  
- [ ] **RLS hardening** — replace v1 authenticated-wide policies where product requires tighter rules  
- [ ] **GPUM visibility contract** — Document per-module which events insert **timeline** rows vs **thread-only**; ensure **order / task / event / membership** producers use **`client_visible` or `both`** for member-facing lines and **`admin_only`** for team-only. **Reference:** [§ GPUM: target notifications](#gpum-target-notifications-member-facing-checklist) above.

---

## Related code (quick pointers)

| Area | Path |
|------|------|
| Timeline lib | `src/lib/supabase/contact-notifications-timeline.ts` |
| Threads lib | `src/lib/supabase/conversation-threads.ts` |
| Blog comments | `src/lib/supabase/blog-comment-messages.ts` |
| Contact UI | `src/components/crm/ContactNotificationsTimelineSection.tsx` |
| APIs | `/api/crm/contacts/[id]/notifications-timeline`, `/api/conversation-threads`, `/api/blog/comments` |
| Admin dashboard panel | `getDashboardActivity` in `crm.ts`, `DashboardActivityStream.tsx`, `ADMIN_MESSAGES_NOTIFICATIONS_FILTER_OPTIONS` — merged feed (no legacy `crm_notes` rows). |
| **GPUM** stream | `getMemberActivity` in `crm.ts`; `gpum-member-stream.ts`; `GET /api/members/message-center`; `MemberActivityStream.tsx`, `MemberMessagesPreview.tsx` |

---

## Combined stream filter picker (no virtual table)

**Is the picker backed by a “virtual table”?**  
**No.** Filter options are **not** rows in a database table. The merged **Messages and notifications** stream will **union** (in app code or RPC) rows from:

| Physical source | Primary discriminator(s) |
|-----------------|---------------------------|
| `contact_notifications_timeline` | `kind`, optional `subject_type` / `metadata` |
| `conversation_threads` + `thread_messages` | `conversation_threads.thread_type`, optional `subject_type` / `subject_id` |

The API (or client) **maps** those fields into:

1. **Fine-grained filters** — e.g. one chip per `kind` or per `thread_type` (only show options that exist for the user/contact, or show full catalog per product choice).  
2. **Coarse buckets** — PRD **category** enum computed on read: `notes` \| `comms` \| `membership` \| `commerce` \| `tasks` \| `system` ([prd-technical §18C.5–18C.6](../prd-technical.md#phase-18c-directory-and-messaging)). That category is **not** stored as its own column unless you add one later for indexing; today it is **derived**.

Normalized merged item shape (target): `{ stream: 'timeline' \| 'thread', sort_at, kind?, thread_type?, thread_id?, … }` — filters apply to that DTO.

**Today (contact admin):** `ContactNotificationsTimelineSection` filters **timeline only** by `kind` (All / Messages / Private notes / Other). Thread-backed items (blog, task comments, DMs, …) are **not** in that picker until the merged API + UI land.

---

### Picker items vs table wiring (check when merged picker includes them)

Use this as the inventory for the **combined** filter UI. Check a box when that option is wired end-to-end in the merged stream (API + picker + correct query).

#### A — High-level category chips (computed `category`)

Mapping is illustrative; adjust in API when implementing.

- [ ] **All** — no filter  
- [ ] **Notes** — timeline: `staff_note`, manual `message` lines; may include thread snippets classified as “note-like” by product  
- [ ] **Comms** — e.g. `email_sent`, member-visible message threads  
- [ ] **Membership** — timeline: `mag_assigned`, `mag_removed`; optional MAG `thread_type = mag_group` thread heads  
- [ ] **Commerce** — timeline: `order_*`, `subscription_*`, `digital_ready`, …  
- [ ] **Tasks** — timeline: `task_created`, `task_status_changed`, `mention` (if used); threads: `task_ticket`  
- [ ] **System** — `form_submitted`, `contact added` equivalents, other automation  

#### B — Timeline `kind` filters (`contact_notifications_timeline.kind`)

- [ ] `staff_note` / internal-only lines (often paired with `visibility = admin_only`)  
- [ ] `message` (client-visible / CRM “message to client”)  
- [ ] `form_submitted`  
- [ ] `mag_assigned` / `mag_removed`  
- [ ] `marketing_list_added` / `marketing_list_removed`  
- [ ] `email_sent`  
- [ ] `task_created` / `task_status_changed`  
- [ ] `order_*` / `subscription_*` / `digital_ready` (commerce family)  
- [ ] `mention` (if enabled)  
- [ ] *(add kinds as you introduce them)*  

#### C — Thread type filters (`conversation_threads.thread_type`)

- [ ] `blog_comment` (per-post thread; list may show “Blog” or collapse into Comms)  
- [ ] `task_ticket`  
- [ ] `support`  
- [ ] `direct`  
- [ ] `group`  
- [ ] `mag_group`  
- [ ] `product_comment`  
- [ ] *(add types if migration CHECK list grows)*  

#### D — Legacy / transitional

- [ ] **CRM activity** (`crm_notes` + system lines) — only if merged view still includes them during cutover; long-term prefer timeline + threads only  

---

### Maintenance

When you add a **new** `kind` or `thread_type`, update **§ Store A / Store B** above *and* add a row here so the picker spec stays aligned with the schema.
