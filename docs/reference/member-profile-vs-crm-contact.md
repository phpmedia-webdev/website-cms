# Member profile (GPUM) vs CRM contact record

**Audience:** Staff reconciling what appears on **`/members/profile`** vs the **CRM contact** card.

| Concept | GPUM (`/members/profile`) | CRM contact (`/admin/crm/contacts/[id]`) |
|--------|---------------------------|------------------------------------------|
| **Display name** (shared term for the extra public line) | **`profiles.display_name`** (and related auth metadata where used) | **`crm_contacts.full_name`** — one marketing/single-submission line; staff may clean up; can differ from first + last |
| **Structured name** (avatar initials, formal addressing) | Profile custom fields **`first_name`**, **`last_name`** | **`crm_contacts.first_name`**, **`crm_contacts.last_name`** |
| **Avatar** | Auth **`user_metadata.avatar_url`** | Not on this profile form (CRM may use other patterns later) |
| **Email** | Auth user email (read-only on profile) | **`crm_contacts.email`** — usually the same if the member registered with that email |
| **Handle / nickname** | **`profiles.handle`** via **`/api/members/profile`** — required for some messaging gates | CRM does not edit this field here |
| **MAG community messaging** | **`crm_contacts.mag_community_messaging_enabled`** + **`crm_contact_mag_community_opt_in`** (PATCH **`/api/members/messaging-preferences`**) | Staff see assignments under **Memberships**; tenant toggles **Member conversations in MAG room** on the **MAG** admin screen |

**Why they differ:** The member area is **account + profile**–centric (auth + `profiles`). The CRM card is **sales/ops**–centric (`crm_contacts`). Linking is by **user ↔ member ↔ contact** association, not by mirroring every column in both UIs.

**Avatar initials:** Across admin (and profile preview without a photo), initials are derived from **structured first + last name** (and email local-part as fallback), **not** from display name / `full_name`, so catchy phrases do not skew avatars.

**QA:** When testing parity, compare **email** and **policy** (MAG, messaging), not “display name string must always equal full_name.”

See also: [messages-and-notifications-wiring.md](./messages-and-notifications-wiring.md) (GPUM API), [qa-gpum-message-center-phase-53.md](../qa-gpum-message-center-phase-53.md).
