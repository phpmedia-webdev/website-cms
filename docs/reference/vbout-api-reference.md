# VBOUT API Reference

Reference notes from the [VBOUT Developer Network](https://developers.vbout.com/) for integrating our CRM with VBOUT email marketing (one VBOUT sub-account per tenant).

---

## Overview

- **Product:** VBOUT.com — email marketing and marketing automation.
- **API:** REST, JSON. Official docs: [developers.vbout.com](https://developers.vbout.com/).
- **Use case:** Sync CRM contacts to a VBOUT sub-account so tenants can run campaigns on contacts managed in our app.

---

## Authentication

- **Where to get keys:** VBOUT account → **Settings → API integration**.
- **User Key:** Unique string that replaces account user/password for API access. Cannot be altered, replaced, or deleted.
- **Application Key:** Generated from Account Settings and activated via VBOUT Connect. Limited access; can be deleted to revoke access.
- **Usage:** Key is sent in the request. Quickstart example uses JSON body: `{"key":"YOUR_API_ID"}`.

---

## Base URL and Test

- **Base URL:** `https://api.vbout.com/1/`
- **Test endpoint:** `GET` or `POST`  
  `https://api.vbout.com/1/app/me.json`  
  with body `{"key":"YOUR_API_KEY"}`.
- **Success response:** `response.header.status === "ok"`, `data.business` with business name, contact, package, etc.
- **Invalid key:** `status === "error"`, `errorCode` 1002.

---

## Email Marketing API

Path base: **`/emailmarketing/`**  
Full URL pattern: `https://api.vbout.com/1/emailmarketing/<action>.json`

Source: [API docs](https://developers.vbout.com/docs/1_0/), [Quickstart](https://developers.vbout.com/quickstart), [PHP library](https://github.com/irajab/VBOUTAPI) (`EmailMarketingWS.php`), and [Get started with API calls](https://help.vbout.com/knowledge-base/get-started-with-api-calls/).

### Lists

| Purpose        | Method (PHP) | Typical HTTP | Notes                          |
|----------------|--------------|--------------|--------------------------------|
| Get all lists  | `getlists`   | GET          | Returns `data.lists`           |
| Get one list   | `getlist`    | GET          | Params: `id` (list id)         |
| Add list       | `addlist`    | POST         | Returns `data.item`            |
| Edit list      | `editlist`   | POST         |                                |
| Delete list    | `deletelist` | —            | Params: `id`                   |

**List ID:** In the VBOUT app, open the list page; the list id is in the URL.

### Contacts

| Purpose              | Method (PHP)      | Typical HTTP | Notes                                  |
|----------------------|-------------------|--------------|----------------------------------------|
| Get contacts in list | `getcontacts`     | GET          | Params: `listid`                        |
| Get contact by email | `getcontactbyemail` | GET        | Params: `email`, `listid`              |
| Get one contact      | `getcontact`      | GET          | Params: `id` (contact id)              |
| Add contact          | `addcontact`      | POST         | Returns `data.item`                    |
| Edit contact         | `editcontact`     | POST         |                                        |
| Delete contact       | `deletecontact`   | —            | Params: `id`                           |

**Contact ID:** In the VBOUT app, open the lead/contact profile; the contact id is in the URL.

### Forms (for list signup / field mapping)

- **Get forms:** `getforms` — returns `data.forms`.
- **Field ID:** In the list form preview, right‑click a field → Inspect; field id is in the markup. List and field IDs can also be obtained via the API (e.g. [GetLists](https://developers.vbout.com/docs#tag/Contact/operation/get-EmailMarketing-GetLists)).

### Campaigns (optional for later)

- Get campaigns, get one campaign, add/edit/delete campaign (from `EmailMarketingWS.php`).

---

## Where to Find IDs (Help Center)

- **API Key:** Settings → API integration.
- **List ID:** List page URL in the VBOUT app.
- **Field ID:** List form preview → right‑click field → Inspect (or via API).
- **Contact ID:** Lead/contact profile URL in the VBOUT app.

Ref: [Get started with API calls](https://help.vbout.com/knowledge-base/get-started-with-api-calls/).

---

## Adding Contacts to VBOUT (Ways)

From [Adding Contacts to your account](https://help.vbout.com/knowledge-base/adding-contacts-to-your-account/):

1. Zapier or other third‑party tools  
2. Native integrations (Salesforce, HubSpot, Zoho, Insightly)  
3. **Native API** from the [sample library](https://developers.vbout.com/docs)  
4. [Form API](https://help.vbout.com/knowledge-base/using-the-form-api-integration/) with website tracking code  
5. Mass upload (e.g. CSV/XLS)

For our CRM sync we use **3. Native API** (server-side calls to `api.vbout.com/1/emailmarketing/*.json`).

---

## Ecommerce API (Separate)

VBOUT also has an [Ecommerce Integration](https://developers.vbout.com/ecommerceIntegration#api) (cart, order, product view, etc.) via:

- **Tracker:** Script `https://www.vbout.com/ext/plugin.ecommerce.js` and client-side commands.
- **REST API:** Create/update cart, order, customer (e.g. `store.customer.add` with email, firstname, lastname, phone, company, country).

That is separate from the **Email Marketing** API. For CRM contact sync we use the Email Marketing endpoints above, not the ecommerce customer endpoints (unless we later decide to sync from ecommerce events).

---

## Sync Strategy (Our App ↔ VBOUT)

- **Per tenant:** One VBOUT sub-account; store its **API key** in our integrations (e.g. `vbout` integration, `config.api_key`).
- **List mapping:** Either map our marketing list(s) to VBOUT list id(s), or use a single default VBOUT list id per tenant.
- **Push from our app:** When a contact is added to a (mapped) marketing list in our CRM, call VBOUT `addcontact` or `editcontact` and subscribe to the corresponding list. Respect DND (do not push if contact has email do-not-contact).
- **Optional:** “Sync to VBOUT” action on contact or list; or sync on form submission when a contact is created/updated and assigned to a list.

---

## Links

| Resource | URL |
|----------|-----|
| Developer home | https://developers.vbout.com/ |
| API docs (1.0) | https://developers.vbout.com/docs/1_0/ |
| Quickstart | https://developers.vbout.com/quickstart |
| Get started (API calls) | https://help.vbout.com/knowledge-base/get-started-with-api-calls/ |
| Adding contacts | https://help.vbout.com/knowledge-base/adding-contacts-to-your-account/ |
| PHP library (GitHub) | https://github.com/irajab/VBOUTAPI |
| Ecommerce integration | https://developers.vbout.com/ecommerceIntegration#api |
| API team | apiteam@vbout.com |

---

## Document info

- **Created:** From review of VBOUT developer and help docs for CRM ↔ VBOUT sync.
- **Project:** Website CMS — CRM email marketing integration (Phase 12A / Marketing).
