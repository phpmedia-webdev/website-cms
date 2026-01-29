import { getForms, getFormSubmissions } from "@/lib/supabase/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmissionsListClient } from "./SubmissionsListClient";
import type { FormSubmission } from "@/lib/supabase/crm";

type SubmissionWithForm = FormSubmission & { formName: string; formId: string };

export default async function AllFormSubmissionsPage() {
  const forms = await getForms();
  const submissionsByForm = await Promise.all(
    forms.map(async (f) => {
      const subs = await getFormSubmissions(f.id);
      return subs.map((s) => ({ ...s, formName: f.name, formId: f.id }));
    })
  );
  const all: SubmissionWithForm[] = submissionsByForm
    .flat()
    .sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">Form submissions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            All submissions across forms · {all.length} total
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Form submissions with payload and linked contact. Filter by form below, or use the Inbox icon on a form (CRM → Forms) to see only that form’s submissions.
          </p>
        </CardHeader>
        <CardContent>
          <SubmissionsListClient
            forms={forms.map((f) => ({ id: f.id, name: f.name }))}
            submissions={all}
          />
        </CardContent>
      </Card>
    </div>
  );
}
