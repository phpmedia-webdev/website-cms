import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { FormSubmissionsTable } from "@/components/forms/FormSubmissionsTable";

export default async function FormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data: form, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !form) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{form.name} - Submissions</h1>
        <p className="text-muted-foreground mt-2">
          View and manage form submissions
        </p>
      </div>
      <FormSubmissionsTable formId={id} />
    </div>
  );
}
