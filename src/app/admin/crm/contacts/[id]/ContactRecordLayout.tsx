"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { User, Tags, Settings, Mail, FileText, Users, FolderKanban, Receipt, CalendarDays, ListChecks } from "lucide-react";
import { ContactDetailClient } from "./ContactDetailClient";
import { ContactTaxonomyBlock } from "./ContactTaxonomyBlock";
import { DashboardActivityStream } from "@/components/dashboard/DashboardActivityStream";
import type { MessageCenterStreamItem } from "@/lib/message-center/admin-stream";
import { ContactNotificationsTimelineSection } from "@/components/crm/ContactNotificationsTimelineSection";
import type { CrmCustomField, ContactCustomFieldValue, ContactMag, ContactMarketingList, Form } from "@/lib/supabase/crm";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";
import type { ContactDetailSection } from "./ContactDetailClient";

type Section1Tab = "detail" | "taxonomy" | "customFields" | "marketingLists";
type Section2Tab = "messageCenter" | "events" | "tasks" | "projects" | "memberships" | "transactions";

interface RelatedEventRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  event_type: string | null;
}

interface RelatedTaskRow {
  id: string;
  title: string;
  due_date: string | null;
  task_status_slug: string;
  project_id: string | null;
  task_number: string | null;
}

interface RelatedProjectRow {
  id: string;
  title: string;
  project_number: string | null;
  project_status_slug: string | null;
  role_slug: string | null;
}

interface ContactRecordLayoutProps {
  /** First section: contact info card (shown when Contact Detail is selected). */
  contactDetailContent: React.ReactNode;
  contactId: string;
  contactStatus: string;
  contactStatuses: CrmContactStatusOption[];
  initialCustomFieldDefinitions: CrmCustomField[];
  initialContactCustomFieldValues: ContactCustomFieldValue[];
  initialForms: Form[];
  contactFormId: string | null;
  initialMags: ContactMag[];
  initialMarketingLists: ContactMarketingList[];
  allMarketingLists?: { id: string; name: string; slug: string }[];
  relatedEvents: RelatedEventRow[];
  relatedTasks: RelatedTaskRow[];
  relatedProjects: RelatedProjectRow[];
  /** Contact-scoped Message Center stream (server-built). */
  messageCenterItems: MessageCenterStreamItem[];
}

export function ContactRecordLayout({
  contactDetailContent,
  contactId,
  contactStatus,
  contactStatuses,
  initialCustomFieldDefinitions,
  initialContactCustomFieldValues,
  initialForms,
  contactFormId,
  initialMags,
  initialMarketingLists,
  relatedEvents,
  relatedTasks,
  relatedProjects,
  messageCenterItems,
}: ContactRecordLayoutProps) {
  const router = useRouter();
  const [section1, setSection1] = useState<Section1Tab>("detail");
  const [section2, setSection2] = useState<Section2Tab>("messageCenter");

  const detailClientProps = {
    contactId,
    initialCustomFieldDefinitions,
    initialContactCustomFieldValues,
    initialForms,
    contactFormId,
    initialMags,
    initialMarketingLists,
    activeSection: "notes" as ContactDetailSection,
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Contact record — Contact Detail (default) | Taxonomy | Custom Fields | Marketing Lists */}
      <Tabs value={section1} onValueChange={(v) => setSection1(v as Section1Tab)} className="w-full">
        <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto border-b">
          <TabsTrigger value="detail" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <User className="h-3.5 w-3.5 mr-1.5" />
            Contact Detail
          </TabsTrigger>
          <TabsTrigger value="taxonomy" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Tags className="h-3.5 w-3.5 mr-1.5" />
            Taxonomy
          </TabsTrigger>
          <TabsTrigger value="customFields" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Custom Fields
          </TabsTrigger>
          <TabsTrigger value="marketingLists" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            Marketing Lists
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {section1 === "detail" && contactDetailContent}
          {section1 === "taxonomy" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Taxonomy</h2>
                <p className="text-xs text-muted-foreground mb-4">Categories and tags for this contact.</p>
                <ContactTaxonomyBlock contactId={contactId} initialStatus={contactStatus} contactStatuses={contactStatuses} hideStatus />
              </CardContent>
            </Card>
          )}
          {section1 === "customFields" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Custom Fields</h2>
                <p className="text-xs text-muted-foreground mb-4">Form and contact-specific custom field values.</p>
                <ContactDetailClient {...detailClientProps} activeSection="customFields" />
              </CardContent>
            </Card>
          )}
          {section1 === "marketingLists" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Marketing Lists</h2>
                <p className="text-xs text-muted-foreground mb-4">Lists this contact is subscribed to.</p>
                <ContactDetailClient {...detailClientProps} activeSection="marketingLists" />
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>

      {/* Section 2: Message Center | Events | Tasks | Projects | Memberships | Transactions */}
      <Tabs value={section2} onValueChange={(v) => setSection2(v as Section2Tab)} className="w-full">
        <TabsList className="w-full justify-start flex-wrap gap-y-1 rounded-none border-b bg-transparent p-0 h-auto">
          <TabsTrigger value="messageCenter" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            <span className="whitespace-normal text-left leading-tight">Message Center</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
            Events
          </TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <ListChecks className="h-3.5 w-3.5 mr-1.5" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <FolderKanban className="h-3.5 w-3.5 mr-1.5" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="memberships" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Memberships
          </TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Receipt className="h-3.5 w-3.5 mr-1.5" />
            Transactions
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {section2 === "messageCenter" && (
            <div className="space-y-4 min-h-[300px]">
              <div className="flex justify-end">
                <Link
                  href={`/admin/dashboard/message-center?contact_id=${encodeURIComponent(contactId)}`}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Open full Message Center for this contact
                </Link>
              </div>
              <DashboardActivityStream
                initialItems={messageCenterItems}
                contactId={contactId}
                compact
              />
              <ContactNotificationsTimelineSection
                contactId={contactId}
                composerOnly
                onAfterSubmit={() => router.refresh()}
              />
            </div>
          )}
          {section2 === "events" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Events</h2>
                <p className="text-xs text-muted-foreground mb-4">Events linked to this contact.</p>
                {relatedEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No related events.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b bg-muted/50">
                          <th className="h-9 px-4 text-left align-middle font-medium">Title</th>
                          <th className="h-9 px-4 text-left align-middle font-medium">Start</th>
                          <th className="h-9 px-4 text-left align-middle font-medium">Status</th>
                          <th className="h-9 px-4 text-left align-middle font-medium">Type</th>
                          <th className="h-9 w-[80px] px-4 text-left align-middle font-medium">Link</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {relatedEvents.map((row) => (
                          <tr key={row.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 align-middle">{row.title}</td>
                            <td className="p-3 align-middle text-muted-foreground">
                              {new Date(row.start_date).toLocaleDateString()}
                            </td>
                            <td className="p-3 align-middle">{row.status}</td>
                            <td className="p-3 align-middle">{row.event_type ?? "—"}</td>
                            <td className="p-3 align-middle">
                              <Link href={`/admin/events/${row.id}/edit`} className="underline-offset-2 hover:underline">
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {section2 === "tasks" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Tasks</h2>
                <p className="text-xs text-muted-foreground mb-4">Tasks where this contact is linked as a member/follower.</p>
                {relatedTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No related tasks.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b bg-muted/50">
                          <th className="h-9 px-4 text-left align-middle font-medium">Task</th>
                          <th className="h-9 px-4 text-left align-middle font-medium">Due</th>
                          <th className="h-9 px-4 text-left align-middle font-medium">Status</th>
                          <th className="h-9 px-4 text-left align-middle font-medium">Project</th>
                          <th className="h-9 w-[80px] px-4 text-left align-middle font-medium">Link</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {relatedTasks.map((row) => (
                          <tr key={row.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 align-middle">
                              {row.task_number != null ? `#${row.task_number} ` : ""}
                              {row.title}
                            </td>
                            <td className="p-3 align-middle text-muted-foreground">
                              {row.due_date ? new Date(row.due_date).toLocaleDateString() : "—"}
                            </td>
                            <td className="p-3 align-middle">{row.task_status_slug}</td>
                            <td className="p-3 align-middle">{row.project_id ? "Linked" : "Standalone"}</td>
                            <td className="p-3 align-middle">
                              <Link href={`/admin/projects/tasks/${row.id}`} className="underline-offset-2 hover:underline">
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {section2 === "projects" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Projects</h2>
                <p className="text-xs text-muted-foreground mb-4">Related projects where this contact is a member.</p>
                {relatedProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No related projects.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b bg-muted/50">
                          <th className="h-9 px-4 text-left align-middle font-medium">Project</th>
                          <th className="h-9 px-4 text-left align-middle font-medium">Status</th>
                          <th className="h-9 px-4 text-left align-middle font-medium">Role</th>
                          <th className="h-9 w-[80px] px-4 text-left align-middle font-medium">Link</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {relatedProjects.map((row) => (
                          <tr key={row.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 align-middle">
                              {row.project_number != null ? `#${row.project_number} ` : ""}
                              {row.title}
                            </td>
                            <td className="p-3 align-middle">{row.project_status_slug ?? "—"}</td>
                            <td className="p-3 align-middle">{row.role_slug ?? "—"}</td>
                            <td className="p-3 align-middle">
                              <Link href={`/admin/projects/${row.id}`} className="underline-offset-2 hover:underline">
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {section2 === "transactions" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Transactions</h2>
                <p className="text-xs text-muted-foreground">Related transactions (coming soon).</p>
              </CardContent>
            </Card>
          )}
          {section2 === "memberships" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Memberships</h2>
                <p className="text-xs text-muted-foreground mb-4">Membership access groups (MAGs) for this contact.</p>
                <ContactDetailClient {...detailClientProps} activeSection="mags" />
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>
    </div>
  );
}
