import Link from "next/link";
import { DashboardActivityStream } from "@/components/dashboard/DashboardActivityStream";
import { MessageCenterBroadcastPanel } from "@/components/message-center/MessageCenterBroadcastPanel";
import { getAdminMessageCenterStream } from "@/lib/message-center/admin-stream";
import { countUnreadThreadsForUser } from "@/lib/supabase/conversation-threads";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMags } from "@/lib/supabase/crm";

export default async function DashboardMessageCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const contactIdRaw = sp?.contact_id;
  const contactId = Array.isArray(contactIdRaw) ? contactIdRaw[0] : contactIdRaw;
  const contactFilterId = contactId?.trim() || null;
  const currentUser = await getCurrentUser();
  let items: Awaited<ReturnType<typeof getAdminMessageCenterStream>> = [];
  let unreadCount = 0;
  try {
    const [streamRes, unreadRes] = await Promise.all([
      getAdminMessageCenterStream(90, "all", {
        forUserId: currentUser?.id ?? null,
        contactId: contactFilterId,
      }),
      currentUser?.id
        ? countUnreadThreadsForUser(currentUser.id).catch(() => 0)
        : Promise.resolve(0),
    ]);
    items = streamRes;
    unreadCount = unreadRes;
  } catch {
    // Stream optional
  }

  let broadcastMags: { id: string; name: string; uid: string }[] = [];
  try {
    const magsRes = await getMags(true);
    broadcastMags = magsRes.map((m) => ({ id: m.id, name: m.name, uid: m.uid }));
  } catch {
    // MAG list optional for broadcast UI
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="text-sm text-muted-foreground">
        <Link href="/admin/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <span className="text-foreground">Message Center</span>
      </div>
      <div>
        <h1 className="text-3xl font-bold">Message Center</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {contactFilterId
            ? "Contact-filtered stream. Threads, DMs, and alerts for this contact."
            : "Threads, DMs, and alerts in one feed."}
          {unreadCount > 0 ? (
            <>
              {" "}
              <span className="text-foreground font-medium">{unreadCount}</span> unread conversation
              {unreadCount === 1 ? "" : "s"}.
            </>
          ) : null}
        </p>
        {contactFilterId ? (
          <div className="mt-2 flex gap-3 text-xs">
            <Link href="/admin/dashboard/message-center" className="text-muted-foreground hover:text-foreground hover:underline">
              Clear contact filter
            </Link>
            <Link href={`/admin/crm/contacts/${contactFilterId}`} className="text-muted-foreground hover:text-foreground hover:underline">
              Back to contact
            </Link>
          </div>
        ) : null}
      </div>
      {!contactFilterId ? <MessageCenterBroadcastPanel mags={broadcastMags} /> : null}
      <DashboardActivityStream initialItems={items} layout="full" contactId={contactFilterId} />
    </div>
  );
}
