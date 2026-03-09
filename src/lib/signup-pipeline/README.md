# Signup pipeline

Single entry point for post-signup processing: **`processSignup({ userId, email, displayName?, signupCode? })`**.

## Flow

1. **Always-on steps** (in code): ensure CRM contact, ensure member row. These build the shared context (contact, member).
2. **Code-dependent actions**: load rows from `signup_code_actions` for the given `signupCode` (or default rows where `signup_code IS NULL`). Run each action in `sort_order`.
3. Return `{ success, redirectTo?, errors? }`. `redirectTo` comes from the last row that has `redirect_path` set.

## Table: `signup_code_actions`

- **signup_code**: `TEXT` nullable. `NULL` = default actions when no code or no matching code.
- **action_type**: e.g. `ensure_crm`, `add_to_membership`, `process_payment`. Must exist in the in-code registry.
- **sort_order**: execution order.
- **config**: `JSONB` passed to the handler (e.g. `mag_id` for future use).
- **redirect_path**: optional path to send the user after signup (e.g. `/members/dashboard`).

Subroutines are **not** stored in the table; they are implemented in the codebase and registered in `registry.ts`.

## Adding a new action type

1. Implement a handler in `actions/<name>.ts`: `(context, config) => Promise<{ success, error? }>`.
2. Register it in `registry.ts`: add to `ACTION_HANDLERS` and `REGISTERED_ACTION_TYPES`.
3. Insert rows in `signup_code_actions` (via admin UI or SQL) to run it for specific codes or default.

## Callers

- **Login page** (public): after sign-in or immediate sign-up with session, calls `POST /api/signup-pipeline/process` with `{ signupCode? }`, then redirects to `redirectTo` or current redirect.
- **Auth callback** (`/api/auth/callback`): after email confirmation for type `signup` + member, runs `processSignup` with `signupCode: null`, then redirects to `redirectTo` or `next`.

## Registered action types (MVP)

- `ensure_crm` — ensure contact in CRM (also run always).
- `add_to_membership` — redeem `signupCode` to add contact to a MAG (requires code in context).
- `process_payment` — stub; implement when payment provider is integrated.
