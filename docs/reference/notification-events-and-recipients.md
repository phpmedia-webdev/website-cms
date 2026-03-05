# Notification events and recipients

Reference for which events trigger notifications and who receives them. Used by the notifications module (`src/lib/notifications/`) and Admin → Settings → Notifications.

## Events and recipients

| Event | Recipients | Notes |
|-------|------------|--------|
| **New Form Submitted** (`form_submitted`) | Admins | Recipients = SMTP `notification_recipients` (comma-separated). Optional future: confirmation email to submitter (if form captures email). **Wired:** form submit API calls `notifyOnFormSubmitted`. |
| **Contact joins a membership** (`contact_joins_membership`) | Admins | Recipients = SMTP `notification_recipients`. **Stub:** `notifyOnContactJoinsMembership` exists; wire from membership-join flow when implemented. |
| **Member signed up** (`member_signed_up`) | New user (welcome), optionally admins | Welcome email to the new member; optional copy to `notification_recipients`. **Stub:** `notifyOnMemberSignedUp` exists; wire from signup/registration flow when implemented. |

## Channel and wiring

- **Email:** Uses tenant SMTP config (Admin or Superadmin settings). Recipients for “admins” come from `notification_recipients` in SMTP settings.
- **PWA push:** Sent to all subscribed admin users (Status app). No per-recipient list; subscription is per user.
- **Fire-and-forget:** All notification entry points are called without awaiting in the triggering flow (e.g. `void notifyOnFormSubmitted(...).catch(...)`) so the main request is not blocked.

## Adding a new event

1. Add the action key and label in `src/lib/notifications/actions.ts` (NOTIFICATION_ACTION_KEYS, NOTIFICATION_ACTION_LABELS).
2. Add a `notifyOnX(payload)` function in `src/lib/notifications/index.ts` that reads preferences for that action and calls `sendEmail` and/or `sendPushToSubscriptions` when enabled.
3. Wire the function from the relevant flow (API or server action) with fire-and-forget.
4. Update this doc with the event and recipients.
