"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ResourceAdmin, ResourceBundleWithItems } from "@/lib/supabase/participants-resources";
import type { CalendarResourceTypeOption } from "@/lib/supabase/settings";
import { ResourcesRegistryTab } from "./ResourcesRegistryTab";
import { BundlesTab } from "./BundlesTab";
import { ResourceUsageAnalyticsTab } from "./ResourceUsageAnalyticsTab";

interface ResourceManagerClientProps {
  initialResources: ResourceAdmin[];
  initialResourceTypes?: CalendarResourceTypeOption[];
  initialBundles: ResourceBundleWithItems[];
}

/**
 * Admin hub: registry, bundles, and usage analytics (dynamic estimates).
 */
export function ResourceManagerClient({
  initialResources,
  initialResourceTypes = [],
  initialBundles,
}: ResourceManagerClientProps) {
  const [resources, setResources] = useState<ResourceAdmin[]>(initialResources);

  useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);

  return (
    <Tabs defaultValue="registry" className="w-full">
      <TabsList className="mb-4 grid w-full max-w-2xl grid-cols-3">
        <TabsTrigger value="registry">Resources</TabsTrigger>
        <TabsTrigger value="bundles">Bundles</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="registry" className="mt-0">
        <ResourcesRegistryTab
          resources={resources}
          setResources={setResources}
          initialResourceTypes={initialResourceTypes}
        />
      </TabsContent>
      <TabsContent value="bundles" className="mt-0">
        <BundlesTab initialBundles={initialBundles} resources={resources} />
      </TabsContent>
      <TabsContent value="analytics" className="mt-0">
        <ResourceUsageAnalyticsTab
          resources={resources}
          initialResourceTypes={initialResourceTypes}
        />
      </TabsContent>
    </Tabs>
  );
}

/** @deprecated Use ResourceManagerClient — alias kept for existing imports. */
export const ResourcesListClient = ResourceManagerClient;
