import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormByIdOrSlug, getFormSubmissions } from "@/lib/supabase/crm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default async function FormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const form = await getFormByIdOrSlug(id);
  if (!form) {
    notFound();
  }
  const submissions = await getFormSubmissions(form.id);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/crm/forms">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{form.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Submissions · {submissions.length} total
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Form submissions with payload and linked contact.
          </p>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No submissions yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Submitted</th>
                    <th className="text-left py-2 pr-4 font-medium">Contact</th>
                    <th className="text-left py-2 font-medium">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {new Date(s.submitted_at).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        {s.contact_id ? (
                          <Link
                            href={`/admin/crm/contacts/${s.contact_id}`}
                            className="text-primary hover:underline"
                          >
                            View contact
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-w-md">
                          {JSON.stringify(s.payload, null, 2)}
                        </pre>
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
