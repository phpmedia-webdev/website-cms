# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Current Focus

- [ ] **Pre-launch cleanup & code review (step plan):**
  - [ ] **Dead code:** Remove or archive `ChangeStatusDialog` (replaced by SetCrmFieldsDialog); remove or archive `PostEditor` (unused; posts use content redirect).
  - [ ] **TODOs:** Fix or remove stale 2FA TODOs in `src/app/admin/super/integrations/page.tsx` and `src/app/api/admin/integrations/route.ts` (2FA is implemented).
  - [ ] **Code review — security:** Auth/role gates, RLS on all tables, input validation on API routes, no secrets in client.
  - [ ] **Code review — modular alignment:** Confirm routes/components/lib match mvt.md and prd-technical feature boundaries.
  - [ ] **Refactor (optional, one at a time):** ContactDetailClient (~1,170 lines) → split by section; Sidebar (~880 lines) → extract nav config/components; ContactsListClient (~634 lines) → extract bulk bar or table; optionally split `crm.ts` by domain.
  - [ ] **Changelog / planlog:** Add pre-launch review entry; check off planlog “Code Review, Security & Modular Alignment” when done.

- [ ] **RAG Page Builder** use content to build optimized rag page for AI Agent Training
---

## Paused / Later

- [ ] **Emailer: Node.js built-in** — Implement built-in email tool for sending email messages (export is ready to download).
- [ ] **Phase 12** AnyChat (12B), Marketing/Vbout (12A)
- [ ] **VBout Integration** Create API routes to VBout with CRM data.
---


See changelog **"Context for Next Session"** for handoff.
