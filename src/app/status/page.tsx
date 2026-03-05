import Link from "next/link";
import {
  getContactsCountByStatus,
  getFormSubmissionsCount,
  getDashboardActivity,
} from "@/lib/supabase/crm";
import { getEvents } from "@/lib/supabase/events";
import { getCrmContactStatuses } from "@/lib/supabase/settings";
import { getClientSchema } from "@/lib/supabase/schema";
import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import type { Event } from "@/lib/supabase/events";
import type { DashboardActivityItem } from "@/lib/supabase/crm";
import {
  LayoutDashboard,
  FileText,
  Users,
  Calendar,
  Activity,
  ExternalLink,
  Bell,
} from "lucide-react";
import { StatusPushSubscribe } from "@/components/pwa/StatusPushSubscribe";

function sinceIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function StatusPage() {
  const user = await getCurrentUser();
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? "Admin";

  let siteName: string | null = null;
  let contactsTotal = 0;
  let contactsByStatus: { status: string; count: number }[] = [];
  let formSubs7d = 0;
  let formSubsAll = 0;
  let upcomingEvents: Event[] = [];
  let activity: DashboardActivityItem[] = [];
  let statusLabels: Record<string, string> = {};

  try {
    const schema = getClientSchema();
    siteName = (await getTenantSiteBySchema(schema))?.name ?? null;

    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 14);

    const [
      contactsRes,
      statusesRes,
      subs7d,
      subsAll,
      events,
      activityRes,
    ] = await Promise.all([
      getContactsCountByStatus(),
      getCrmContactStatuses(),
      getFormSubmissionsCount(sinceIso(7)),
      getFormSubmissionsCount(),
      getEvents(now, end, schema).catch(() => [] as Event[]),
      getDashboardActivity(15),
    ]);

    contactsTotal = contactsRes.total;
    contactsByStatus = contactsRes.byStatus;
    formSubs7d = subs7d;
    formSubsAll = subsAll;
    statusLabels = Object.fromEntries(
      statusesRes.map((s) => [s.slug.toLowerCase(), s.label])
    );

    upcomingEvents = events
      .sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      )
      .slice(0, 10);
    activity = activityRes;
  } catch (e) {
    // Schema or data fetch failed; show page with zeros
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-lg font-semibold">
              {siteName ?? "Site"} Status
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted-foreground text-sm truncate max-w-[140px]">
              {displayName}
            </span>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 p-4 pb-8">
        {/* Notifications / PWA hint */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bell className="h-4 w-4 shrink-0" />
            <p>
              Push and email notifications are configured in{" "}
              <Link
                href="/admin/settings/notifications"
                className="font-medium text-foreground underline underline-offset-2"
              >
                Admin → Settings → Notifications
              </Link>
              . Add this page to your home screen for quick access.
            </p>
          </div>
          <StatusPushSubscribe />
        </section>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Contacts
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold">{contactsTotal}</p>
            {contactsByStatus.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {contactsByStatus.slice(0, 3).map(({ status, count }) => (
                  <li key={status || "(none)"} className="flex justify-between">
                    <span>
                      {status
                        ? statusLabels[status.toLowerCase()] ??
                          status.charAt(0).toUpperCase() + status.slice(1)
                        : "—"}
                    </span>
                    <span>{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Form submissions
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold">{formSubsAll}</p>
            <p className="text-xs text-muted-foreground">
              Last 7 days: {formSubs7d}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Upcoming events
              </span>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                No upcoming events in the next 14 days.
              </p>
            ) : (
              <ul className="mt-1 space-y-1">
                {upcomingEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate font-medium">{ev.title}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatDate(ev.start_date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4" />
            <h2 className="text-sm font-medium uppercase tracking-wide">
              Recent activity
            </h2>
          </div>
          {activity.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No recent activity.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {activity.slice(0, 10).map((item, i) => (
                <li
                  key={`${item.type}-${item.contactId}-${item.at}-${i}`}
                  className="flex flex-wrap items-baseline gap-x-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {formatDateTime(item.at)}
                  </span>
                  <span>
                    {item.type === "form_submission" && (
                      <>
                        <strong>{item.contactName}</strong> submitted{" "}
                        {item.formName ?? "a form"}
                      </>
                    )}
                    {item.type === "contact_added" && (
                      <>
                        <strong>{item.contactName}</strong> added
                      </>
                    )}
                    {item.type === "note" && (
                      <>
                        Note for <strong>{item.contactName}</strong>
                        {item.body ? `: ${item.body.slice(0, 60)}${item.body.length > 60 ? "…" : ""}` : ""}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/dashboard"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View full dashboard
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
