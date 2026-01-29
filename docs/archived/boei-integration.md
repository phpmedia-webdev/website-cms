# Boei Widget Integration

This document defines the integration between the Boei floating widget ([boei.help](https://boei.help)) and the Website CMS. The Boei widget is included in the fork deployment package for clients. Incoming form submissions are received via webhooks and mapped to CRM contacts and form submissions.

**Reference:** [Boei Webhooks](https://feedback.boei.help/f/knowledge-base/webhooks)

---

## Overview

- **Boei:** Floating widget that serves as a link springboard and provides built-in form types for collecting contacts.
- **Integration:** Boei sends a POST webhook to a configurable URL when a user submits a form. The CMS exposes one webhook endpoint per form type; each maps to a **template form** in the form registry.
- **Template deployment:** The four Boei form types below are created as **standard template forms** so webhook endpoints are ready. Each form has a stable slug used in the webhook path (e.g. `/api/webhooks/incoming/boei-contact`).

---

## Boei Form Types and Webhook Payloads

Payload specs are taken from [Boei Webhooks](https://feedback.boei.help/f/knowledge-base/webhooks). Field names and types may need to be verified with live webhook tests or Boei support.

### 1. Contact Form

**Boei doc:** [Contact Form Widget](https://feedback.boei.help/f/knowledge-base/contact-form)

**Webhook payload (example):**

```json
{
  "timestamp": "2021-05-16T17:43:44.034777Z",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "message": "I have a question about...",
  "page_title": "Contact Us",
  "page_url": "yoursite.com/contact"
}
```

| Field        | Type   | Notes                    |
|-------------|--------|--------------------------|
| `timestamp`  | string | ISO 8601                  |
| `name`      | string | Full name                 |
| `email`     | string | Email                     |
| `phone`     | string | Phone                     |
| `message`   | string | Message body              |
| `page_title`| string | Page where form was used  |
| `page_url`  | string | Page URL                  |

**Recommended template form slug:** `boei-contact`

**CRM mapping:** `name` → full_name or first/last; `email`, `phone`, `message` → contact fields; create/update contact by email; create `form_submissions` row with `form_id` = boei-contact form.

---

### 2. Newsletter Signup

**Boei doc:** [Newsletter Signup Widget](https://feedback.boei.help/f/knowledge-base/newsletter-signup)

**Webhook payload (example):**

```json
{
  "timestamp": "2021-05-16T17:43:44.034777Z",
  "gdpr_checked": "true",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "page_title": "Home",
  "page_url": "yoursite.com"
}
```

| Field         | Type   | Notes                    |
|---------------|--------|--------------------------|
| `timestamp`   | string | ISO 8601                  |
| `gdpr_checked`| string | e.g. `"true"`             |
| `name`        | string | Subscriber name           |
| `email`       | string | Email                     |
| `page_title`  | string | Page where form was used  |
| `page_url`    | string | Page URL                  |

**Recommended template form slug:** `boei-newsletter`

**CRM mapping:** `name`, `email` → contact; store `gdpr_checked` in consent or custom field if needed; create/update contact by email; create `form_submissions` with `form_id` = boei-newsletter form.

---

### 3. Feedback Form

**Boei doc:** [Feedback Form Widget](https://feedback.boei.help/f/knowledge-base/feedback-form)

**Webhook payload (example):**

```json
{
  "timestamp": "2021-05-16T17:39:35.500695Z",
  "feedback": "5/5",
  "comment": "Great service!",
  "page_title": "Thank You",
  "page_url": "yoursite.com/thanks"
}
```

| Field        | Type   | Notes                    |
|-------------|--------|--------------------------|
| `timestamp`  | string | ISO 8601                  |
| `feedback`   | string | e.g. rating "5/5"         |
| `comment`   | string | Free-text feedback       |
| `page_title`| string | Page where form was used  |
| `page_url`  | string | Page URL                  |

**Note:** This payload has no `email` or `name`. Options: (a) treat as anonymous feedback and store in `form_submissions` only (no contact match), or (b) if Boei adds identity fields in the future, map to contact. Document the chosen behavior in the webhook handler.

**Recommended template form slug:** `boei-feedback`

**CRM mapping:** Create `form_submissions` row with payload (form_id = boei-feedback). Optionally create a minimal contact if a field like email is added by Boei later; otherwise no contact create/update.

---

### 4. Call Me Back

**Boei doc:** [Call Me Back Widget](https://feedback.boei.help/f/knowledge-base/call-me-back)

**Webhook payload (assumed — verify with Boei docs or live webhook):**

Call Me Back typically collects name and phone so someone can call the visitor back. A reasonable payload shape:

```json
{
  "timestamp": "2021-05-16T17:43:44.034777Z",
  "name": "John Doe",
  "phone": "+1234567890",
  "message": "Please call back in the afternoon",
  "page_title": "Contact Us",
  "page_url": "yoursite.com/contact"
}
```

| Field        | Type   | Notes                    |
|-------------|--------|--------------------------|
| `timestamp`  | string | ISO 8601                  |
| `name`      | string | Full name                 |
| `phone`     | string | Phone (primary for match) |
| `message`   | string | Optional note             |
| `page_title`| string | Page where form was used  |
| `page_url`  | string | Page URL                  |

**Recommended template form slug:** `boei-call-me-back`

**CRM mapping:** `name`, `phone`, `message` → contact; create/update contact by **phone** (or email if present); create `form_submissions` with `form_id` = boei-call-me-back form. If Boei does not send `email`, matching by phone only is required.

---

## Template Forms (Standard Deployment)

These four forms are created as part of the standard template so webhook endpoints exist on every deployment:

| Form type    | Template slug        | Webhook path (example)                              |
|-------------|----------------------|-----------------------------------------------------|
| Contact     | `boei-contact`       | `POST /api/webhooks/incoming/boei-contact`          |
| Newsletter  | `boei-newsletter`   | `POST /api/webhooks/incoming/boei-newsletter`       |
| Feedback    | `boei-feedback`     | `POST /api/webhooks/incoming/boei-feedback`         |
| Call Me Back| `boei-call-me-back` | `POST /api/webhooks/incoming/boei-call-me-back`     |

- **Creation:** Seed or migration creates these four form definitions (name, slug) in the client schema if they do not exist. Field assignments can be minimal (e.g. core fields that match the payload).
- **Boei config:** In the Boei dashboard, the client (or developer) configures one webhook URL per form type (if Boei supports multiple URLs) or a single URL that routes by payload/content type. If Boei only allows one URL per widget, use one endpoint (e.g. `/api/webhooks/incoming/boei`) and route internally by payload shape or a type field if Boei sends one.

---

## Security

- **Verification:** If Boei supports a shared secret or signature header, validate it in the webhook handler before creating/updating contacts.
- **Optional secret in URL:** e.g. `?secret=<token>` or path segment; validate and reject if missing or wrong.
- **Idempotency:** If Boei sends a unique submission id, store it and ignore duplicates.

---

## Implementation Checklist

- [ ] Add webhook route(s): e.g. `POST /api/webhooks/incoming/[formSlug]` or `POST /api/webhooks/boei` with internal routing.
- [ ] Parse JSON body; map Boei fields to contact + form_submissions (match contact by email or phone as appropriate).
- [ ] Seed or migration: create four template forms (boei-contact, boei-newsletter, boei-feedback, boei-call-me-back) in new client schemas.
- [ ] Document in admin: where to find webhook URLs for Boei (e.g. Form registry or Settings → Integrations).
- [ ] Verify Call Me Back payload with Boei docs or a test submission; update this doc if different.

---

## References

- [Boei Webhooks](https://feedback.boei.help/f/knowledge-base/webhooks)
- [Boei Contact Form](https://feedback.boei.help/f/knowledge-base/contact-form)
- [Boei Newsletter Signup](https://feedback.boei.help/f/knowledge-base/newsletter-signup)
- [Boei Feedback Form](https://feedback.boei.help/f/knowledge-base/feedback-form)
- [Boei Call Me Back](https://feedback.boei.help/f/knowledge-base/call-me-back)
