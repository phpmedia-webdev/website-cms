# Plan: Bulk “Set CRM Fields” (Standard + Custom)

**Goal:** One bulk action in the contacts list dropdown: **“Set CRM Fields”**. User chooses **Standard** or **Custom**, then picks the field and value. Covers both bulk-set standard contact fields (e.g. status) and bulk-set/clear custom fields.

**Why combine:** Avoids two separate menu items (Change status + Set custom field) and gives a single place to “set any CRM field” for selected contacts.

**Not in scope:** “Edit all” on a single contact (multiple custom fields at once on detail page). That remains optional/low priority.

---

## User flow

1. User selects one or more contacts → opens bulk actions dropdown.
2. Clicks **“Set CRM Fields”** (replaces current “Change status” as the only status bulk action).
3. Dialog opens. **First choice:** “Standard field” | “Custom field”.
4. **If Standard:** Pick which standard field (v1: **Status** only). Then pick value (e.g. status options). Submit → existing `POST /api/crm/contacts/bulk-status`.
5. **If Custom:** Pick one custom field → set value or “Clear value”. Submit → new `POST /api/crm/contacts/custom-fields/bulk`.

---

## Steps

### 1. Backend — bulk upsert custom field value

- **Where:** `src/lib/supabase/crm.ts`
- **Add:** `upsertContactCustomFieldValueBulk(contactIds: string[], customFieldId: string, value: string | null): Promise<{ success: boolean; error: Error | null }>`
- **Logic:** Build rows `{ contact_id, custom_field_id, value }` for each contactId. Upsert into `crm_contact_custom_fields` with `onConflict: "contact_id,custom_field_id"`. Use existing table and conflict target.
- **Clear:** Passing `value: null` clears the value for that field for all selected contacts (upsert stores null).

### 2. API route — bulk custom field

- **Where:** `src/app/api/crm/contacts/custom-fields/bulk/route.ts`
- **Method:** POST
- **Body:** `{ contactIds: string[], custom_field_id: string, value: string | null }`
- **Validation:** Non-empty `contactIds`, valid `custom_field_id` (exists in `getCrmCustomFields()`). Normalize value (empty string → null).
- **Action:** Call `upsertContactCustomFieldValueBulk(contactIds, custom_field_id, value)`. Return `{ success }` or 400/500 with message.

### 3. Combined dialog — “Set CRM Fields”

- **Where:** `src/components/crm/SetCrmFieldsDialog.tsx` (new; can later deprecate or reuse `ChangeStatusDialog` internals for the Standard step).
- **Props:** `open`, `onOpenChange`, `selectedIds: Set<string>`, `contactStatuses: CrmContactStatusOption[]`, `onSuccess?: () => void`
- **Behavior:**
  - **Step 1 — Field type:** “What do you want to set?” → Two options: **Standard field** | **Custom field** (radio or two big buttons).
  - **Step 2a — Standard:** Dropdown or list: “Which standard field?” → v1 only **Status**. Then show status options (same as current ChangeStatusDialog). Submit → `POST /api/crm/contacts/bulk-status` with `{ contactIds, status }`. On success: `onSuccess()`, close.
  - **Step 2b — Custom:** Fetch definitions (`GET /api/crm/custom-fields`). Pick one custom field. Show value input by type (text, textarea, select, multiselect, checkbox — same as in current custom-field plan). Include **“Clear value”** option. Submit → `POST /api/crm/contacts/custom-fields/bulk` with `{ contactIds, custom_field_id, value }` (or `null` for clear). On success: `onSuccess()`, close.
- **Empty state (Custom):** If no custom fields exist: “No custom fields. Add them in CRM → Forms (Custom Fields).”
- **Back / Cancel:** User can go back to step 1 to switch Standard ↔ Custom; Cancel closes.

### 4. Wire into contacts list (replace “Change status”)

- **Where:** `src/app/admin/crm/contacts/ContactsListClient.tsx`
- **Remove:** Standalone “Change status” menu item and `ChangeStatusDialog` usage and state `changeStatusDialogOpen`.
- **Add:** One bulk menu item **“Set CRM Fields”** that opens the combined dialog. State: `setCrmFieldsDialogOpen` (or single dialog open state for this).
- **Render:** `<SetCrmFieldsDialog open={…} onOpenChange={…} selectedIds={selectedIds} contactStatuses={contactStatuses} onSuccess={() => router.refresh()} />`
- **Data:** Page already passes `contactStatuses`; no new server data needed for Standard path. Custom path fetches custom fields in the dialog.

### 5. Optional — cap and messaging

- **Cap:** Optional max contact count for bulk custom-field set (e.g. 500/1000); API can enforce. Skip for v1 if desired.
- **Success message:** Optional toast, e.g. “Set [field] for N contacts.”

### 6. Docs and planlog

- **Planlog:** Add (or update) item under Phase 07/08: “Bulk Set CRM Fields: one action (Standard | Custom); Standard = status via bulk-status; Custom = custom field set/clear via new bulk API and dialog.”
- **Changelog:** When done, add entry and remove or archive this plan doc per your workflow.

---

## Summary

| Step | What |
|------|------|
| 1 | `upsertContactCustomFieldValueBulk(contactIds, customFieldId, value)` in `crm.ts` |
| 2 | `POST /api/crm/contacts/custom-fields/bulk` |
| 3 | `SetCrmFieldsDialog` — Step 1: Standard \| Custom; Step 2a: Status (existing API); Step 2b: Custom field + value/clear (new API) |
| 4 | Contacts list: replace “Change status” with “Set CRM Fields”; one dialog; remove `ChangeStatusDialog` from this flow |
| 5 | Optional: cap, success toast |
| 6 | Planlog / changelog when done |

---

## Reference

- **Standard (status):** `POST /api/crm/contacts/bulk-status` with `{ contactIds, status }`; `ChangeStatusDialog` and status options from settings.
- **Custom:** `PATCH /api/crm/contacts/[id]/custom-fields` (single contact); `upsertContactCustomFieldValue` in `crm.ts`; `getCrmCustomFields()`; options from `validation_rules.options`.
- **Table:** `crm_contact_custom_fields(contact_id, custom_field_id, value)`; unique on `(contact_id, custom_field_id)`.
