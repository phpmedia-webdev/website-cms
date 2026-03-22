# Messages & notifications — wiring roadmap

**Purpose:** Living checklist for what belongs in **`thread_messages` / `conversation_threads`** (“messages”) vs **`contact_notifications_timeline`** (“notifications”), and whether each idea is implemented end-to-end (write path + correct read/UX + GPUM/admin rules where applicable).

**Specs:** Table shapes and enums — [prd-technical § Phase 18C](../prd-technical.md#phase-18c-directory-and-messaging).  
**How to use:** Add rows under **Ideas / backlog** as you think of them; check boxes when wired; note the `kind` / `thread_type` / API path in changelog or PR when helpful.

---

## Store A — Thread messages (`conversation_threads`, `thread_messages`, `thread_participants`)

Use for **conversation-shaped** data: threaded text, authors (`author_user_id` / `author_contact_id`), optional `parent_message_id`.

- [x] **Blog comments** — one thread per post (`thread_type = blog_comment`, `subject_type = content`, `subject_id = post id`). Code: `blog-comment-messages.ts`, `/api/blog/comments`, migration **192**.
- [ ] **Task comments** — thread per task or ticket (`thread_type = task_ticket`, subject = task). Prefer over `crm_notes` + `conversation_uid` for new work.
- [ ] **DM messages** — direct / small group (`thread_type = direct` or `group`, `thread_participants`). Enumeration-safe patterns on cold surfaces per PRD.
- [ ] **Support thread** (`thread_type = support`).
- [ ] **MAG group room** (`thread_type = mag_group`, `mag_id`).
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
- [ ] Order / subscription lifecycle rows (see prd-technical §18C.5 examples)  
- [ ] *(add rows above or here as needed)*

---

## Cross-cutting

- [ ] **Merged stream** — admin + GPUM single API (`UNION`, sort, cursor, visibility rules)  
- [x] **Contact detail (admin)** — legacy **CRM notes & activity** block removed; only **Messages and Notifications** (`contact_notifications_timeline`) on the contact tab. Further merge (e.g. thread previews) TBD.  
- [ ] **RLS hardening** — replace v1 authenticated-wide policies where product requires tighter rules  

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
