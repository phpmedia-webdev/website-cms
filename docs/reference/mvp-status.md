pnpm run dev
# MVP Status — Where We Are & What’s Left

**Purpose:** One place to see current state and what’s needed to reach MVP. Use with [planlog.md](./planlog.md) (full task list) and [sessionlog.md](./sessionlog.md) (next steps).

**Last updated:** 2026-02-03 (aligned with sessionlog + PRD MVP).

---

## 1. Phase summary (at a glance)

| Phase | Status in planlog | Reality check |
|-------|-------------------|----------------|
| **00** Supabase Auth | In progress | Auth, MFA, Integrations, Superadmin done. Setup script + template deployment not done. |
| **01** Foundation | Pending | Design system, settings, colors/fonts exist. Color palette refactor (public presets) not done. |
| **02** Superadmin UI | Pending | **Code Library done** (MVP variant): `/admin/super/code-snippets`, migration 080, `src/lib/donor`. Design system section, dark theme, “components” table as in plan not done. |
| **03** Tenant admin | In progress | **Tenant registry done:** tenant_sites, tenant_features, feature registry + roles; Tenant Sites / Tenant Users / Roles / Code Library UI. Settings → Team and effective-features guards not yet done. |
| **04** Tenant admin UI | In progress | Superadmin: Dashboard, Tenant Sites, Tenant Users, Roles, Code Library (full pages). Profile (Settings → Profile), dynamic header (site + role). Team page and sidebar/route guards by role next. |
| **05** Media | Complete | Library, storage, variants, taxonomy, upload. |
| **06** Content | In progress | Unified content, Tiptap, types/fields, taxonomy, public blog/pages. **Page type removed from content library** (product decision). Page composition / section editor not in scope for MVP. |
| **07** CRM | Pending in planlog | **Much is built:** contacts, custom fields, forms, form submissions, activity stream, MAG on contacts. API routes exist. Some planlog checkboxes are still [ ]. Central automations, external CRM push, tag/MAG UI components not done. |
| **08** Forms | In progress | Form registry, custom fields, form fields, submit API, submissions view done. |
| **09** Membership / MAG | Complete | MAG schema, utilities, Memberships UI, contact–MAG, gallery access. |
| **9C** Members & licenses | Planned | Members table, user_licenses; migrations 072–073. |
| **9A** Code generator | Planned | **Done (admin-side):** batches, generate, redeem API, Explore page. Public “Apply code” UI optional. |
| **9B** Marketing | Pending | Placeholder only. |
| **10** API | Deferred | After Phase 11 and component structure. |
| **11** CLI deployment | Active priority | Setup, reset, archive scripts not built. |
| **12** Visual component library | Pending | **MVP variant done:** code snippets + donor folder. Full Phase 12 (scanner, section_components table, `/admin/super/components`) not done. |
| **13** Archive & restore | Pending | Not started. |
| **14** Reset template | Pending | Not started. |
| **15** Polish & testing | Pending | Lint/build errors exist; not all flows tested. |

---

## 2. Recently completed (easy to miss in planlog)

- **Superadmin code snippet library (MVP):** `public.code_snippets` (migration 080), `/admin/super/code-snippets` (list/detail/new, Copy), API `/api/admin/code-snippets`. Superadmin sidebar twirldown includes Code snippets.
- **Donor folder:** `src/lib/donor/` + README for pasting snippet code for AI ingestion.
- **Page removed from content library:** Content library filters out type “page”; Page is not creatable from UI (product decision: structure in code, not as content type).

These are recorded in **Completed / Reference** in planlog; no new checkboxes were added for them in Phase 02/12 to avoid duplicate semantics (Phase 02 = “crude component list”, we built “code snippets” as the MVP variant).

---

## 3. What to do to complete MVP (critical path)

**MVP** here means: one deployable template (content, media, galleries, CRM, memberships, forms, basic public pages) **plus** tenant/superadmin structure (sites, users, roles, profile, team) with minimal polish and known gaps. See **sessionlog.md → "MVP: What's left"** for the current ordered outline.

1. **Fix build/lint**  
   - `pnpm run build` currently fails on existing lint errors (e.g. `no-html-link-for-pages`, `react/no-unescaped-entities`). Fix or relax rules so build passes.

2. **Confirm CRM + Forms + Membership (no new features)**  
   - Manually verify: content (post/snippet/etc.), media, galleries, CRM contacts, custom fields, forms, form submit, submissions, memberships (MAG), code generator (create batch, redeem). If anything is broken, fix it; no need to check off every planlog sub-item if behavior is correct.

3. **Optional but recommended for “MVP”**  
   - **Phase 11 (CLI):** Setup script (or doc) for new client schema; optional reset/archive so you can ship and support one template cleanly.  
   - **Phase 12 (full):** Only if you want the full component library (scanner, section_components table, `/admin/super/components`) before calling MVP. The current code-snippet + donor setup is enough for dev reference.

4. **Explicitly out of MVP (defer)**  
   - Phase 03/04 (tenant admin UI), Phase 09 full member routes/content protection, Phase 9B Marketing, Phase 10 API, Phase 13/14 archive/reset, Phase 15 full polish, RAG/Digicards/Team (18b).

---

## 4. Planlog check-offs to do when you have time

- **Phase 02:** Consider adding a single checked item: “Code snippet library (MVP): public.code_snippets, /admin/super/code-snippets, donor folder. Replaces crude component list for dev reference.” (Or leave as-is and rely on Completed/Reference.)
- **Phase 06:** Optionally add a short note or checked item: “Page content type removed from content library (product decision); structure built in code.”
- **Phase 07:** Many sub-items are implemented (contacts list/detail, custom fields, forms, submissions, MAG assignment, activity stream). When you do a pass, check off the ones that are clearly done so the planlog matches reality.
- **Phase 09 / 9A:** Code generator admin-side is done; check off any remaining 9A items that are implemented (e.g. redeem API, Explore page).

---

## 5. Where we are (one paragraph)

The app has auth (including MFA), superadmin (integrations, Code Library, twirldown), design system (fonts/colors), unified content (no Page in library), media and galleries (with MAG), full CRM (contacts, custom fields, forms, submissions, MAG, activity stream), membership code generator (batches, redeem API, Explore), and **tenant/superadmin structure**: tenant_sites, tenant_users, tenant_user_assignments, feature registry + roles, Tenant Sites / Tenant Users / Roles / Code Library UI, Profile (Settings → Profile), dynamic header (site + role). Remaining for MVP: **smoke-test core flows**, **Settings → Team**, **effective-features sidebar/guards**, and **Phase 11 client startup script**. See sessionlog **"MVP: What's left"** for the ordered outline.