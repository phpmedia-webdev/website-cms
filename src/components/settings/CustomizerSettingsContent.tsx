"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrmSettingsClient } from "@/app/admin/settings/crm/CrmSettingsClient";
import { CalendarSettingsClient } from "@/app/admin/settings/customizer/CalendarSettingsClient";
import { ContentTypesBoard } from "@/components/settings/ContentTypesBoard";
import { ContentFieldsBoard } from "@/components/settings/ContentFieldsBoard";
import type { CrmContactStatusOption, CalendarResourceTypeOption } from "@/lib/supabase/settings";

const TAB_CRM = "crm";
const TAB_CONTENT = "content";
const TAB_CALENDAR = "calendar";

const VALID_TABS = [TAB_CRM, TAB_CONTENT, TAB_CALENDAR] as const;

interface CustomizerSettingsContentProps {
  initialNoteTypes: string[];
  initialContactStatuses: CrmContactStatusOption[];
  initialResourceTypes: CalendarResourceTypeOption[];
}

export function CustomizerSettingsContent({
  initialNoteTypes,
  initialContactStatuses,
  initialResourceTypes,
}: CustomizerSettingsContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get("tab");
  const initialTab = VALID_TABS.includes(tabParam as (typeof VALID_TABS)[number])
    ? tabParam
    : TAB_CRM;

  const [activeTab, setActiveTab] = useState(initialTab ?? TAB_CRM);

  useEffect(() => {
    const next = VALID_TABS.includes(tabParam as (typeof VALID_TABS)[number])
      ? tabParam
      : TAB_CRM;
    setActiveTab(next ?? TAB_CRM);
  }, [tabParam]);

  const setTab = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const description =
    activeTab === TAB_CRM
      ? "Contact statuses and note types for the CRM."
      : activeTab === TAB_CALENDAR
        ? "Calendar resource types for events (e.g., Room, Equipment, Video)."
        : "Content types and custom fields for content.";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Tabs value={activeTab} onValueChange={setTab} className="w-full sm:w-auto">
          <TabsList className="h-11 w-full sm:w-auto">
            <TabsTrigger value={TAB_CRM} className="flex-1 sm:flex-initial">
              CRM
            </TabsTrigger>
            <TabsTrigger value={TAB_CONTENT} className="flex-1 sm:flex-initial">
              Content
            </TabsTrigger>
            <TabsTrigger value={TAB_CALENDAR} className="flex-1 sm:flex-initial">
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>

      {activeTab === TAB_CRM && (
        <CrmSettingsClient
          initialNoteTypes={initialNoteTypes}
          initialContactStatuses={initialContactStatuses}
        />
      )}
      {activeTab === TAB_CONTENT && (
        <div className="space-y-6">
          <ContentTypesBoard />
          <ContentFieldsBoard />
        </div>
      )}
      {activeTab === TAB_CALENDAR && (
        <CalendarSettingsClient initialResourceTypes={initialResourceTypes} />
      )}
    </div>
  );
}
