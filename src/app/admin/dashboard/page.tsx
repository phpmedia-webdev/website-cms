import { FormSubmissionsMetricCard } from "@/components/dashboard/FormSubmissionsMetricCard";
import { EventsMetricCard } from "@/components/dashboard/EventsMetricCard";
import { MediaMetricCard } from "@/components/dashboard/MediaMetricCard";
import { ContentMetricCard } from "@/components/dashboard/ContentMetricCard";
import { ContactMetricCard } from "@/components/dashboard/ContactMetricCard";
import { DashboardTabsClient } from "./DashboardTabsClient";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { getRagStats, getRagBaseUrl } from "@/lib/rag";
import {
  getContactsCountByStatus,
  getFormSubmissionsCount,
  getDashboardActivity,
} from "@/lib/supabase/crm";
import { getCrmContactStatuses } from "@/lib/supabase/settings";
import { getContentCount, getContentTotalChars } from "@/lib/supabase/content";
import { getEventsCount, getEventsCountByType } from "@/lib/supabase/events";
import { getMediaStats } from "@/lib/supabase/media";
import { getCurrentUser } from "@/lib/auth/supabase-auth";

function sinceIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function formatDashboardDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const schema = getClientSchema();
  const supabase = createServerSupabaseClient();
  const currentUser = await getCurrentUser();
  const username = currentUser?.display_name ?? currentUser?.email ?? "User";

  let contactsByStatus = { total: 0, byStatus: [] as { status: string; count: number }[] };
  let contactStatusLabels: Record<string, string> = {};
  let formSubs1d = 0;
  let formSubs7d = 0;
  let formSubs30d = 0;
  let formSubsAll = 0;
  let contentCount = 0;
  let contentTotalChars = 0;
  let mediaCount = 0;
  let mediaTotalBytes = 0;
  let eventsCount = 0;
  let eventsByType: Awaited<ReturnType<typeof getEventsCountByType>> = {
    total: 0,
    byType: [],
    recurringCount: 0,
    publicCount: 0,
    privateCount: 0,
  };
  let activityItems: Awaited<ReturnType<typeof getDashboardActivity>> = [];
  let ragStats = { totalTokens: 0, partCount: 0, totalChars: 0 };
  let ragUrls: string[] = [];

  try {
    const [
      contactsByStatusRes,
      contactStatusesRes,
      form1d,
      form7d,
      form30d,
      formAll,
      contentRes,
      contentCharsRes,
      mediaRes,
      mediaStatsRes,
      eventsRes,
      eventsByTypeRes,
      activityRes,
    ] = await Promise.all([
      getContactsCountByStatus(),
      getCrmContactStatuses(),
      getFormSubmissionsCount(sinceIso(1)),
      getFormSubmissionsCount(sinceIso(7)),
      getFormSubmissionsCount(sinceIso(30)),
      getFormSubmissionsCount(),
      getContentCount(),
      getContentTotalChars(),
      supabase.schema(schema).from("media").select("id", { count: "exact", head: true }),
      getMediaStats().catch(() => ({ totalCount: 0, totalSizeBytes: 0 })),
      getEventsCount(schema),
      getEventsCountByType(schema),
      getDashboardActivity(50),
    ]);
    contactsByStatus = contactsByStatusRes;
    contactStatusLabels = Object.fromEntries(
      contactStatusesRes.map((s) => [s.slug.toLowerCase(), s.label])
    );
    formSubs1d = form1d;
    formSubs7d = form7d;
    formSubs30d = form30d;
    formSubsAll = formAll;
    contentCount = contentRes;
    contentTotalChars = contentCharsRes;
    mediaCount = mediaRes.count ?? 0;
    mediaTotalBytes = mediaStatsRes.totalSizeBytes ?? 0;
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Your CMS Administration Panel
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-medium">Welcome {username}</p>
          <p className="text-sm text-muted-foreground">
            {formatDashboardDate(new Date())}
          </p>
        </div>
      </div>

      {/* Metric blocks at top */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <ContactMetricCard
          total={contactsByStatus.total}
          byStatus={contactsByStatus.byStatus}
          statusLabels={contactStatusLabels}
        />
        <FormSubmissionsMetricCard
          count1d={formSubs1d}
          count7d={formSubs7d}
          count30d={formSubs30d}
          countAll={formSubsAll}
        />
        <ContentMetricCard count={contentCount} totalChars={contentTotalChars} />
        <MediaMetricCard count={mediaCount} totalSizeBytes={mediaTotalBytes} />
        <EventsMetricCard
          total={eventsCount}
          byType={eventsByType.byType}
          recurringCount={eventsByType.recurringCount}
          publicCount={eventsByType.publicCount}
          privateCount={eventsByType.privateCount}
        />
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
