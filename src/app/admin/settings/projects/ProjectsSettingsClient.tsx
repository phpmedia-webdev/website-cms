"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { CustomizerOptionRow } from "@/components/settings/CustomizerOptionsTable";
import { CustomizerOptionsTable } from "@/components/settings/CustomizerOptionsTable";

const SUBTAB_TYPE = "project-type";
const SUBTAB_STATUS = "project-status";
const SUBTAB_ROLE = "project-role";

const SCOPE_PROJECT_TYPE = "project_type";
const SCOPE_PROJECT_STATUS = "project_status";
const SCOPE_PROJECT_ROLE = "project_role";

interface ProjectsSettingsClientProps {
  isSuperadmin?: boolean;
  initialProjectTypes: CustomizerOptionRow[];
  initialProjectStatuses: CustomizerOptionRow[];
  initialProjectRoles: CustomizerOptionRow[];
}

export function ProjectsSettingsClient({
  isSuperadmin = false,
  initialProjectTypes,
  initialProjectStatuses,
  initialProjectRoles,
}: ProjectsSettingsClientProps) {
  const [projectTypes, setProjectTypes] = useState<CustomizerOptionRow[]>(initialProjectTypes);
  const [typesSaving, setTypesSaving] = useState(false);
  const [typesSaved, setTypesSaved] = useState(false);

  const [projectStatuses, setProjectStatuses] = useState<CustomizerOptionRow[]>(initialProjectStatuses);
  const [statusesSaving, setStatusesSaving] = useState(false);
  const [statusesSaved, setStatusesSaved] = useState(false);

  const [projectRoles, setProjectRoles] = useState<CustomizerOptionRow[]>(initialProjectRoles);
  const [rolesSaving, setRolesSaving] = useState(false);
  const [rolesSaved, setRolesSaved] = useState(false);

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
      if (await saveScope(SCOPE_PROJECT_TYPE, projectTypes)) setTypesSaved(true);
    } finally {
      setTypesSaving(false);
    }
  };

  const handleSaveStatuses = async () => {
    setStatusesSaving(true);
    setStatusesSaved(false);
    try {
      if (await saveScope(SCOPE_PROJECT_STATUS, projectStatuses)) setStatusesSaved(true);
    } finally {
      setStatusesSaving(false);
    }
  };

  const handleSaveRoles = async () => {
    setRolesSaving(true);
    setRolesSaved(false);
    try {
      if (await saveScope(SCOPE_PROJECT_ROLE, projectRoles)) setRolesSaved(true);
    } finally {
      setRolesSaving(false);
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
              Project Type
            </TabsTrigger>
            <TabsTrigger
              value={SUBTAB_STATUS}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-[0_1px_0_0_hsl(var(--border))]"
            >
              Project Status
            </TabsTrigger>
            <TabsTrigger
              value={SUBTAB_ROLE}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-[0_1px_0_0_hsl(var(--border))]"
            >
              Project Role
            </TabsTrigger>
          </TabsList>
        </div>
        <CardContent className="p-0">
          <TabsContent value={SUBTAB_TYPE} className="mt-0 rounded-b-lg border-0 p-6">
            <CardDescription className="mb-4">
              Define project types (e.g., Project, Client work, Internal). Used when creating or editing projects.
            </CardDescription>
            <CustomizerOptionsTable
              scope={SCOPE_PROJECT_TYPE}
              items={projectTypes}
              onItemsChange={(next) => {
                setProjectTypes(next);
                setTypesSaved(false);
              }}
              onSave={handleSaveTypes}
              saving={typesSaving}
              saved={typesSaved}
              isSuperadmin={isSuperadmin}
              showColor={true}
              addButtonLabel="Add type"
              saveButtonLabel="Save types"
              emptyLabel="No project types defined"
              getDefaultItem={() => ({ slug: "", label: "", color: "#6b7280", is_core: false })}
              validateForSave={validateSlugLabel}
            />
          </TabsContent>
          <TabsContent value={SUBTAB_STATUS} className="mt-0 rounded-b-lg border-0 p-6">
            <CardDescription className="mb-4">
              Define project statuses (e.g., Planning, Active, On hold, Completed). Used to track project state.
            </CardDescription>
            <CustomizerOptionsTable
              scope={SCOPE_PROJECT_STATUS}
              items={projectStatuses}
              onItemsChange={(next) => {
                setProjectStatuses(next);
                setStatusesSaved(false);
              }}
              onSave={handleSaveStatuses}
              saving={statusesSaving}
              saved={statusesSaved}
              isSuperadmin={isSuperadmin}
              showColor={true}
              addButtonLabel="Add status"
              saveButtonLabel="Save statuses"
              emptyLabel="No project statuses defined"
              getDefaultItem={() => ({ slug: "", label: "", color: "#6b7280", is_core: false })}
              validateForSave={validateSlugLabel}
            />
          </TabsContent>
          <TabsContent value={SUBTAB_ROLE} className="mt-0 rounded-b-lg border-0 p-6">
            <CardDescription className="mb-4">
              Define project roles (e.g., Owner, Member, Viewer). Used when assigning members to projects.
            </CardDescription>
            <CustomizerOptionsTable
              scope={SCOPE_PROJECT_ROLE}
              items={projectRoles}
              onItemsChange={(next) => {
                setProjectRoles(next);
                setRolesSaved(false);
              }}
              onSave={handleSaveRoles}
              saving={rolesSaving}
              saved={rolesSaved}
              isSuperadmin={isSuperadmin}
              showColor={true}
              addButtonLabel="Add role"
              saveButtonLabel="Save roles"
              emptyLabel="No project roles defined"
              getDefaultItem={() => ({ slug: "", label: "", color: "#6b7280", is_core: false })}
              validateForSave={validateSlugLabel}
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
