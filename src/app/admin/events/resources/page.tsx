import Link from "next/link";
import { getResources } from "@/lib/supabase/participants-resources";
import { getCalendarResourceTypes } from "@/lib/supabase/settings";
import { ResourcesListClient } from "@/components/events/ResourcesListClient";
import { ArrowLeft } from "lucide-react";

/**
 * Calendar → Resources: list and manage bookable resources (rooms, equipment, video).
 */
export default async function EventsResourcesPage() {
  const [resources, resourceTypes] = await Promise.all([
    getResources().catch(() => []),
    getCalendarResourceTypes(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/events"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calendar
        </Link>
      </div>
      <div>
        <h1 className="text-3xl font-bold">Resources</h1>
        <p className="text-muted-foreground mt-2">
          Manage rooms, equipment, and video resources for calendar events
        </p>
      </div>
      <ResourcesListClient
        initialResources={resources}
        initialResourceTypes={resourceTypes}
      />
    </div>
  );
}
