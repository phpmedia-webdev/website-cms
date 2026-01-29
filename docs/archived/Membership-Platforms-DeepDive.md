## Deep-Dive Feature Extraction for Custom Membership Capability
Scope: Catalog the feature sets of Paid Memberships Pro, S2Member, SureMembers, and WooCommerce Memberships to inspire and inform a new custom membership system. Emphasis is on capabilities beyond basic authentication: membership tiers, access levels, recurring billing, access management, and related administrative tooling.

---

## Consolidated Capability Taxonomy (Unified Feature Set)
Use this as the master checklist when designing your custom system. Subsequent sections map each platform’s features onto these categories.

- Membership models and plans
  - Unlimited plans/tiers
  - Hierarchies, bundles, add-ons, and custom capabilities
  - Multiple memberships per user
  - Free and paid trials
  - One-time purchases vs subscriptions (recurring)
  - Fixed-term, rolling, lifetime access
  - Scheduled/delayed start dates
  - Upgrades/downgrades, mid-cycle switching, proration
  - Pause/suspend, cancel, grace periods
  - Group/team (sponsored) memberships and seat management
  - Gifting/comped access
  - Plan-specific limits (download caps, rate limits)
- Access control and content protection
  - Restrict by post/page/CPT, taxonomy, specific URLs, products
  - Partial content gating (blocks/shortcodes/conditionals)
  - Drip content (by join date or calendar date)
  - Product viewing/purchasing restrictions and member-only pricing
  - File/download protection (including remote storage, expiring links)
  - Search/RSS/menu/widget filtering for restricted content
  - Custom capabilities/roles for granular permissions
- Payments and billing
  - Gateways: Stripe, PayPal, Authorize.Net, Braintree, WooCommerce gateways
  - On-site checkout, SCA/3DS, Apple Pay/Google Pay (via gateway)
  - Taxes (VAT/GST), multi-currency
  - Coupons/discount codes, member discounts, gift cards
  - Invoices/receipts, saved payment methods, card updates
  - Dunning/failed payment retries and automation
- Subscription lifecycle and automation
  - Statuses: pending, active, trialing, paused, cancelled, expired
  - EOT (end-of-term) processing, delayed start, renewal windows
  - Renewal, expiration, and failed-payment notifications
  - Event hooks and webhooks (grant/revoke/renew/past due)
- Member management (beyond authentication)
  - Custom registration/profile fields
  - Member dashboard/portal, downloadable invoices
  - Approvals/vetting workflows
  - Admin notes and internal activity/history logs
  - Import/export (CSV, APIs), bulk changes
  - Corporate/group admin (managing seats and invites)
- Integrations and ecosystem
  - LMS, forums/communities, page builders
  - eCommerce (store discounts, members-only products)
  - Email marketing ESPs and CRM syncing
  - Automation platforms (Zapier, Make, native)
  - REST APIs, webhooks, WP-CLI
- Communications
  - Templated emails: welcome, trial starting/ending, expiring/expired, renewal, failed payment, transactional notices
  - Segmented broadcasts and drip campaigns (via ESP integrations)
- Reporting and analytics
  - Signups, active members, cancellations/expired
  - Revenue/MRR, failed payments, coupon performance
  - Cohorts, plan performance, churn/retention indicators
- Security and compliance
  - GDPR tools (export/erase), consent and data retention
  - Audit trails and role-based admin permissions
  - PCI reliance on gateways, SSL enforcement
- Multisite/multilingual
  - Network/multisite support, localization/translation readiness

---

## Paid Memberships Pro (PMPro) — Feature Inventory

- Membership models and plans
  - Unlimited membership levels; core supports one level per user; optional add-on for multiple memberships per user
  - Free and paid trials, configurable billing cycles, initial fees, expiration dates
  - One-time and recurring billing; fixed-term or lifetime options
  - Upgrades/downgrades between levels; optional add-ons to influence mid-cycle behavior
  - Scheduled start/delays, optional grace periods via add-ons
  - Group/sponsored memberships (company/team accounts with seats) via add-on
  - Gift memberships and “add-on packages” (buy additional access on top of a plan)
- Access control and content protection
  - Restrict posts, pages, custom post types, categories, tags; sitewide locking
  - Partial content restriction and messaging; filtered excerpts/search/RSS
  - Drip content via “Series” add-on (schedule by days from join or fixed dates)
  - Navigation/menu filtering; members-only downloads and page-level rules
  - WooCommerce integration add-on for members-only pricing/discounts and product restriction
- Payments and billing
  - Gateways: Stripe, PayPal (various methods), Authorize.Net, Braintree, and others via add-ons
  - SCA/3DS compliance, Apple Pay/Google Pay via Stripe
  - Taxes (including VAT) via add-ons; multi-currency support
  - Discount/coupon codes; invoicing/receipts; saved payment method updates (gateway-dependent)
  - Basic dunning via gateway webhooks; failed payment handling and retry flows depend on gateway
- Subscription lifecycle and automation
  - Statuses for active/expired/cancelled; end-of-term processing
  - Renewal/expiration reminders; failed payment notifications
  - Hooks/actions/filters for custom automation; gateway webhooks for state sync
- Member management (beyond authentication)
  - Custom fields at checkout/profile; approval workflows via add-on (manual review/approval)
  - Member dashboard pages, directories, and public/limited profiles via add-ons
  - Admin notes and member history/logging via add-ons
  - Import/export members with membership metadata; bulk updates
- Integrations and ecosystem
  - ESPs (Mailchimp, ActiveCampaign, ConvertKit, Drip, etc.)
  - LMS (LearnDash, LifterLMS), communities (bbPress/BuddyPress/BuddyBoss)
  - WooCommerce, Download Monitor, and many third-party integrations
  - REST API endpoints and extensive hooks/filters for custom dev
- Communications
  - Customizable email templates for welcome, renewal, expiration, failure, admin alerts
  - ESP integrations for segmented campaigns and automations
- Reporting and analytics
  - Built-in reports for sales/revenue, signups, members by level; CSV exports
- Security and compliance
  - GDPR-friendly exports/erasure leveraging WordPress tools
  - Uses gateway-side PCI compliance; SSL enforcement options
- Multisite/multilingual
  - Works with WordPress multisite; translation-ready

---

## S2Member — Feature Inventory

- Membership models and plans
  - Multiple membership levels (free edition: limited levels; Pro supports more)
  - Custom capabilities (ccaps) for granular, additive access beyond levels
  - One-time (buy-now) and recurring subscriptions; fixed-term, lifetime, and trial periods
  - EOT (end-of-term) behavior: auto-demotion/removal, immediate or end-of-term cancellation
  - Upgrades/downgrades via Pro-Forms; sell ccaps à la carte alongside levels
  - Coupon codes and limited-time promos (Pro)
- Access control and content protection
  - Restrict posts, pages, categories, tags, specific URLs, and URI patterns
  - Partial content gating via shortcodes; conditionals on levels/ccaps
  - Robust file/download protection, including integration with Amazon S3/CloudFront
  - Expiring/secure links, per-member download limits (per day/week/month)
- Payments and billing
  - Gateways: PayPal (Standard/Pro), Stripe, Authorize.Net; ClickBank support
  - On-site Pro-Forms for card capture (Stripe/Authorize.Net)
  - Trials, setup fees, multiple currencies; tax handling configurable
  - Invoices/receipts via gateways; coupon support (Pro)
- Subscription lifecycle and automation
  - IPN/Webhook-driven EOT handling (renewals, cancellations, refunds)
  - Auto-role demotion on EOT; end-of-trial transitions
  - Email notifications for lifecycle events
- Member management (beyond authentication)
  - Custom registration/profile fields; conditional fields by level/ccaps
  - Import/export (CSV, APIs); remote operations API for provisioning
  - Event logs for transactions/IPN and system actions
- Integrations and ecosystem
  - ESP integrations (Mailchimp, AWeber, GetResponse, etc.)
  - Forums/communities (bbPress/BuddyPress), affiliate tracking integrations (e.g., iDevAffiliate)
  - Shortcodes/APIs for deep customization; multisite network support (Pro)
- Communications
  - Templated emails for confirmations, renewals, cancellations, EOT notices
- Reporting and analytics
  - Transaction and IPN logs; basic summaries (reporting largely via logs/exports)
- Security and compliance
  - Fine-grained download access controls; expiring/secure links
  - PCI via gateways; WP privacy tools compatible
- Multisite/multilingual
  - Strong WordPress multisite support (Pro), localization-ready

---

## SureMembers — Feature Inventory

- Membership models and plans
  - Access Groups representing plans/tiers; users can belong to multiple groups
  - One-time access and subscription access when paired with SureCart
  - Trials, billing intervals, and proration/pauses/cancellations via SureCart (for subscriptions)
  - Delayed start/scheduled access; expiration windows
  - Assign access on purchase, via admin, or through automation (e.g., SureTriggers)
- Access control and content protection
  - Restrict posts, pages, custom post types, categories, tags; global and granular rules
  - Partial content gating (blocks/shortcodes) for excerpts, previews, paywall-like patterns
  - Drip content by days since join or calendar dates; unlock schedules per Access Group
  - Conditional display in page builders (Gutenberg/Spectra; compatibility with popular builders)
- Payments and billing
  - Deep integration with SureCart for checkout and subscriptions
  - Gateways via SureCart (e.g., Stripe/PayPal), SCA/3DS, Apple Pay/Google Pay (gateway-driven)
  - Coupons, trials, taxes (e.g., Stripe Tax), multi-currency via SureCart
  - Dunning and failed payment retries via SureCart; saved payment methods and invoices
- Subscription lifecycle and automation
  - Access granted/revoked automatically on order/subscription events from SureCart
  - Event triggers for grant/revoke/expire; automation via SureTriggers, Zapier/Make (through SureCart/SureTriggers)
  - Renewal and expiration communications via SureCart + email integrations
- Member management (beyond authentication)
  - Assign/revoke Access Groups from admin; bulk assignment tools
  - Custom redirects (after login/logout), member-only menu logic via rules
  - Member dashboard patterns achievable with SureCart customer portal + SureMembers blocks
- Integrations and ecosystem
  - SureCart (payments, subscriptions, customer portal), SureTriggers (automation)
  - ESP integrations through SureCart/SureTriggers; LMS and community plugins compatibility
  - REST API/webhooks available via SureCart; conditional blocks for builders
- Communications
  - Welcome/access-granted/expired flows using SureCart emails and ESP automations
- Reporting and analytics
  - Subscription and revenue analytics in SureCart; member lists/export via WordPress tools and plugin data
- Security and compliance
  - PCI offloaded to gateways; GDPR export/erasure through WordPress core
- Multisite/multilingual
  - WordPress standard compatibility; translation-ready themes/plugins in the ecosystem

---

## WooCommerce Memberships — Feature Inventory

- Membership models and plans
  - Membership plans with access granted by product purchase, manual assignment, or direct admin grant
  - Fixed-length, indefinite, delayed start, and expiration rules per plan
  - Group/team memberships available via “Teams for WooCommerce Memberships” (seats, invitations, managers)
  - Gifting memberships via companion extensions
  - Multiple memberships per user supported (one per plan/product relationship)
- Access control and content protection
  - Restrict posts, pages, custom post types, categories, and tags
  - Partial content gating via shortcodes/blocks (teasers, excerpts, paywalled sections)
  - Product viewing/purchasing restrictions (members-only products, catalog visibility)
  - Member discounts on products/categories, schedule-able discounts
  - Drip content based on join date or calendar date; restrict downloadable files
- Payments and billing
  - Uses WooCommerce orders and gateways; recurring access with WooCommerce Subscriptions
  - Support for trials, sign-up fees, proration, and dunning when paired with Subscriptions
  - Coupons and member discounts; taxes, multi-currency via WooCommerce ecosystem
  - Invoices/receipts via WooCommerce; saved payment methods in My Account
- Subscription lifecycle and automation
  - Membership statuses: active, paused, cancelled, expired; automatic changes on order/subscription events
  - Renewal, expiration, and reminder emails; failed payment workflows via Subscriptions
  - Hooks, webhooks, and AutomateWoo triggers for lifecycle automation
- Member management (beyond authentication)
  - Member Area in My Account: view benefits, content, products, discounts, downloads
  - Admin tools: manual grant/revoke, bulk actions, CSV import/export of members
  - Member notes (private/admin-visible and optionally shared)
- Integrations and ecosystem
  - Broad WooCommerce ecosystem (gateways, coupons, taxes, shipping rules)
  - Teams for group access; AutomateWoo for advanced automations
  - LMS/community integrations via third-party; REST API endpoints for memberships
- Communications
  - Built-in templated emails: welcome, expiring, expired, renewal reminders
  - ESP integrations via WooCommerce and third-party connectors
- Reporting and analytics
  - Members list and status filters; exports; store-wide revenue analytics via WooCommerce
- Security and compliance
  - PCI scope limited to gateways; GDPR tooling via WordPress/Woo
- Multisite/multilingual
  - Compatible with multilingual plugins; network setups via WooCommerce best practices

---

## Consolidated Feature Backlog for a Custom Membership System
Use this backlog to plan your implementation. Each bullet represents a capability surfaced across one or more of the platforms above.

- Plans, tiers, and add-ons
  - Unlimited plans with attributes: price, billing period, trial, signup fee, access length (fixed/rolling/lifetime), delayed start
  - Multiple memberships per user and additive “capabilities” or add-on entitlements
  - Plan switching rules: upgrade/downgrade paths, mid-cycle proration, immediate vs end-of-term changes
  - Pause/suspend/resume; cancel now vs cancel at period end; grace periods
  - Group/team plans with seats, invites, manager role, seat add-ons
  - Gifting/complimentary/grant-by-admin; import of historical access
- Access rules
  - Rules engine to target content by type (post/page/CPT), taxonomy, specific resources, URLs
  - Partial gating components; teaser messaging and CTA controls
  - Drip schedules relative to join date or fixed calendar dates; per-rule schedules
  - Product restrictions (view/purchase), member-only pricing/discounts, scheduled discounts
  - File/download protection, expiring links, optional remote storage integration (e.g., S3)
  - Menu/search/RSS filtering and global “sitewide lock” modes
- Billing and commerce
  - Native subscription engine or integration with a commerce layer
  - Gateways (Stripe, PayPal, Authorize.Net, others) with SCA and wallet support
  - Trials, coupons, stacked discounts, member-only pricing; taxes (VAT/GST) and multi-currency
  - Invoices/receipts; saved payment methods; card updater flows
  - Dunning: retry logic, email notifications, past-due states, access throttling or grace
- Lifecycle and automation
  - Finite state machine for membership/subscription statuses (pending, trialing, active, paused, cancelled, expired, past_due)
  - EOT processing, delayed start, renewal windows; configurable effects on access
  - Event bus and webhooks: on grant/revoke/renew/fail/upgrade/downgrade/expire
  - Notification schedules for trial ending, renewal upcoming, expiring, expired, failed payment, re-activation
- Member management UX
  - Member dashboard: active plans, benefits, upcoming invoices, payment methods, invoices
  - Self-service: upgrade/downgrade, pause, cancel, change payment method, download invoices
  - Custom fields at signup and profile; approval workflows for gated plans
  - Admin: member notes, history/audit trail, bulk import/export, batch grants/changes
- Integrations and APIs
  - REST API for plans, rules, memberships, subscriptions, invoices, events
  - Webhooks for external systems (CRM, ESP, analytics)
  - ESP integrations and tag/segment syncing; LMS/community connectors
  - Automation connectors (Zapier/Make/native) and scheduled jobs
- Communications
  - Templated and localized emails; per-plan customization and A/B variants
  - Event-driven and schedule-driven messages; deliverability controls
- Reporting
  - Membership metrics (signups, active, churn, reactivations), MRR/ARR
  - Failed payments, dunning funnel, coupon performance
  - Drip progression and content engagement signals (if captured)
- Security and compliance
  - Audit logging for administrative actions and key lifecycle events
  - GDPR data export/erasure; configurable retention; consent tracking
  - Role-based admin permissions and least-privilege defaults
- Multisite/multilingual
  - Tenant-aware plans/rules in multi-tenant scenarios; localization of all member-facing content

---

## Implementation Notes Tailored to Your Context
Given you already have a lightweight CRM for user management and authentication:

- Decouple identity from entitlements
  - Represent memberships and subscriptions as first-class entities linked to users; avoid encoding access in roles alone.
  - Support additive entitlements (capabilities) and multiple concurrent plans per user for flexibility.

- Choose a billing strategy early
  - Build a native subscription engine or integrate with a commerce layer (e.g., Stripe/Braintree directly, or an eCommerce subsystem) to inherit trials, proration, dunning, taxes, wallets, multi-currency, and invoicing.

- Centralize lifecycle orchestration
  - Implement a state machine and event bus to handle grant/revoke/renew/fail events; expose webhooks for downstream automation.

- Unify access rules
  - Create a rules engine capable of content-level restrictions, product access, partial gating, and drip schedules; ensure consistent evaluation across API and UI.

- Invest in admin and member UX
  - Admin: bulk tools, import/export, approvals, notes/history, clear reporting.
  - Member: self-service billing and plan changes; transparent renewal/expiration communications.

This feature inventory consolidates the core and advanced patterns observed across the four platforms and should provide a comprehensive blueprint for a robust, modern membership capability.