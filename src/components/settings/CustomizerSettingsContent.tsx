"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrmSettingsClient } from "@/app/admin/settings/crm/CrmSettingsClient";
import { ProjectsSettingsClient } from "@/app/admin/settings/projects/ProjectsSettingsClient";
import { TasksSettingsClient } from "@/app/admin/settings/tasks/TasksSettingsClient";
import { ResourcesSettingsClient } from "@/app/admin/settings/resources/ResourcesSettingsClient";
import { ContentTypesBoard } from "@/components/settings/ContentTypesBoard";
import { ContentFieldsBoard } from "@/components/settings/ContentFieldsBoard";
import type { CustomizerOptionRow } from "@/components/settings/CustomizerOptionsTable";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";

const TAB_CRM = "crm";
const TAB_PROJECTS = "projects";
const TAB_TASKS = "tasks";
const TAB_CALENDAR = "calendar";
const TAB_CONTENT = "content";

const VALID_TABS = [TAB_CRM, TAB_PROJECTS, TAB_TASKS, TAB_CALENDAR, TAB_CONTENT] as const;

interface CustomizerSettingsContentProps {
  isSuperadmin?: boolean;
  initialNoteTypes: string[];
  initialContactStatuses: CrmContactStatusOption[];
  initialResourceTypes: CustomizerOptionRow[];
  initialProjectTypes?: CustomizerOptionRow[];
  initialProjectStatuses?: CustomizerOptionRow[];
  initialProjectRoles?: CustomizerOptionRow[];
  initialTaskTypes?: CustomizerOptionRow[];
  initialTaskStatuses?: CustomizerOptionRow[];
  initialTaskPhases?: CustomizerOptionRow[];
}

export function CustomizerSettingsContent({
  isSuperadmin = false,
  initialNoteTypes,
  initialContactStatuses,
  initialResourceTypes,
  initialProjectTypes = [],
  initialProjectStatuses = [],
  initialProjectRoles = [],
  initialTaskTypes = [],
  initialTaskStatuses = [],
  initialTaskPhases = [],
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
      : activeTab === TAB_PROJECTS
        ? "Project types and statuses (admin-managed workflow options)."
        : activeTab === TAB_TASKS
          ? "Task types, statuses, and phases (admin-managed workflow options)."
          : activeTab === TAB_CALENDAR
            ? "Resource types for calendar events and tasks (e.g., Room, Equipment, Video)."
            : "Content types and custom fields for content.";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Tabs value={activeTab} onValueChange={setTab} className="w-full sm:w-auto">
          <TabsList className="h-11 w-full sm:w-auto">
            <TabsTrigger value={TAB_CRM} className="flex-1 sm:flex-initial">
              CRM
            </TabsTrigger>
            <TabsTrigger value={TAB_PROJECTS} className="flex-1 sm:flex-initial">
              Projects
            </TabsTrigger>
            <TabsTrigger value={TAB_TASKS} className="flex-1 sm:flex-initial">
              Tasks
            </TabsTrigger>
            <TabsTrigger value={TAB_CALENDAR} className="flex-1 sm:flex-initial">
              Resources
            </TabsTrigger>
            <TabsTrigger value={TAB_CONTENT} className="flex-1 sm:flex-initial">
              Content
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>

      {activeTab === TAB_CRM && (
        <CrmSettingsClient
          isSuperadmin={isSuperadmin}
          initialNoteTypes={initialNoteTypes}
          initialContactStatuses={initialContactStatuses}
        />
      )}
      {activeTab === TAB_PROJECTS && (
        <ProjectsSettingsClient
          isSuperadmin={isSuperadmin}
          initialProjectTypes={initialProjectTypes}
          initialProjectStatuses={initialProjectStatuses}
          initialProjectRoles={initialProjectRoles}
        />
      )}
      {activeTab === TAB_TASKS && (
        <TasksSettingsClient
          isSuperadmin={isSuperadmin}
          initialTaskTypes={initialTaskTypes}
          initialTaskStatuses={initialTaskStatuses}
          initialTaskPhases={initialTaskPhases}
        />
      )}
      {activeTab === TAB_CALENDAR && (
        <ResourcesSettingsClient
          isSuperadmin={isSuperadmin}
          initialResourceTypes={initialResourceTypes}
        />
      )}
      {activeTab === TAB_CONTENT && (
        <div className="space-y-6">
          <ContentTypesBoard />
          <ContentFieldsBoard />
        </div>
      )}
    </div>
  );
}
