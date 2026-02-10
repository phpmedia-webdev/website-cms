import { getEvents } from "@/lib/supabase/events";
import { EventsPageClient } from "./EventsPageClient";

export default async function AdminEventsPage() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  let events: Awaited<ReturnType<typeof getEvents>> = [];
  try {
    events = await getEvents(start, end);
  } catch (err) {
    const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
    console.error("Error loading events:", msg, err);
  }

  return <EventsPageClient events={events} />;
}
