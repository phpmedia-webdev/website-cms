# GPUM Message Center — Phase 5.3 manual QA

**Scope:** Member `/members/messages` (`MemberActivityStream`), `/members` preview, `/members/profile` MAG prefs, admin **MAG** settings. Aligns with [messages-and-notifications-wiring.md](./reference/messages-and-notifications-wiring.md) (GPUM merged stream API + manual QA matrix).

**GPUM chrome (current — matches code):** Filter options are **All activity** / **Conversations** / **Notifications** (`MEMBER_MESSAGE_CENTER_FILTER_OPTIONS`). Primary button (top right) depends on state: **Join a conversation** (from **All activity** or **Notifications**) → sets filter to **Conversations**; **Message the team** (when **Conversations** and no thread open) → inline compose to staff; **View all** (when a thread transcript is open) → closes thread + compose and returns to **All activity**. In-thread header: **Back to list** leaves **Conversations** but closes the transcript. Changing the **filter** dropdown closes an open thread.

**Environment:** Local `pnpm run dev` (port **3000**) or deployed preview; tenant schema + Supabase auth as usual.

**Roles needed**


| Role                                                | Use for                                                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Tenant admin** (or staff who can edit MAGs + CRM) | Toggle **Member conversations in MAG room** on MAG detail; create/read support threads if you use admin Message Center |
| **GPUM test account**                               | Member login; must be linked to a **contact** with membership (MAG) where you control prefs                            |


**Record results:** Put **Pass / Fail / Skip** and a one-line note in the right-hand column as you go.

---

## Preconditions

- GPUM user has at least one **MAG assignment** (so **MAG community rooms** block can appear on profile).
- Optional: enough timeline + thread activity that **Load more** appears (merged window up to ~480 rows; first page often **80** items — you may need seed data or lower local expectations).
- Browser devtools **Network** tab ready to confirm `GET /api/members/message-center` returns `nextCursor` / `hasMore` when paging.

---

## A — Support thread (happy path)


| #   | Steps                                                                                                                                                                                                                                                                    | Expected                                                                                                                                                         | Result |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| A1  | As GPUM, open `**/members/messages`**. Either open an existing **support** `conversation_head` from **All activity**, **or** click **Join a conversation** → set filter **Conversations** → **Message the team** → send first message to create/open the support thread. | Support row appears when a thread exists; row opens inline transcript + reply. Primary CTA on **Conversations** is **Message the team** (not “Message support”). | pass   |
| A2  | Send a short reply; leave stream or refresh list.                                                                                                                                                                                                                        | Support head preview updates; transcript shows new message. **Support** list line uses **Message · You** / **Message · Team** (not “Support”).                   | pass   |
| A3  | Open thread; confirm **Unread** / dot clears after read (`PATCH .../read`). Use **View all** or **Back to list** and re-open as needed.                                                                                                                                  | No stuck unread after reading (or matches intended rule). **View all** returns to **All activity** with thread closed.                                           | pass   |


---

## B — MAG **allow_conversations** (tenant toggle)

**Where:** Admin `/admin/crm/memberships/[id]` — switch **Member conversations in MAG room** (`allow_conversations`).


| #   | Steps                                                                                                                                                                                    | Expected                                                                                                                                                                                      | Result                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Set **on**; GPUM has profile: master **Allow community messaging**, per-MAG opt-in **on**, **Handle / nickname** filled, **Participate in messages…** checked if required by your flows. | **conversation_head** for that MAG appears in **All** / **Conversations**; member can open thread.                                                                                            | CRM contact record vs GPUM profile show different fields; only email clearly shared — need terminology + data parity (see consolidated review below). |
| B2  | Set **off**; save MAG; GPUM refreshes `/members/messages`.                                                                                                                               | Member **cannot** post as community; stream may show **announcement_feed** (announcements line) instead of full community head — still tappable if `threadId` present for read/announcements. | No in-app notice when tenant toggles MAG mode. Entry = **Join a conversation** / **Conversations** + heads (no sheet picker; Phase 3.4 closed).       |
| B3  | Confirm **admin/staff** can still post announcements when off (product rule: superadmin + tenant admin).                                                                                 | (Optional) Post from admin side; GPUM sees update in feed or thread.                                                                                                                          |                                                                                                                                                       |


---

## C — Member **global + per-MAG** opt-in off

**Where:** `/members/profile` — section **MAG community rooms**.


| #   | Steps                                                                     | Expected                                                                                                                        | Result |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| C1  | Turn **off** master **Allow community messaging in my MAG groups**; save. | MAG **conversation_head** hidden from stream; notifications unrelated to MAG chat still visible under **All** where applicable. |        |
| C2  | Turn master **on** but **uncheck** the specific MAG; save.                | That MAG’s community head not shown; other MAGs still follow their opt-in.                                                      |        |


---

## D — **Missing handle / nickname** (gate)

**Where:** `/members/profile` — **Handle / nickname** (and related checkboxes per your policy).


| #   | Steps                                                                              | Expected                                                                                         | Result |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| D1  | Clear **Handle / nickname** (or leave empty), save; MAG prefs **on** and opted in. | `memberCanSeeMagGroupThread` is false → **no** MAG **conversation_head** in stream for that MAG. |        |
| D2  | Set a non-empty handle; save.                                                      | MAG head **returns** when other gates pass.                                                      |        |


---

## E — **All activity** vs **Conversations** vs **Notifications** + navigation

**Where:** `/members/messages` filter `<select>` (labels from `MEMBER_MESSAGE_CENTER_FILTER_OPTIONS`).


| #   | Steps                                                                                                                                                                                                                                      | Expected                                                                                                | Result |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------ |
| E1  | **All activity** (default mixed stream).                                                                                                                                                                                                   | Timeline-style **notification** rows and **conversation_head** / **announcement_feed** (as applicable). |        |
| E2  | **Conversations**                                                                                                                                                                                                                          | Only conversation-shaped rows (heads + announcement feeds in that bucket); pure notifications hidden.   |        |
| E3  | **Notifications**                                                                                                                                                                                                                          | Conversation heads/feeds hidden; notification kinds only.                                               |        |
| E4  | With **All activity** selected, confirm **non-MAG** notifications (orders, forms, etc.) still appear **without** using **Join a conversation**.                                                                                            | Mixed stream does not force MAG drill-down to see alerts.                                               |        |
| E5  | From **All activity**, click **Join a conversation** → confirm filter becomes **Conversations**. Open a thread → top button is **View all**; click it → **All activity** + thread closed. Change filter while thread open → thread closes. | Navigation model matches **GPUM chrome** note in header of this doc.                                    |        |


---

## F — Date range + search + **Load more**


| #   | Steps                                                                | Expected                                                                                                           | Result |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| F1  | Choose a **date preset** or custom range that excludes recent items. | Empty state or older items only; no crash.                                                                         |        |
| F2  | Type search text that matches / does not match rows.                 | Search-only empty state when nothing matches; clear search restores list.                                          |        |
| F3  | If **Load more** is visible: click it.                               | Additional rows **append**; Network shows `cursor=` on second request; `hasMore` / `nextCursor` consistent.        |        |
| F4  | After **Load more**, change **filter** or **date range**.            | List resets (no duplicate ghost pages from old cursor). Changing **filter** also clears an open thread (expected). |        |


---

## G — Dashboard preview

**Where:** `/members` — `MemberMessagesPreview`.


| #   | Steps                   | Expected                                             | Result |
| --- | ----------------------- | ---------------------------------------------------- | ------ |
| G1  | Open dashboard as GPUM. | Up to **5** rows; **See all** → `/members/messages`. |        |


---

## Wrap-up

- All **Fail** items logged (screenshot + URL + user role).
- Optional: paste summary into session chat or [sessionlog.md](./sessionlog.md) when closing the session; check off **5.3** in sessionlog when satisfied.

---

## Consolidated review (from QA notes)

**Runbook alignment:** Section **E** + **E5** and **A1** were updated for the post-rework UI (**All activity**, **Join a conversation**, **Message the team**, **View all**). Re-run **A–G** and refresh **Result** columns; older notes below are **historical** unless re-confirmed.

**Follow-up shipped in code (re-test A2–A3, B1–B2):**

1. **Admin transcript collapse** — Contact Message Center tab syncs `**mc_filter`** + `**thread_id**` to the URL when opening a support thread or changing the filter; `**router.refresh()**` then keeps the same query string so the inline thread stays open (`DashboardActivityStream` + Suspense for `useSearchParams`).
2. **GPUM support / MAG list lines** — `**lastMessageFrom`** on heads; **support** uses **Message · You** / **Message · Team**; `**mag_group`** uses `**{MAG name} · You/Team**` (fallback label **Group** if title empty) (`getMemberStreamItemPrimaryLine`).
3. **CRM vs member profile** — Reference doc + short notes on CRM contact card and member profile description (`docs/reference/member-profile-vs-crm-contact.md`).
4. **Announcements-only MAG** — `**announcement_feed`** rows can carry `**announcementsOnly**`; GPUM stream shows a short explanation when tenant disabled member conversations for that MAG.

**QA coverage:** Treat prior “A–B partial / C–G not run” as stale until this matrix is run again after the UI rework.

### 1. Admin: transcript collapses; stale until full refresh (A2, A3)

**Symptom:** After actions that trigger `**router.refresh()`** (e.g. sending a message from the contact Message Center), the inline thread **rolls up** or **does not show new messages** until a manual reload.

**Likely causes:**

- `**DashboardActivityStream`** syncs `**activeThreadId**` from `**initialThreadId**` and `**typeFilter**`. If the URL loses `**thread_id**` or the filter is not in `**MESSAGE_CENTER_INLINE_THREAD_FILTERS**`, the effect clears `**activeThreadId**` (see `useEffect` around `contactRecordTab` / `typeFilter`).
- `**router.refresh()**` re-fetches server props; if the parent page does not persist `**thread_id**` in the query string through that navigation, the transcript closes.
- Thread body updates rely on `**threadRefreshNonce**` in some paths but **not** all `**router.refresh()`** paths — staff may see list refresh without transcript refetch.

**Fix direction:** Preserve `**thread_id`** (and conversation filter) on the contact URL across refresh; after staff sends a message, bump transcript fetch (`**setThreadRefreshNonce**`) *or* refetch messages without collapsing; avoid `**router.refresh()*`* where a lighter client refetch is enough.

### 2. GPUM: list row direction (A2)

**Behavior:** `getMemberStreamItemPrimaryLine` formats `**support`** heads as `**Message · You**` / `**Message · Team**` plus preview; `**mag_group**` as **Group · You/Team** (`gpum-message-center.ts`).

### 3. CRM contact vs GPUM profile — fields and naming (B1)

**Symptom:** Staff CRM contact and `**/members/profile`** do not show the same set of fields; confusion over **display name** vs **full name** vs **handle**.

**Fix direction:** Document a **single matrix** (source of truth per field: `crm_contacts`, `profiles`, `auth.user_metadata`); align labels in both UIs; optional read-only mirror on CRM (“Member profile: …”) with deep link.

### 4. MAG `allow_conversations` off — no GPUM explanation (B2)

**Symptom:** When the tenant turns off **Member conversations in MAG room**, the member gets `**announcement_feed`** / no community head but **no copy** explaining policy change.

**Fix direction:** Banner or **announcement_feed** subtitle when `allow_conversations` is false, or static help in empty state (“This group is announcements-only.”).

### 5. Phase 3.4 sheet picker

**Closed** — stream UX replaces a modal sheet ([sessionlog §3](../sessionlog.md)); covered by **E5** and **A1** in this runbook.

---

**Related code:** `MemberActivityStream.tsx`, `GET /api/members/message-center`, `gpum-mag-eligibility.ts`, `mag-thread-policy.ts`, `MemberProfileForm.tsx`, `MAGDetailClient.tsx`, `DashboardActivityStream.tsx`, `getMemberStreamItemPrimaryLine` in `gpum-message-center.ts`.