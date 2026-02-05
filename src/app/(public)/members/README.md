# Members Area (/members)

Permanent template routing for logged-in member self-service. Part of the template app even when membership/MAG features are not used.

- **`/members`** — Dashboard (landing)
- **`/members/profile`** — Member profile: display name, avatar, other info (distinct from Team/admin profile)
- **`/members/account`** — Account settings (password, etc.)

Middleware protects these routes (auth + type member or admin). Header shows "Members Area" dropdown with these links when the user is logged in.

**Performance:** CRM + members sync (ensure contact in CRM, ensure members row) runs only in this layout (i.e. when the user visits any `/members/*` page), not on every public page. This keeps the rest of the site fast; see PRD and planlog.
