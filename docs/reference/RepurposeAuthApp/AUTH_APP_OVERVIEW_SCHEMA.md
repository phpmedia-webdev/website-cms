# PHP-Auth Overview Schema for Tenant Website Integration

## 1. Architecture Change: Old vs New Model

### OLD MODEL

```
PHP-Auth (central)
    ├── Organizations
    ├── Applications (tenant websites)
    ├── Roles (central)
    ├── Users (central)
    └── Shared "big apps" (CRM, CMS, E-Comm, Projects, etc.)
```

### NEW MODEL

```
PHP-Auth (central)
    ├── Organizations
    ├── Applications (tenant websites – one per tenant)
    ├── Users (central – Supabase auth)
    ├── User-Organization links (who belongs to which org)
    └── Central audit log (receives events from tenant apps)

Tenant Website (per tenant)
    ├── Local roles (managed within tenant app)
    ├── Local role assignments
    ├── Built-in features (CRM, CMS, E-Comm, etc.)
    └── Calls PHP-Auth for:
        - Authentication
        - API key validation
        - Pushing audit events
```

---

## 2. PHP-Auth Tables – What Stays, What Changes

### Core Tables (Keep and Use)

| Table | Purpose | Tenant App Relevance |
|-------|---------|----------------------|
| `users` | Core user records (linked to Supabase auth) | User identity comes from here |
| `organizations` | Tenants | Each tenant website belongs to one org |
| `auth_applications` | Registered tenant apps | Tenant app registers here, gets API key |
| `auth_user_organizations` | User ↔ org membership | Who belongs to which tenant org |
| `audit_logs` | Central audit trail | Tenant apps push audit events here |

### Tables to Reconsider for New Model

| Table | Current Role | New Model |
|-------|--------------|-----------|
| `auth_roles` | Global roles (Super Admin, Tenant Admin, etc.) | Keep for Auth Hub admin purposes only; tenant app roles are local |
| `auth_user_applications` | User–app–role links | Likely not needed if roles are tenant-local |
| `auth_component_access` | Per-org access to CRM, CMS, etc. | May be obsolete if tenant app is standalone with built-in features |

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `auth_user_invites` | Invitation flow |
| `auth_user_sessions` | Session tracking |
| `auth_application_sessions` | API key usage tracking |
| `auth_failed_login_attempts` | Security/lockout |
| `auth_security_events` | Security events |
| `auth_api_usage` | API usage metrics |

---

## 3. Tenant App Registration Flow

### Endpoint

```
POST /api/tenant-apps/register
Auth: Super Admin (Bearer token)
```

### Request

```json
{
  "name": "mytravelswithtiff.com",
  "organizationId": "<org-uuid>",
  "description": "Travel agency website",
  "enabledComponents": []   // Optional; can be empty for standalone tenant
}
```

### Response

```json
{
  "success": true,
  "application": {
    "id": "<app-uuid>",
    "name": "mytravelswithtiff.com",
    "organizationId": "<org-uuid>",
    "description": "..."
  },
  "apiKey": "auth_xxxxxxxx...",   // Shown once; must be stored
  "warning": "Save this API key securely - it will not be shown again"
}
```

### Alternative

```
POST /api/organizations/:orgId/applications
```

Creates an application in `auth_applications` for that org.

### Result

- One row in `auth_applications` per tenant website
- `organization_id` links app to tenant
- API key used by tenant app for authentication and audit log ingestion

---

## 4. Users and Roles in the New Model

### Central (PHP-Auth)

- **Users**: All authenticated users (Supabase auth)
- **auth_user_organizations**: User ↔ org membership (who belongs to which tenant)

### Local (Tenant App)

- **Roles**: Managed within tenant app
- **Role assignments**: Per-tenant, not in PHP-Auth

### Supabase

- Supabase Auth stores passwords and issues JWTs
- `users.supabase_user_id` links PHP-Auth users to Supabase Auth

---

## 5. Audit Logging – Current vs Needed

### Current `audit_logs` Schema (from `shared/schema.ts`)

```
audit_logs:
  id, user_id, organization_id, application_id
  action, resource_type, resource_id
  login_source (auth_hub_direct | external_api | client_website_admin | etc.)
  metadata (JSONB)
  ip_address, user_agent
  previous_hash, entry_hash, verified (hash chain)
  created_at
```

### Current Behavior

- Audit events are created only inside PHP-Auth (routes, middleware)
- **No public API** for tenant apps to push audit events

### Needed for Tenant Audit Ingestion

An endpoint for tenant apps to submit audit events, for example:

```
POST /api/external/audit-log
Headers:
  X-API-Key: <tenant_app_api_key>
  Content-Type: application/json

Body:
{
  "userId": "<user-id>",           // Optional; null for system actions
  "organizationId": "<org-id>",    // From API key context
  "action": "form_submitted",      // Any string
  "resourceType": "crm_form",
  "resourceId": "<resource-id>",
  "loginSource": "tenant_app",
  "metadata": { ... },             // Flexible JSON
  "ipAddress": "...",
  "userAgent": "..."
}
```

Validation:

- Validate API key and ensure it belongs to `organizationId`
- Ensure `organizationId` matches the app's org
- Append to hash chain and store in `audit_logs`

---

## 6. API Surface for Tenant Websites

### Authentication / Identity

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/tenant/authenticate` | Email + password + org | Login; returns JWT |
| `POST /api/external/validate-user` | API key + Bearer JWT | Validate user and get profile |
| `POST /api/external/validate-api-key` | API key | App-level validation |
| `GET /api/external/user/:userId/memberships` | API key + Bearer | User org memberships |

### Registration (PHP-Auth Admin)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/tenant-apps/register` | Super Admin Bearer | Register tenant app, get API key |
| `POST /api/organizations/:orgId/applications` | Super Admin Bearer | Create application for org |

### Audit (To Be Added)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/external/audit-log` | API key | Tenant app submits audit events |

---

## 7. Data Flow Overview

### Tenant App Registration

```
Super Admin (PHP-Auth) 
  → Create Org (if needed)
  → POST /api/tenant-apps/register
  → Create Application in auth_applications
  → Return API key
  → Tenant stores API key
```

### User Authentication

```
User → Tenant Website
  → Tenant calls Supabase Auth (email/password)
  → Or tenant calls POST /api/tenant/authenticate
  → JWT returned
  → Tenant stores JWT (e.g. httpOnly cookie)
```

### Authorization (Role Check)

```
Tenant Website
  → Has JWT (identity) and API key (app identity)
  → Roles/permissions checked locally in tenant app
  → Optional: call POST /api/external/validate-user to confirm user + org
```

### Audit Logging

```
Tenant Website
  → Action occurs (e.g. form submitted, content edited)
  → POST /api/external/audit-log
    Headers: X-API-Key, Content-Type
    Body: action, resourceType, resourceId, userId, metadata, etc.
  → PHP-Auth validates API key, writes to audit_logs
```

---

## 8. Shared vs Tenant-Specific Data

### Shared (PHP-Auth / Supabase)

- `users` – all users
- `organizations` – tenants
- `auth_applications` – tenant apps
- `auth_user_organizations` – user ↔ org (and optional central role)
- `audit_logs` – central log (including tenant-sourced events)

### Tenant-Specific (Tenant App DB)

- Local roles
- Local role assignments
- CRM, CMS, E-Comm, Projects, etc. data
- App-specific domain data

---

## 9. Suggested Next Steps for Development

1. **Implement external audit endpoint** – `POST /api/external/audit-log` with API key validation and hash-chain handling.
2. **Clarify tenant registration** – `POST /api/tenant-apps/register` vs `POST /api/organizations/:orgId/applications`; document preferred flow.
3. **Document role model** – Explicitly state which roles PHP-Auth owns vs tenant-local roles.
4. **Revisit component access** – Decide if `auth_component_access` is still needed for standalone tenant apps.
5. **Share with tenant teams** – Use this document as the integration spec for tenant website development.
