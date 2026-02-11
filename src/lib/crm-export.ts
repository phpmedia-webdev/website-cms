/**
 * CRM export constants. Shared by client (field selector) and server (API).
 * No server-only imports so client components can use this file.
 */

export const EXPORT_MAX_RECORDS = 10_000;

export const EXPORT_CONTACT_FIELDS: { key: string; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "full_name", label: "Full name" },
  { key: "company", label: "Company" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "postal_code", label: "Postal code" },
  { key: "country", label: "Country" },
  { key: "status", label: "Status" },
  { key: "dnd_status", label: "Do not contact" },
  { key: "source", label: "Source" },
  { key: "message", label: "Message" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated" },
];
