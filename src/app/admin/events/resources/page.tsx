import {
  getResourcesAdmin,
  listResourceBundlesWithItems,
} from "@/lib/supabase/participants-resources";
import { getCalendarResourceTypes } from "@/lib/supabase/settings";
import { ResourceManagerClient } from "@/components/events/ResourcesListClient";

/**
 * Resource manager: registry (`resources`, migration 183 fields) + bundles (`resource_bundles` / items).
 */
export default async function EventsResourcesPage() {
  const [resources, resourceTypes, bundles] = await Promise.all([
    getResourcesAdmin().catch(() => []),
    getCalendarResourceTypes(),
    listResourceBundlesWithItems().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resource manager</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          <strong>Resources</strong> is the master registry for anything you attach to <strong>events</strong> and{" "}
          <strong>tasks</strong> (pickers on event and task forms). Define <strong>bundles</strong> here for
          one-click multi-assign. <strong>Analytics</strong> tab shows estimated minutes from event durations and
          task time logs (methodology on the tab). Inventory-style fields (costs, serials, etc.) support future
          asset management. Also under <strong>Activities</strong> in the sidebar (hover <strong>Resources</strong>{" "}
          for a short summary).
        </p>
      </div>
      <ResourceManagerClient
        initialResources={resources}
        initialResourceTypes={resourceTypes}
        initialBundles={bundles}
      />
    </div>
  );
}
