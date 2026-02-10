import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { getEventById } from "@/lib/supabase/events";
import { EventFormClient } from "../../EventFormClient";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;

  const event = await getEventById(id);
  if (!event) notFound();

  const coverImageUrls: Record<string, string> = {};
  const coverId = (event as { cover_image_id?: string | null }).cover_image_id;
  if (coverId) {
    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();
    const { data: rows } = await supabase
      .schema(schema)
      .from("media_variants")
      .select("media_id, url")
      .eq("media_id", coverId)
      .in("variant_type", ["original", "large"])
      .order("variant_type", { ascending: false });
    if (rows?.[0]) {
      coverImageUrls[coverId] = rows[0].url;
    }
  }

  return (
    <EventFormClient
      event={event}
      coverImageUrls={coverImageUrls}
    />
  );
}
