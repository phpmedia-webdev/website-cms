# Session Log

**Purpose:** Active, focused session continuity. Kept lean.

**Workflow:** Session start → read this + changelog "Context for Next Session". Session end → check off in planlog, delete completed from here, add context to changelog.

**Performance (speed):** See [prd.md](./prd.md) and [planlog.md](./planlog.md) — Performance (Speed).

---

## Where we are

- **Done:** Notifications settings page; SMTP/PWA as above. Tenant setup checklist. Blog: pagination, categories/tags on post, category/tag archives, author (dropdown in Content Status, display on /blog/[slug]).
- **Next:** Notification events/recipients documented; stub entry points in place (wire from flows when ready). Continue with blog template (RSS feed remaining), then blog comments, then CRM/forms/media/buttons.

---

## Next up

**Outbound SMTP (remaining)**

- [x] **4. Define notification events and recipients** — Documented in `docs/reference/notification-events-and-recipients.md`: form_submitted (admins), contact_joins_membership (admins), member_signed_up (welcome to user + optional admins). Fire-and-forget and “adding a new event” steps noted.
- [x] **5. Stub entry points for later wiring** — `notifyOnFormSubmitted` wired from form submit API. `notifyOnContactJoinsMembership` and `notifyOnMemberSignedUp` implemented as entry points; wire from membership-join and signup flows when those exist. No further wiring until deploy or test need.
- [ ] **6. Optional: templates and branding** — Site name / from name from settings or env; optional HTML wrapper. Keep minimal for v1.
- [ ] **7. Contact activity stream (outbound email logging)** — When an admin sends email to a contact from the app: send email then create CRM note (note_type `email_sent`, subject/snippet in body). Optional: add `email_sent` to CRM note types; UI from contact detail to compose/send.

**Other**

**Blog (template – important)**

- [x] **Blog list pagination** — Paginate `/blog` with `?page=2` (20 per page). Migration 117 adds offset + count RPC; content.ts has getPublishedPosts(limit, offset) and getPublishedPostsCount(); blog page has Prev/Next. Run `supabase/migrations/117_get_published_posts_pagination.sql` in SQL Editor (replace schema name if needed).
- [x] **Categories/tags on single post** — Show categories and tags on `/blog/[slug]` via `getTaxonomyTermsForContentDisplay(post.id, "post")`. Labels and links to `/blog/category/[slug]` and `/blog/tag/[slug]` (archive routes added in next item).
- [x] **One archive type** — Added `/blog/category/[slug]` and `/blog/tag/[slug]`. Term resolved by slug + type; posts via `getPublishedPostsByTermId` / `getPublishedPostsCountByTermId`; same list + pagination as main blog; access filtering applied.
- [ ] **RSS feed** — One feed for all published posts (e.g. `/blog/feed.xml` or `/feed`). Useful for syndication and SEO.

**Blog comments (add to activity stream)**

- [ ] **Blog comments stored with activity** — Add blog comments as a new activity type; do not change current activity stream behavior. Require login (no guest comments, cuts spam). Store comments in the same table (e.g. extend `crm_notes` with nullable `content_id` and `status`, allow `contact_id` null when `note_type = 'blog_comment'`; commenter = `author_id`). Comment `status`: e.g. `pending` | `approved` | `rejected` for moderation.
- [ ] **Activity stream: add comments and filter** — Add blog comment rows to the activity stream: in `getDashboardActivity`, include rows with `note_type = 'blog_comment'` (use `content_id` for post link). Extend `DashboardActivityItem` with type `blog_comment`; add "Comments" to the type filter so admins can filter the stream by comments. Comments then appear in the stream and on the PWA Status page under recent activity.
- [ ] **Moderation** — Admin UI to approve/reject comments (e.g. in activity stream or a Comments moderation view). Once approved, comment is eligible for public display.
- [ ] **Public comment form and display** — On `/blog/[slug]`: authenticated users can submit a comment (POST creates note with `note_type = 'blog_comment'`, `content_id` = post id, `status = 'pending'`). Show approved comments in a "Comments" section under the post (fetch by `content_id` and `status = 'approved'`, order by `created_at`). Resolve author display name for each comment.

- [ ] **Media: "Copy Shortcode"** — On media library items, add action that copies shortcode (e.g. `[[media:id]]`) to clipboard for pasting into editor.
- [ ] **Terms and Policys manager** — Link to external app (custom per tenant).
- [ ] **CRM Sorting** — Sort contact list by Last name, First name, Full name, Status, Updated; default sort = last activity at top (Updated).
- [ ] **Form Submission List** — Pagination; filter by date range (stack with form type).
- [ ] **Add Buttons** — Buttons and links on content edit page / blog posts.
- [ ] **App Version Number** - Add app version to the admin dashboard - derive from mvt.md document
---

## Paused / Later

- [ ] Anychat, VBout, PHP-Auth audit logging, superadmin add/delete user (see planlog).

---
