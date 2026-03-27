import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getContactById,
  getCrmCustomFields,
  getContactCustomFields,
  getForms,
  getContactMags,
  getContactMarketingLists,
  getMarketingLists,
} from "@/lib/supabase/crm";
import { getContactOrganizations } from "@/lib/supabase/organizations";
import { getCrmContactStatuses } from "@/lib/supabase/settings";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { listTasks } from "@/lib/supabase/projects";
import { getAdminMessageCenterStream } from "@/lib/message-center/admin-stream";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, Building2, MapPin, User } from "lucide-react";
import { ContactCardStatusBadge } from "./ContactCardStatusBadge";
import { ContactCardOrgLine } from "./ContactCardOrgLine";
import { ContactRecordLayout } from "./ContactRecordLayout";
import { ContactMergeButton } from "./ContactMergeButton";
import { ContactComposeEmailButton } from "./ContactComposeEmailButton";

type EventParticipantLinkRow = {
  event_id: string | null;
};

type RelatedEventRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  event_type: string | null;
};

type ProjectMemberLinkRow = {
  project_id: string | null;
  role_slug: string | null;
};

type RelatedTaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  task_status_slug: string;
  project_id: string | null;
  task_number: string | null;
};

type RelatedProjectRow = {
  id: string;
  title: string;
  project_number: string | null;
  project_status_slug: string | null;
  role_slug: string | null;
};

async function getRelatedEventsForContact(contactId: string): Promise<RelatedEventRow[]> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data: participant } = await supabase
    .schema(schema)
    .from("participants")
    .select("id")
    .eq("source_type", "crm_contact")
    .eq("source_id", contactId)
    .limit(1)
    .maybeSingle();
  if (!participant?.id) return [];

  const { data: links } = await supabase
    .schema(schema)
    .from("event_participants")
    .select("event_id")
    .eq("participant_id", participant.id);
  const linkRows = (links ?? []) as EventParticipantLinkRow[];
  const eventIds = [
    ...new Set(
      linkRows.map((r) => r.event_id).filter((id): id is string => id != null && id !== ""),
    ),
  ];
  if (eventIds.length === 0) return [];

  const { data: events, error } = await supabase
    .schema(schema)
    .from("events")
    .select("id, title, start_date, end_date, status, event_type")
    .in("id", eventIds)
    .order("start_date", { ascending: false });
  if (error) {
    console.error("getRelatedEventsForContact:", error);
    return [];
  }
  return (events ?? []) as RelatedEventRow[];
}

async function getRelatedProjectsForContact(contactId: string): Promise<RelatedProjectRow[]> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data: members, error: membersErr } = await supabase
    .schema(schema)
    .from("project_members")
    .select("project_id, role_slug")
    .eq("contact_id", contactId);
  if (membersErr) {
    console.error("getRelatedProjectsForContact members:", membersErr);
    return [];
  }
  const memberRows = (members ?? []) as ProjectMemberLinkRow[];
  const projectIds = [
    ...new Set(
      memberRows.map((r) => r.project_id).filter((id): id is string => id != null && id !== ""),
    ),
  ];
  if (projectIds.length === 0) return [];
  const roleByProject = new Map<string, string | null>(
    memberRows
      .filter((m): m is ProjectMemberLinkRow & { project_id: string } => m.project_id != null && m.project_id !== "")
      .map((m) => [m.project_id, m.role_slug ?? null]),
  );

  const { data: projects, error: projectsErr } = await supabase
    .schema(schema)
    .from("projects")
    .select("id, name, project_number, project_status_slug")
    .in("id", projectIds)
    .order("updated_at", { ascending: false });
  if (projectsErr) {
    console.error(
      "getRelatedProjectsForContact projects:",
      projectsErr.message || JSON.stringify(projectsErr),
    );
    return [];
  }

  type ProjectRow = {
    id: string;
    name: string | null;
    project_number: string | null;
    project_status_slug: string | null;
  };
  return ((projects ?? []) as ProjectRow[]).map((p) => ({
    id: p.id,
    title: p.name?.trim() ? p.name : "Untitled project",
    project_number: p.project_number,
    project_status_slug: p.project_status_slug,
    role_slug: roleByProject.get(p.id) ?? null,
  }));
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const [
    contact,
    customFieldDefinitions,
    contactCustomFieldValues,
    forms,
    mags,
    contactMarketingLists,
    allMarketingLists,
    contactStatuses,
    contactOrgs,
    relatedEvents,
    relatedTasks,
    relatedProjects,
    messageCenterItems,
  ] = await Promise.all([
    getContactById(id),
    getCrmCustomFields(),
    getContactCustomFields(id),
    getForms(),
    getContactMags(id),
    getContactMarketingLists(id),
    getMarketingLists(),
    getCrmContactStatuses(),
    getContactOrganizations(id),
    getRelatedEventsForContact(id),
    listTasks({ assignee_contact_ids: [id] }).then((rows) =>
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        due_date: r.due_date ?? null,
        task_status_slug: r.task_status_slug,
        project_id: r.project_id ?? null,
        task_number: r.task_number ?? null,
      }))
    ),
    getRelatedProjectsForContact(id),
    getAdminMessageCenterStream(55, "all", {
      contactId: id,
      forUserId: currentUser?.id ?? null,
    }),
  ]);

  if (!contact) {
    notFound();
  }

  const displayName =
    contact.full_name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.email ||
    "Contact";

  return (
    <div className="space-y-4">
      {/* Back to Contacts */}
      <Link
        href="/admin/crm/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

      {/* Section 1: Contact Detail (default) | Taxonomy | Custom Fields | Marketing Lists */}
      {/* Section 2: Messages and Notifications (default) | Memberships | Projects | Transactions */}
      <ContactRecordLayout
        contactDetailContent={
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex flex-row items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold truncate">{displayName}</h1>
                  {contactOrgs.length > 0 && (
                    <ContactCardOrgLine
                      orgs={contactOrgs.map((l) => ({
                        organization_id: l.organization_id,
                        organization: l.organization ? { id: l.organization.id, name: l.organization.name } : null,
                      }))}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <ContactCardStatusBadge contactId={id} status={contact.status} contactStatuses={contactStatuses} />
                  <ContactMergeButton contactId={id} displayName={displayName} />
                  <ContactComposeEmailButton contactId={id} contactEmail={contact.email} displayName={displayName} />
                  <Link href={`/admin/crm/contacts/${id}/edit`}>
                    <Button variant="outline" size="sm" className="h-8">
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 mb-4">
                <div>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact Information</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {contact.last_name || contact.full_name
                          ? [contact.last_name, contact.full_name].filter(Boolean).join(", ")
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline truncate">
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{contact.phone || "—"}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Billing address</h2>
                  <div className="space-y-1.5 text-sm">
                    {(contact.address || contact.city || contact.state || contact.postal_code || contact.country) ? (
                      <>
                        {contact.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                            <span>{contact.address}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                          {contact.city && <span>{contact.city}</span>}
                          {contact.state && <span>{contact.state}</span>}
                          {contact.postal_code && <span>{contact.postal_code}</span>}
                          {contact.country && <span>{contact.country}</span>}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  {(contact.shipping_address || contact.shipping_city || contact.shipping_state || contact.shipping_postal_code || contact.shipping_country) && (
                    <>
                      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">Shipping address</h2>
                      <div className="space-y-1.5 text-sm">
                        {contact.shipping_address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                            <span>{contact.shipping_address}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                          {contact.shipping_city && <span>{contact.shipping_city}</span>}
                          {contact.shipping_state && <span>{contact.shipping_state}</span>}
                          {contact.shipping_postal_code && <span>{contact.shipping_postal_code}</span>}
                          {contact.shipping_country && <span>{contact.shipping_country}</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="border-t pt-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Internal Contact Notes</h2>
                <div className="rounded border bg-muted/30 px-3 py-2 min-h-[5rem] overflow-y-auto whitespace-pre-wrap text-sm">
                  {contact.message?.trim() ? contact.message : "—"}
                </div>
              </div>
            </CardContent>
          </Card>
        }
        contactId={id}
        contactStatus={contact.status}
        contactStatuses={contactStatuses}
        initialCustomFieldDefinitions={customFieldDefinitions}
        initialContactCustomFieldValues={contactCustomFieldValues}
        initialForms={forms}
        contactFormId={contact.form_id ?? null}
        initialMags={mags}
        initialMarketingLists={contactMarketingLists}
        allMarketingLists={allMarketingLists}
        relatedEvents={relatedEvents}
        relatedTasks={relatedTasks}
        relatedProjects={relatedProjects}
        messageCenterItems={messageCenterItems}
      />
    </div>
  );
}
