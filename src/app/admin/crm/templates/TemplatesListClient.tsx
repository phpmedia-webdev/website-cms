"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContentListItem } from "@/types/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface TemplatesListClientProps {
  initialTemplates: ContentListItem[];
}

export function TemplatesListClient({ initialTemplates }: TemplatesListClientProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<ContentListItem[]>(initialTemplates);

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleEdit = (item: ContentListItem) => {
    router.push(`/admin/crm/templates/${item.id}/edit`);
  };

  const handleAddTemplate = () => {
    router.push("/admin/crm/templates/new");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Templates</h1>
        <p className="text-muted-foreground mt-2">
          Email and other reusable templates. Use placeholders like {"{{customer_name}}"} in the body; title is used as the email subject when sending.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>All templates</CardTitle>
              <CardDescription>
                Content type Template only. Add a template to create new content; use taxonomy for categories/tags.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button onClick={handleAddTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Add template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <p className="mb-4">No templates yet.</p>
              <Button onClick={handleAddTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Add template
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b bg-muted/50 hover:bg-muted/50">
                    <th className="h-10 px-4 text-left align-middle font-medium">Title (subject)</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Slug</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Updated</th>
                    <th className="h-10 w-[80px] px-4 text-left align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {templates.map((item) => (
                    <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle font-medium">
                        <Link
                          href={`/admin/crm/templates/${item.id}/edit`}
                          className="hover:underline"
                        >
                          {item.title || item.slug || "—"}
                        </Link>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground font-mono text-sm">
                        {item.slug || "—"}
                      </td>
                      <td className="p-4 align-middle">
                        <Badge variant={item.status === "published" ? "default" : "secondary"}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground text-sm">
                        {item.updated_at
                          ? format(new Date(item.updated_at), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="p-4 align-middle">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          aria-label={`Edit ${item.title}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
