import { FormSubmissionsMetricCard } from "@/components/dashboard/FormSubmissionsMetricCard";
import { EventsMetricCard } from "@/components/dashboard/EventsMetricCard";
import { MediaMetricCard } from "@/components/dashboard/MediaMetricCard";
import { ContentMetricCard } from "@/components/dashboard/ContentMetricCard";
import { ContactMetricCard } from "@/components/dashboard/ContactMetricCard";
import { OrdersMetricCard } from "@/components/dashboard/OrdersMetricCard";
import { DashboardTabsClient } from "./DashboardTabsClient";
import { DashboardQuickLinks } from "./DashboardQuickLinks";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { getRagStats, getRagBaseUrl } from "@/lib/rag";
import { getContactsCountByStatus, getFormSubmissionsCount } from "@/lib/supabase/crm";
import { getAdminMessageCenterStream } from "@/lib/message-center/admin-stream";
import { countUnreadThreadsForUser } from "@/lib/supabase/conversation-threads";
import { getCrmContactStatuses } from "@/lib/supabase/settings";
import { getContentCount, getContentTotalChars } from "@/lib/supabase/content";
import { getEventsCount, getEventsCountByType } from "@/lib/supabase/events";
import { getMediaStats } from "@/lib/supabase/media";
import { getOrderMetrics, type OrderMetrics } from "@/lib/shop/orders";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMvtVersionInfo } from "@/lib/mvt";

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
  const mvtVersion = await getMvtVersionInfo();

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
  let messageCenterItems: Awaited<ReturnType<typeof getAdminMessageCenterStream>> = [];
  let messageCenterUnread = 0;
  let ragStats = { totalTokens: 0, partCount: 0, totalChars: 0 };
  let ragUrls: string[] = [];
  const defaultOrderMetrics: OrderMetrics = {
    pending: 0,
    paid: 0,
    processing: 0,
    completed: 0,
    todayCount: 0,
    processingCount: 0,
    revenueCompleted: 0,
  };
  let orderMetrics = defaultOrderMetrics;

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
      messageCenterRes,
      orderMetricsRes,
      unreadRes,
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
      getAdminMessageCenterStream(60, "all"),
      getOrderMetrics(schema).catch(() => defaultOrderMetrics),
      currentUser?.id
        ? countUnreadThreadsForUser(currentUser.id).catch(() => 0)
        : Promise.resolve(0),
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
    messageCenterItems = messageCenterRes;
    orderMetrics = orderMetricsRes;
    messageCenterUnread = unreadRes;
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
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-muted-foreground">
              Your CMS Administration Panel
              {(mvtVersion.appVersion ?? mvtVersion.lastUpdated) && (
                <>
                  {" · "}
                  {[mvtVersion.appVersion && `App ${mvtVersion.appVersion}`, mvtVersion.lastUpdated && `Updated ${mvtVersion.lastUpdated}`]
                    .filter(Boolean)
                    .join(" · ")}
                </>
              )}
            </p>
            <DashboardQuickLinks />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-medium">Welcome {username}</p>
          <p className="text-sm text-muted-foreground">
            {formatDashboardDate(new Date())}
          </p>
        </div>
      </div>

      {/* Metric cards: 2 rows of 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
        <EventsMetricCard
          total={eventsCount}
          byType={eventsByType.byType}
          recurringCount={eventsByType.recurringCount}
          publicCount={eventsByType.publicCount}
          privateCount={eventsByType.privateCount}
        />
        <OrdersMetricCard metrics={orderMetrics} />
        <ContentMetricCard count={contentCount} totalChars={contentTotalChars} />
        <MediaMetricCard count={mediaCount} totalSizeBytes={mediaTotalBytes} />
      </div>

      {/* Tabs: Message Center, then RAG */}
      <DashboardTabsClient
        messageCenterItems={messageCenterItems}
        messageCenterUnread={messageCenterUnread}
        ragStats={ragStats}
        ragUrls={ragUrls}
      />
    </div>
  );
}
