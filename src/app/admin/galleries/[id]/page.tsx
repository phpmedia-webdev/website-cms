import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { GalleryEditor } from "@/components/galleries/GalleryEditor";

export default async function EditGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data: gallery, error } = await supabase
    .schema(schema)
    .from("galleries")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !gallery) {
    notFound();
  }

  return <GalleryEditor gallery={gallery} />;
}
