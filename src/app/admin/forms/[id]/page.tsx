import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { FormEditor } from "@/components/forms/FormEditor";

export default async function EditFormPage({
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

  return <FormEditor form={form} />;
}
