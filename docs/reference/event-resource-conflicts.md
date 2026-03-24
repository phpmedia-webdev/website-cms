# Event resource conflicts (exclusive booking)

**Scope:** Calendar **events** only. **Exclusive** registry rows (`resources.is_exclusive !== false`, DB default **true**) cannot be assigned to two **overlapping** event time ranges. **Non-exclusive** resources (`is_exclusive === false`) can overlap freely (e.g. shared “Wi‑Fi” or non-rival assets).

**Source of truth:** `events` (start/end, recurrence expanded for checks) + `event_resources`. No separate booking table.

---

## When checks run

1. **Before save (admin event form)** — `POST /api/events/check-conflicts` with:
   - `start_date`, `end_date` (ISO, draft form values)
   - `participants` (optional)
   - `resource_ids` (deduped ids from draft resource assignments)
   - `exclude_event_id` when editing (master event id)

   Runs if there is **at least one** participant **or** **one** resource id to check.

2. **When saving assignments (API)** — `PUT` / `POST` `/api/events/[id]/resources` loads the **saved** event’s `start_date` / `end_date` and rejects with **409** if the new assignment set would double-book an **exclusive** resource on another overlapping event (same logic as (1), with `exclude_event_id` = this event).

---

## What the user sees

### Scheduling conflict dialog (event form)

- Title: **Scheduling conflict**.
- **Participants** — list of other events that share a selected participant in the overlapping window (existing behavior).
- **Exclusive resources** — each row shows:
  - **Resource name** (registry)
  - **Conflicting event title**
  - **That event’s** local start → end (the **blocking** occurrence window)

So the user knows **which resource(s)** failed and **which event** already holds them for that time — not just a generic error.

- **Cancel** — close dialog; adjust participants/resources/times and save again.
- **Save anyway** — skips the **entire** pre-save conflict request once; server **409** on resources can still block if something changed between check and PUT.

### API error (409)

Body includes `error` (string) and `resource_conflicts`: array of `{ eventId, title, start_date, end_date, resource_id, resource_name }`. Clients should surface `resource_name` + conflicting `title` / times for support or a toast.

---

## Recurrence

Logic matches **participant** conflicts: calendar range is expanded via RRULE; each **occurrence** has its own window; assignments are read from the **master** `event_id`. Overlap is **interval overlap** on those occurrence windows.

---

## Related code

| Piece | Location |
|--------|-----------|
| Core logic | `getResourceConflicts` in `src/lib/supabase/events.ts` |
| Pre-save API | `POST /api/events/check-conflicts` |
| Enforcement | `src/app/api/events/[id]/resources/route.ts` (`PUT`, `POST`) |
| UI | `EventFormClient.tsx` — scheduling conflict dialog |

**Deferred (MVP if time permits):** Proactive picker hints — **both** reduce trial-and-error before save; **neither** replaces server checks. Tracked with checkboxes in [planlog — Event resource picker — MVP if time permits](../planlog.md#event-resource-picker--mvp-if-time-permits): **(1)** **ghost / unavailable** for any **`event_resources`** overlap when draft times are set; **(2)** **busy/dim** for **exclusive** resources already booked in the window (`check-conflicts` or slim read). Phase **21** links the same bullets.
