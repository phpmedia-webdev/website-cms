import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users } from "lucide-react";

const CRM_SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  // Get list
  const { data: listData } = await supabase.rpc("get_marketing_list_by_id_dynamic", {
    schema_name: CRM_SCHEMA,
    list_id_param: id,
  });
  const list = Array.isArray(listData) ? listData[0] : null;

  if (!list) {
    notFound();
  }

  // Get contacts in this list
  const { data: contactsData } = await supabase.rpc("get_contacts_by_marketing_list_dynamic", {
    schema_name: CRM_SCHEMA,
    list_id_param: id,
  });
  const contacts = (contactsData as any[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/crm/lists">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{list.name}</h1>
          <p className="text-muted-foreground mt-1">{list.description || list.slug}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contacts in this list ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts in this list yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium p-2">Name</th>
                    <th className="text-left font-medium p-2">Email</th>
                    <th className="text-left font-medium p-2">Status</th>
                    <th className="text-left font-medium p-2">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c: any) => (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="p-2">
                        <Link
                          href={`/admin/crm/contacts/${c.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.full_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                        </Link>
                      </td>
                      <td className="p-2 text-muted-foreground">{c.email ?? "—"}</td>
                      <td className="p-2">
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted">
                          {c.status}
                        </span>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {c.added_at ? new Date(c.added_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
