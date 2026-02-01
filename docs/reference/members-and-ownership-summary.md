# Members & Ownership — Design Summary

**Created:** 2026-01-30  
**Status:** Confirmed for implementation

---

## 1. Overview

This document summarizes the agreed design for **members** (qualified contacts with portal access) and **ownership** (user licenses for media and courses) in the Website CMS.

---

## 2. Two Stages: Contact vs Member

### Contact (simple signup)

- Newsletter, CTA form, general form signup
- Creates/updates **CRM contact** for marketing
- **No** MAG assignment, **no** members row, **no** auth
- Lead/subscriber only — cannot access member portal

### Member (qualifying elevation)

- Requires one of:
  - **Purchase** (ecommerce webhook assigns MAG)
  - **Admin grant** (admin assigns MAG)
  - **Signup code** (visitor redeems code and registers)
- Then: MAG assigned → members row created → auth credentials → member portal access

---

## 3. Members Table

| Column      | Type    | Notes                                           |
|-------------|---------|-------------------------------------------------|
| id          | UUID    | PK                                              |
| contact_id  | UUID    | FK → crm_contacts, UNIQUE                       |
| user_id     | UUID    | FK → auth.users, UNIQUE, nullable until login   |
| created_at  | TIMESTAMPTZ |                                         |
| updated_at  | TIMESTAMPTZ |                                         |

- **Existence of row** = contact is a member
- `user_id` nullable until they register
- Member portal access requires `user_id` (logged-in)

---

## 4. User Licenses (Ownership)

| Column      | Type    | Notes                                           |
|-------------|---------|-------------------------------------------------|
| id          | UUID    | PK                                              |
| member_id   | UUID    | FK → members                                    |
| content_type| TEXT    | 'media' \| 'course'                             |
| content_id  | UUID    | media.id or course.id                           |
| granted_via | TEXT    | 'purchase' \| 'admin' \| 'code' \| 'enrollment' |
| granted_at  | TIMESTAMPTZ |                                             |
| expires_at  | TIMESTAMPTZ | NULL = lifetime                            |
| metadata    | JSONB   | e.g. order_id for ecommerce sync                |
| created_at  | TIMESTAMPTZ |                                             |

- **UNIQUE(member_id, content_type, content_id)**
- Used for: iTunes-style "My Library" (media), course enrollment
- Access check: MAG **or** ownership grants access

---

## 5. Elevation Flow

| Trigger         | Contact | MAG | members row | Auth |
|----------------|---------|-----|-------------|------|
| Simple signup  | ✓       | ✗   | ✗           | ✗    |
| Purchase       | ✓       | ✓   | ✓           | ✓*   |
| Admin grant    | ✓       | ✓   | ✓           | ✓*   |
| Signup code    | ✓       | ✓   | ✓           | ✓    |

\*Auth created on first login or by admin.

---

## 6. Form Behavior

- **Do not** auto-elevate on every form submit
- Form `auto_assign_mag_ids` only when form is a **qualifying** action (e.g. "Register for member access")
- Simple newsletter/CTA forms stay contact-only

---

## 7. MAG vs Ownership

| Concept     | Table / mechanism      | Purpose                              |
|-------------|------------------------|--------------------------------------|
| Membership  | crm_contact_mags, MAGs | Group access (e.g. Premium members)  |
| Ownership   | user_licenses          | Per-item (media, course)             |

- Access: **either** MAG **or** ownership grants access
- LMS: `course_mags` for membership-gated courses; `user_licenses` for purchased/enrolled courses

---

## 8. Auth Resolution

- `auth.uid()` → `members.user_id` → `members.id` (for ownership checks)
- When member registers: create/update members row with `user_id`
