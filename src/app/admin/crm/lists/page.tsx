import Link from "next/link";
import { getMarketingLists } from "@/lib/supabase/crm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ListChecks } from "lucide-react";

export default async function ListsPage() {
  const lists = await getMarketingLists();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Lists</h1>
          <p className="text-muted-foreground mt-2">
            Manage email and marketing lists
          </p>
        </div>
        <Link href="/admin/crm/lists/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New list
          </Button>
        </Link>
      </div>

      {!lists || lists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No marketing lists yet</p>
            <Link href="/admin/crm/lists/new">
              <Button>Create your first list</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium p-3">Name</th>
                    <th className="text-left font-medium p-3">Slug</th>
                    <th className="text-left font-medium p-3">Description</th>
                    <th className="text-left font-medium p-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {lists.map((list) => (
                    <tr
                      key={list.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <Link
                          href={`/admin/crm/lists/${list.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {list.name}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{list.slug}</td>
                      <td className="p-3 text-muted-foreground">{list.description ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">
                        {list.created_at ? new Date(list.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
