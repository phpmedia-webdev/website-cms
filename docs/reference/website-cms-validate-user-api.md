# PHP-Auth Validate-User API — Summary for Calling Apps (e.g. website-cms)

**Audience:** Integrators (e.g. website-cms) that authenticate users via PHP-Auth using an application API key and need the user’s **role, permissions, and features** for that application.

---

## 1. Overview

The calling application uses its **unique API key** to authenticate with PHP-Auth. When a user logs in on your app, you send:

- **X-API-Key** — Your application’s API key (identifies the app).
- **Authorization: Bearer &lt;accessToken&gt;** — The user’s Supabase access token (from your login flow).

PHP-Auth then:

1. Validates the API key (app must exist and be active).
2. Validates the Bearer token (user must exist in PHP-Auth and be active).
3. Ensures the user belongs to the **application’s organization**.
4. Ensures the user has an **application-level role** for **your** application (assigned in PHP-Auth for this app).
5. Returns the user profile, organizations, and **assignment**: **role**, **permissions**, and **features** for this app.

If the user is in the org but **not** assigned to your application, PHP-Auth returns **403** with `"User does not have a role for this application"`.

---

## 2. Endpoint

| Item | Value |
|------|--------|
| **Method** | `POST` |
| **Path** | `/api/external/validate-user` |
| **Local** | `http://localhost:5000/api/external/validate-user` |
| **Live example** | `https://auth.phpmedia.com/api/external/validate-user` |

**Headers (required):**

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-API-Key` | Your application’s API key (from PHP-Auth → Applications → your app). |
| `Authorization` | `Bearer <Supabase access token>` for the logged-in user. |

No body required for validate-user.

---

## 3. Success response (200)

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "fullName": "...", "isActive": true, ... },
    "application": { "id": "...", "organizationId": "...", "name": "...", "isActive": true },
    "organizations": [
      { "id": "...", "name": "...", "roleId": "...", "roleName": "...", "roleSlug": "..." }
    ],
    "sessionId": "uuid",
    "assignment": {
      "role": { "id": "...", "name": "Editor", "slug": "website-cms-editor" },
      "permissions": [
        { "slug": "content.edit", "label": "Edit content", "parentSlug": null, "isEnabled": true }
      ],
      "features": [
        { "slug": "pages", "label": "Pages", "parentSlug": null, "isEnabled": true }
      ]
    },
    "message": "Multi-tier authentication successful"
  }
}
```

- **user** — PHP-Auth user record (id, email, fullName, etc.).
- **application** — The application that was identified by the API key (your app).
- **organizations** — Orgs the user belongs to; for the app’s org, role is the **application role** (same as `assignment.role`).
- **sessionId** — PHP-Auth session id for this user/app (audit/tracking).
- **assignment** — For **this application only**:
  - **role** — id, name, slug of the user’s role for this app.
  - **permissions** — List of permission slugs/labels enabled for that role (use for authorization).
  - **features** — List of feature slugs/labels enabled for that role (use for UI/feature flags).

Use `data.assignment.role`, `data.assignment.permissions`, and `data.assignment.features` for access control and UI in the calling app.

---

## 4. Error responses

| Status | Meaning |
|--------|---------|
| **401** | Missing or invalid API key, or missing/invalid/expired Bearer token, or user not found/inactive. |
| **403** | User does not have access: either not in the application’s organization, or **no application-level role for this app** (“User does not have a role for this application”). |
| **500** | Server error; check PHP-Auth logs. |

---

## 5. Checkpoint / status URLs for testing

Use these in order to verify connectivity and auth before testing full login.

| Purpose | Method | Path | Auth | Notes |
|---------|--------|------|------|--------|
| **Health** | GET | `/api/external/health` | X-API-Key only | Confirms API key is valid and server is up. |
| **Validate API key** | POST | `/api/external/validate-api-key` | X-API-Key only | Confirms application is authenticated. |
| **Validate user** | POST | `/api/external/validate-user` | X-API-Key + Bearer | Full login check; returns user + assignment (role, permissions, features). |

**Base URL:** Use your PHP-Auth base (e.g. `https://auth.phpmedia.com` or `http://localhost:5000`).

**Example — Health (no user token):**

```bash
curl -s "https://auth.phpmedia.com/api/external/health" \
  -H "X-API-Key: YOUR_APPLICATION_API_KEY"
```

**Example — Validate user (with user token):**

```bash
curl -s -X POST "https://auth.phpmedia.com/api/external/validate-user" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_APPLICATION_API_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN"
```

---

## 6. Caller environment variables

| Variable | Description |
|----------|-------------|
| `AUTH_BASE_URL` | PHP-Auth base URL (e.g. `https://auth.phpmedia.com`). |
| `AUTH_ORG_ID` | Organization UUID that your deployment and the PHP-Auth application belong to. |
| `AUTH_APPLICATION_ID` | Application UUID (the app in PHP-Auth that represents website-cms for this org). |
| `AUTH_API_KEY` | API key for that application (from PHP-Auth → Applications → your app). |

Ensure the user is assigned to **this** application (and has a role) in PHP-Auth; otherwise validate-user returns 403.

---

## 7. Quick testing checklist

1. **Health** — Call `GET /api/external/health` with `X-API-Key`. Expect 200 and `status: 'healthy'`.
2. **Validate API key** — Call `POST /api/external/validate-api-key` with `X-API-Key`. Expect 200.
3. **Validate user** — After user signs in (Supabase), call `POST /api/external/validate-user` with `X-API-Key` and `Authorization: Bearer <accessToken>`.
   - **200** — Check `data.assignment.role`, `data.assignment.permissions`, `data.assignment.features`.
   - **403** — User not in app’s org or not assigned to this application in PHP-Auth (add user to app and assign a role).
   - **401** — Fix API key or Bearer token (and user existence/active in PHP-Auth).

For more detail on failures and audit logs, see [Validate-User Troubleshooting](reference/validate-user-troubleshooting.md) in the PHP-Auth repo.
