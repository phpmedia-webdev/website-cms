import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ClipboardList, MessageSquare } from "lucide-react";

export default async function FormsPage() {
  const supabase = createServerSupabaseClient();
  const { data: forms, error } = await supabase
    .from("forms")
    .select(`
      *,
      submissions:form_submissions(count)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading forms:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage contact forms
          </p>
        </div>
        <Link href="/admin/forms/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Form
          </Button>
        </Link>
      </div>

      {!forms || forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No forms yet</p>
            <Link href="/admin/forms/new">
              <Button>Create Your First Form</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form: any) => (
            <Link key={form.id} href={`/admin/forms/${form.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <ClipboardList className="h-8 w-8 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {form.submissions?.[0]?.count || 0} submissions
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{form.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {Array.isArray(form.fields) ? form.fields.length : 0} fields
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/admin/forms/${form.id}/submissions`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Submissions
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
