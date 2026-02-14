# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Current Focus

_(None — use Next up.)_

---

## Next up
- [ ] **Merge field selector/confirmation** — Add UI (and optional API support) to choose which contact’s value wins per field when merging: either full preview + per-field choice for standard and custom fields, or conflict-only (show “which value to keep?” only where both contacts have different non-empty values). Keeps current “primary wins, secondary fills blanks” as default when no choices provided.
- [ ] **CRM external UIDs — schema** — Add three standard external UID columns to `crm_contacts`: Anychat (keep or rename `external_crm_id`), `external_vbout_id`, `external_stripe_id`. Migration: add new columns; backfill Anychat from existing `external_crm_id` if renaming. Update RPCs/list/detail to return new columns.
- [ ] **CRM external UIDs — custom field lock** — Add `is_system` (or `read_only`) to `crm_custom_fields`; UI/API: block edit and delete for system fields.
- [ ] **CRM external UIDs — temporary ecommerce** — Create one system custom field for “External ecommerce customer ID” (locked). Document or implement payment webhook path: create/update contact, store external store’s customer UID in this custom field, add to MAG. Use until in-app ecommerce exists.
- [ ] **CRM external UIDs — helpers** — Add `getContactByExternalId(source, id)` (or per-source lookups) in crm.ts for Anychat, VBout, Stripe; use in webhooks and future VBout/Stripe integration.

---

## Paused / Later

- [ ] **Emailer: Node.js built-in** — Implement built-in email tool for sending email messages (export is ready to download).
- [ ] **Terms and Policys manager** External application but needs a link (always a custom update per tenant)
- [ ] **Anychat** Integration work (Anychat push to CRM, VBout sync) and other items in Paused / Later.
- [ ] **VBout Integration** Create API routes to VBout with CRM data.

---
