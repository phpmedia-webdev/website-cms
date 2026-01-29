# Session Log

**Purpose:** Active, focused session continuity. Not a living document — kept lean.

**Workflow:**
- **Session start:** Developer announces "start of work session." Open `sessionlog.md`; use **Next up** and **Context** to pick up where you left off.
- **Session end:** Developer announces "end of work session."
  1. Check off any completed `sessionlog` items.
  2. Sync those completions to `planlog.md` (check off corresponding items).
  3. **Delete** those items from `sessionlog.md` to keep it lean.
  4. Add **session context** (what was done, even if incomplete) to `changelog.md` — "Context for Next Session" in the new entry.
- **Abrupt stop:** Same as session end. Update `sessionlog`, sync `planlog`, prune `sessionlog`, add `changelog` context so the next session can continue.

---

## Current Focus

**Ready for next session** — Memberships (CRM MAG management) complete. Contact detail UI restructured. Cheatsheet created.

---

## Next Up

### Mag-tag restriction for media/galleries

**Use case:** Per-media MAG restriction via tags. Gallery of video titles by category; not every member has access to every title; use a "mag-tag" on media so only members with that MAG see the item.

**Design:**
- Tag slug `mag-{mag.uid}` = "restricted to this MAG"
- Auto-create mag-tag when MAG is created
- Admin assigns mag-tag to media items via taxonomy
- Gallery filters: show media if (no mag-tag) OR (user has matching MAG)

**To build:**
- [ ] On MAG create: auto-create taxonomy tag with slug `mag-{uid}` in media sections
- [ ] Helper: resolve mag-tags on media items; check user's MAGs for visibility
- [ ] Gallery/media list: filter by mag-tag visibility for authenticated members
- [ ] (Optional) Media detail: show assigned mag-tags (read-only)
