# VAPID keys for PWA push notifications (archived)

**Content merged into:** `docs/tenant-site-setup-checklist.md` (Step 5: Configure environment variables → VAPID keys).

Use these in `.env.local` (or your deployment env) so the app can send Web Push notifications to admin PWA subscribers.

## Variable names

- `VAPID_PUBLIC_KEY` — Public key (URL-safe base64). Used by the browser when subscribing.
- `VAPID_PRIVATE_KEY` — Private key (URL-safe base64). Used by the server when sending. **Keep secret.**
- `VAPID_MAILTO` (optional) — Contact for the push service, e.g. `mailto:support@yoursite.com`. Defaults to `mailto:support@example.com` if not set.

## Generate keys

Generate a key pair once (e.g. when moving to a domain):

```bash
npx web-push generate-vapid-keys
```

Example output:

```
=======================================
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib27-P6O2R...

Private Key:
UUxI4O8-FbRouA...

=======================================
```

Copy the **Public Key** and **Private Key** (full lines) into your env.

## Copy/paste template

Add to `.env.local`:

```
# PWA Web Push (required to send push to admin Status app). Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=REPLACE_WITH_PUBLIC_KEY
VAPID_PRIVATE_KEY=REPLACE_WITH_PRIVATE_KEY
VAPID_MAILTO=mailto:support@yoursite.com
```

Replace the placeholder values. Use the **same** key pair for the life of the app; changing keys invalidates existing push subscriptions.

## When push is not sent

- If `VAPID_PUBLIC_KEY` or `VAPID_PRIVATE_KEY` is missing or empty, the server will not send push (no error; notifications simply won't be delivered).
- On localhost, push subscription and sending may not work end-to-end; deploy to HTTPS to test.
