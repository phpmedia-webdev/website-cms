# Resource time attribution (events & tasks)

This describes **how minutes are attributed to `resources` today** in the **Resource manager → Analytics** tab and **`GET /api/events/resources/usage`**, implemented in `src/lib/resources/resource-usage-analytics.ts` (`computeResourceUsageAnalytics`). Figures are **estimates**, not audited accounting.

---

## Events

1. **Range** — Request uses inclusive **`from`** / **`to`** as **UTC calendar days** (`YYYY-MM-DD` → `T00:00:00.000Z` … `T23:59:59.999Z`).

2. **Occurrences** — `getEvents(rangeStart, rangeEnd)` returns **expanded** rows for recurring series (RRULE) inside the range. Each row has its own **`start_date`** / **`end_date`** for that instance.

3. **Resource list** — Assignments are read from **`event_resources`** keyed by the **master** `event_id` (`eventIdForEdit` / series id). The same resource set applies to **every** occurrence of that series.

4. **Minutes per occurrence** —  
   `minutes = max(0, (end − start) in ms / 60_000)`.

5. **Equal split** — That total is divided **equally** among all `resource_id`s on the master event:  
   `share = minutes / resource_count`  
   Each resource receives **`share`** added to its running total for **events**.

6. **Recurrence vs “full series validation”** — Analytics and **§2.5 conflict checks** only consider occurrences **intersecting the requested or draft window**. They do **not** scan the entire infinite future of a rule in one call. Any “validate the whole series forever” rule would be a separate product decision.

7. **Rounding** — Internally values are **float** minutes. API/table rows use **`Math.round(x * 100) / 100`** (two decimal places). Splits can leave tiny fractional residuals; totals are approximate.

---

## Tasks

1. **Time logs** — All **`task_time_logs`** rows with **`log_date`** between **`from`** and **`to`** (inclusive) are summed **per `task_id`** into `totalMins`.

2. **Assignments** — Current **`task_resources`** rows for those tasks are loaded. If a task has **no** resources, it contributes **nothing** to resource totals.

3. **Equal split** — For each task:  
   `share = totalMins / count(task_resources)`  
   Each assigned resource receives **`share`** toward **tasks** minutes.

4. **Not a “completion snapshot” (yet)** — Attribution uses **current** `task_resources` and **logs in the date range**, not “resources at the time each log was saved.” A future **persisted** `resource_usage_*` or “snapshot on complete” model would differ; see [planlog Phase 21](../planlog.md#phase-21-asset--resource-management) optional usage segments.

5. **Availability** — If `task_time_logs` or `task_resources` queries fail (e.g. RLS), the API sets **`tasks_attribution_available: false`** and task minutes may be **0**.

---

## Combining

- **Per resource**, **Analytics** shows **`minutes_from_events`**, **`minutes_from_tasks`**, and **`minutes_total`** (sum).
- The UI also surfaces the **`methodology`** string returned by the API (same ideas as above, shorter wording).

---

## Related

- **Exclusive booking / overlaps:** [event-resource-conflicts.md](./event-resource-conflicts.md)
- **Session checklist:** [sessionlog.md §2.4](../sessionlog.md) (Resources)
