"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { CustomizerOptionRow } from "@/components/settings/CustomizerOptionsTable";
import { CustomizerOptionsTable } from "@/components/settings/CustomizerOptionsTable";
import {
  CUSTOMIZER_SCOPE_TASK_PHASE,
  CUSTOMIZER_SCOPE_TASK_STATUS,
  CUSTOMIZER_SCOPE_TASK_TYPE,
} from "@/lib/tasks/customizer-task-terms";

const SUBTAB_TYPE = "task-type";
const SUBTAB_STATUS = "task-status";
const SUBTAB_PHASE = "task-phase";

interface TasksSettingsClientProps {
  isSuperadmin?: boolean;
  initialTaskTypes: CustomizerOptionRow[];
  initialTaskStatuses: CustomizerOptionRow[];
  initialTaskPhases: CustomizerOptionRow[];
}

export function TasksSettingsClient({
  isSuperadmin = false,
  initialTaskTypes,
  initialTaskStatuses,
  initialTaskPhases,
}: TasksSettingsClientProps) {
  const [taskTypes, setTaskTypes] = useState<CustomizerOptionRow[]>(initialTaskTypes);
  const [typesSaving, setTypesSaving] = useState(false);
  const [typesSaved, setTypesSaved] = useState(false);

  const [taskStatuses, setTaskStatuses] = useState<CustomizerOptionRow[]>(initialTaskStatuses);
  const [statusesSaving, setStatusesSaving] = useState(false);
  const [statusesSaved, setStatusesSaved] = useState(false);

  const [taskPhases, setTaskPhases] = useState<CustomizerOptionRow[]>(initialTaskPhases);
  const [phasesSaving, setPhasesSaving] = useState(false);
  const [phasesSaved, setPhasesSaved] = useState(false);

  const saveScope = async (scope: string, items: CustomizerOptionRow[]) => {
    const res = await fetch("/api/settings/customizer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        items: items.map((i) => ({
          slug: i.slug.trim().toLowerCase().replace(/\s+/g, "-"),
          label: i.label.trim(),
          color: i.color ?? null,
          is_core: !!i.is_core,
        })),
      }),
    });
    return res.ok;
  };

  const handleSaveTypes = async () => {
    setTypesSaving(true);
    setTypesSaved(false);
    try {
      if (await saveScope(CUSTOMIZER_SCOPE_TASK_TYPE, taskTypes)) setTypesSaved(true);
    } finally {
      setTypesSaving(false);
    }
  };

  const handleSaveStatuses = async () => {
    setStatusesSaving(true);
    setStatusesSaved(false);
    try {
      if (await saveScope(CUSTOMIZER_SCOPE_TASK_STATUS, taskStatuses)) setStatusesSaved(true);
    } finally {
      setStatusesSaving(false);
    }
  };

  const handleSavePhases = async () => {
    setPhasesSaving(true);
    setPhasesSaved(false);
    try {
      if (await saveScope(CUSTOMIZER_SCOPE_TASK_PHASE, taskPhases)) setPhasesSaved(true);
    } finally {
      setPhasesSaving(false);
    }
  };

  const validateSlugLabel = (items: CustomizerOptionRow[]) => {
    const valid = items.every((i) => i.slug.trim() && i.label.trim());
    if (!valid) return false;
    const slugs = items.map((i) => i.slug.trim().toLowerCase().replace(/\s+/g, "-"));
    return new Set(slugs).size === slugs.length;
  };

  return (
    <Card>
      <Tabs defaultValue={SUBTAB_TYPE} className="w-full">
        <div className="border-b px-4 pt-4">
          <TabsList className="h-auto w-full justify-start rounded-none border-0 bg-transparent p-0 gap-0">
            <TabsTrigger
              value={SUBTAB_TYPE}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-[0_1px_0_0_hsl(var(--border))]"
            >
              Task Type
            </TabsTrigger>
            <TabsTrigger
              value={SUBTAB_STATUS}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-[0_1px_0_0_hsl(var(--border))]"
            >
              Task Status
            </TabsTrigger>
            <TabsTrigger
              value={SUBTAB_PHASE}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-[0_1px_0_0_hsl(var(--border))]"
            >
              Task Phase
            </TabsTrigger>
          </TabsList>
        </div>
        <CardContent className="p-0">
          <TabsContent value={SUBTAB_TYPE} className="mt-0 rounded-b-lg border-0 p-6">
            <CardDescription className="mb-4">
              Define task types (e.g., Task, Bug, Feature, Research). Used when creating or editing tasks.
            </CardDescription>
            <CustomizerOptionsTable
              scope={CUSTOMIZER_SCOPE_TASK_TYPE}
              items={taskTypes}
              onItemsChange={(next) => {
                setTaskTypes(next);
                setTypesSaved(false);
              }}
              onSave={handleSaveTypes}
              saving={typesSaving}
              saved={typesSaved}
              isSuperadmin={isSuperadmin}
              showColor={true}
              addButtonLabel="Add type"
              saveButtonLabel="Save types"
              emptyLabel="No task types defined"
              getDefaultItem={() => ({ slug: "", label: "", color: "#6b7280", is_core: false })}
              validateForSave={validateSlugLabel}
            />
          </TabsContent>
          <TabsContent value={SUBTAB_STATUS} className="mt-0 rounded-b-lg border-0 p-6">
            <CardDescription className="mb-4">
              Define task statuses (e.g., To do, In progress, Review, Done). Used to track task state.
            </CardDescription>
            <CustomizerOptionsTable
              scope={CUSTOMIZER_SCOPE_TASK_STATUS}
              items={taskStatuses}
              onItemsChange={(next) => {
                setTaskStatuses(next);
                setStatusesSaved(false);
              }}
              onSave={handleSaveStatuses}
              saving={statusesSaving}
              saved={statusesSaved}
              isSuperadmin={isSuperadmin}
              showColor={true}
              addButtonLabel="Add status"
              saveButtonLabel="Save statuses"
              emptyLabel="No task statuses defined"
              getDefaultItem={() => ({ slug: "", label: "", color: "#6b7280", is_core: false })}
              validateForSave={validateSlugLabel}
            />
          </TabsContent>
          <TabsContent value={SUBTAB_PHASE} className="mt-0 rounded-b-lg border-0 p-6">
            <CardDescription className="mb-4">
              Define task phases (e.g., Backlog, Sprint, Done). Used for workflow or board columns.
            </CardDescription>
            <CustomizerOptionsTable
              scope={CUSTOMIZER_SCOPE_TASK_PHASE}
              items={taskPhases}
              onItemsChange={(next) => {
                setTaskPhases(next);
                setPhasesSaved(false);
              }}
              onSave={handleSavePhases}
              saving={phasesSaving}
              saved={phasesSaved}
              isSuperadmin={isSuperadmin}
              showColor={true}
              addButtonLabel="Add phase"
              saveButtonLabel="Save phases"
              emptyLabel="No task phases defined"
              getDefaultItem={() => ({ slug: "", label: "", color: "#6b7280", is_core: false })}
              validateForSave={validateSlugLabel}
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
