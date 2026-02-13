import { StatsCard } from "@/components/dashboard/StatsCard";
import { FormSubmissionsMetricCard } from "@/components/dashboard/FormSubmissionsMetricCard";
import { EventsMetricCard } from "@/components/dashboard/EventsMetricCard";
import { DashboardTabsClient } from "./DashboardTabsClient";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { getRagStats, getRagBaseUrl } from "@/lib/rag";
import {
  getContactsCount,
  getFormSubmissionsCount,
  getDashboardActivity,
} from "@/lib/supabase/crm";
import { getContentCount } from "@/lib/supabase/content";
import { getEventsCount, getEventsCountByType } from "@/lib/supabase/events";
import { Users, Image, FileText } from "lucide-react";

function sinceIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default async function DashboardPage() {
  const schema = getClientSchema();
  const supabase = createServerSupabaseClient();

  let contactsCount = 0;
  let formSubs1d = 0;
  let formSubs7d = 0;
  let formSubs30d = 0;
  let formSubsAll = 0;
  let contentCount = 0;
  let mediaCount = 0;
  let eventsCount = 0;
  let eventsByType = { total: 0, byType: [] as { event_type: string | null; count: number }[] };
  let activityItems: Awaited<ReturnType<typeof getDashboardActivity>> = [];
  let ragStats = { totalTokens: 0, partCount: 0, totalChars: 0 };
  let ragUrls: string[] = [];

  try {
    const [
      contactsRes,
      form1d,
      form7d,
      form30d,
      formAll,
      contentRes,
      mediaRes,
      eventsRes,
      eventsByTypeRes,
      activityRes,
    ] = await Promise.all([
      getContactsCount(),
      getFormSubmissionsCount(sinceIso(1)),
      getFormSubmissionsCount(sinceIso(7)),
      getFormSubmissionsCount(sinceIso(30)),
      getFormSubmissionsCount(),
      getContentCount(schema),
      supabase.schema(schema).from("media").select("id", { count: "exact", head: true }),
      getEventsCount(schema),
      getEventsCountByType(schema),
      getDashboardActivity(50),
    ]);
    contactsCount = contactsRes;
    formSubs1d = form1d;
    formSubs7d = form7d;
    formSubs30d = form30d;
    formSubsAll = formAll;
    contentCount = contentRes;
    mediaCount = mediaRes.count ?? 0;
    eventsCount = eventsRes;
    eventsByType = eventsByTypeRes;
    activityItems = activityRes;
  } catch (e) {
    // Metrics optional; leave at 0
  }

  try {
    ragStats = await getRagStats();
    const baseUrl = getRagBaseUrl();
    if (baseUrl && ragStats.partCount > 0) {
      ragUrls = Array.from(
        { length: ragStats.partCount },
        (_, i) => `${baseUrl}/api/rag/knowledge?part=${i + 1}`
      );
    }
  } catch {
    // RAG optional
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your CMS administration panel
        </p>
      </div>

      {/* Metric blocks at top */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Total Contacts"
          value={contactsCount}
          icon={Users}
          description="CRM contacts"
        />
        <FormSubmissionsMetricCard
          count1d={formSubs1d}
          count7d={formSubs7d}
          count30d={formSubs30d}
          countAll={formSubsAll}
        />
        <StatsCard
          title="Content items"
          value={contentCount}
          icon={FileText}
          description="Blog & pages"
        />
        <StatsCard
          title="Media"
          value={mediaCount}
          icon={Image}
          description="Images and videos"
        />
        <EventsMetricCard total={eventsCount} byType={eventsByType.byType} />
      </div>

      {/* Tabs: default Activity, then RAG */}
      <DashboardTabsClient
        activityItems={activityItems}
        ragStats={ragStats}
        ragUrls={ragUrls}
      />
    </div>
  );
}
