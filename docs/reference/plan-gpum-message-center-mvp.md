# GPUM Message Center — MVP execution plan

**Archived plan (Cursor / handoff).** Canonical path: `docs/reference/plan-gpum-message-center-mvp.md`.

**Track progress in:** [planlog.md](../planlog.md) (Phase 18C), [sessionlog.md](../sessionlog.md) (§3), [changelog.md](../changelog.md) (session wrap-up). **Wiring:** [messages-and-notifications-wiring.md](./messages-and-notifications-wiring.md).

---

## Product rules (frozen for this MVP)

1. **Single default “All” stream**  
   One merged feed so **announcements** and **notifications** are visible without opening a MAG. Items can still also exist in a MAG thread (duplicate surface is OK — “don’t miss it”).

2. **Drill-down only for conversations**  
   Tapping opens a **transcript** (SMS/timeline) only for:
   - **Support / admin** conversation (`support` thread for the member’s contact), or  
   - **MAG group** thread (`mag_group`), when the member is allowed to see/participate (see gates below).

   Non-conversation rows (orders, assignments, standalone announcement lines in the feed, etc.) either **deep-link** to the right page or **expand in place** — they do **not** require opening a MAG to discover them.

3. **No member-to-member DM** in this MVP. Only **staff/admin** and **MAG** conversation drill-down.

4. **MAG in conversation list / picker** only when **all** are true:
   - Member is enrolled in the MAG.  
   - **Participation** is on (global + per-MAG opt-in per existing schema).  
   - **Nickname** is set on the member profile (product gate for “visible in group chat”).  
   If not, the member still sees **support** and the **All** stream; they do not get that MAG as a selectable conversation row.

5. **Filters (MVP)**  
   At minimum: **All** (default), **Conversations** (thread rollups + conversation drill targets), **Notifications** (timeline / non-thread atomic events). Tweak labels in UI as needed (“Announcements” as sub-filter or badge later).

6. **v1.1+ (out of scope here)**  
   Full **Directory** pane (dash 02), DM, pin/archive, three-column desktop polish, advanced directory search.

### GPUM UI — function over visual polish

**Ship behavior first:** GPUM member pages (Message Center, dashboard links, transcripts) should be **plain, accessible, and working** — minimal styling beyond existing shared components. **Do not** invest in layout/theming finesse in the template repo: **each tenant fork is bespoke design**; forks will re-skin or replace surfaces. Prefer clear structure, labels, and API contracts over pixel-perfect or donor-matching UI.

---

## Execution phases

Complete in order; each phase should be shippable behind review.

### Phase 0 — Types and API contract

- [ ] **0.1** Define a **normalized stream item** type for GPUM (discriminated union): e.g. `notification` | `announcement_feed` | `conversation_head` with shared fields (`id`, `at`, `title`, `preview`, `deepLink?`, `threadId?`, `threadType?`, `magId?`, `unread?`). Document in code (single `types` module or next to route handler).
- [ ] **0.2** Define **`GET /api/members/message-center` v2** response: `items[]`, `nextCursor`, `hasMore` (implement cursor in a later step if needed; stub `null`/`false` OK for first merge).
- [ ] **0.3** Ensure **no `admin_only`** timeline rows leak on member routes (audit `getMemberActivity` and any new union).

### Phase 1 — Server: merged “All” stream

- [ ] **1.1** Implement **`getMemberMessageCenterStream(contactId, userId, options)`** (or extend `getMemberActivity`) to return the **union**:
  - Existing member-safe **timeline** / **notifications** / **orders** / **assignments** (current `getMemberActivity` behavior where correct).  
  - **MAG announcement lines** for each staff post the member should see (already partially present — keep on the stream).  
  - **Conversation head** rows for **support** (one rollup) and for each **eligible MAG** (rollup: last message preview, `threadId`, unread if available).
- [ ] **1.2** **Deduplication policy:** Same MAG announcement may appear as a **feed row** and as a **message in thread**; document that in wiring doc. Optional: shared `sourceMessageId` in metadata for client dedupe later — not required for MVP.
- [ ] **1.3** Wire **`GET /api/members/message-center`** to the new builder; keep query params `filter`, `limit`, date range if useful; map **All / Conversations / Notifications** server-side.

### Phase 2 — MAG eligibility helper

- [ ] **2.1** Centralize **`memberCanSeeMagGroupThread(contactId, magId)`** (or equivalent): membership + `mag_community_messaging_enabled` + **`crm_contact_mag_community_opt_in`** + **nickname non-empty** (read nickname from profile field you use in app).  
- [ ] **2.2** Use the same helper in **stream builder** (which MAG heads to list) and in **`POST .../messages`** / read paths so behavior matches.

### Phase 3 — Client: `/members/messages` shell

- [ ] **3.1** Replace scaffold-only layout with **mobile-first**: **stream** (full width) + **filter** control.  
- [ ] **3.2** **Row behavior:**  
  - If `threadId` + conversation type → **navigate or panel** to **MemberConversationView** (load `/api/conversation-threads/[id]/messages`).  
  - Else → existing **deep link** or **modal** for read-only context (match item type).
- [ ] **3.3** **Conversation transcript:** bubble or simple timeline list + composer when **`assertCanPostThreadMessage`** allows; otherwise read-only + explain (“Messaging off for this MAG” / “Add nickname…”).
- [x] **3.4** **Simple conversation picker** (sheet) — **superseded / N/A:** **`MemberActivityStream`** uses **Join a conversation** (→ **Conversations** filter), **conversation_head** rows, **Message the team**, and **View all** instead of a modal sheet. Same product intent (pick support vs MAG threads, no DM); no separate picker to build.

### Phase 4 — Unread and light UX copy

(Not visual polish — see **GPUM UI — function over visual polish** above.)

- [ ] **4.1** **Unread** for threads the member participates in: reuse `thread_participants` + `PATCH` read route if a member-safe endpoint exists; add **minimal** `PATCH` if missing and policy allows.  
- [ ] **4.2** Empty states: no MAG rows (explain gates); no messages yet.  
- [ ] **4.3** **Dashboard** (`/members`): either **link** to full Message Center only or show **short preview** + “See all” — avoid duplicating full implementation twice.

### Phase 5 — Docs and QA

- [ ] **5.1** Update [messages-and-notifications-wiring.md](./messages-and-notifications-wiring.md) — GPUM stream vs drill-down, MAG gates, filters.  
- [ ] **5.2** Update [planlog.md](../planlog.md) Phase 18C checkboxes as work completes.  
- [ ] **5.3** Manual QA matrix: support thread, MAG on/off, opt-in off, missing nickname, announcement visible on **All** without opening MAG, filter toggles.

---

## File / code pointers (starting points)

| Area | Location |
|------|----------|
| Member stream API | `src/app/api/members/message-center/route.ts` |
| Activity builder | `src/lib/supabase/crm.ts` (`getMemberActivity`) |
| Member UI | `src/app/(public)/members/messages/page.tsx`, `MemberActivityStream.tsx` |
| Thread messages API | `src/app/api/conversation-threads/[threadId]/messages/route.ts` |
| MAG policy | `src/lib/message-center/mag-thread-policy.ts` |
| Threads lib | `src/lib/supabase/conversation-threads.ts` |

---

## See also

- [plan-message-center-roadmap.md](./plan-message-center-roadmap.md) — broader Message Center roadmap.  
- [sessionlog.md](../sessionlog.md) §3 — MVP open items for messaging.  
- Concept layout (v1.1): `docs/reference/images/dash 02.png`.
