"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AutoSuggestMulti, type AutoSuggestGroup } from "@/components/ui/auto-suggest-multi";
import { ResourceAssignmentsRollupList } from "@/components/events/ResourceAssignmentsRollupList";
import {
  buildResourceAutoSuggestGroups,
  parseCalendarResourceTypesPayload,
  resourceTypeLabelMap,
} from "@/lib/events/resource-picker-groups";
import {
  ADMIN_PICKER_DROPDOWN_CLASS,
  ADMIN_PICKER_FIELD_CLASS,
} from "@/components/pickers";
import {
  fetchTaskResources,
  replaceTaskResourceAssignments,
  type TaskResourceAssignmentDto,
  type TaskResourceAssignmentDraft,
} from "@/lib/tasks/task-resources-api";
import { cn } from "@/lib/utils";

interface TaskResourcesSectionPropsBase {
  taskId: string;
  projectId?: string;
}

interface TaskResourcesReadOnly extends TaskResourcesSectionPropsBase {
  canManage?: false;
}

interface TaskResourcesEditable extends TaskResourcesSectionPropsBase {
  canManage: true;
  pendingResourceAssignments: TaskResourceAssignmentDraft[];
  onPendingResourceAssignmentsChange: (rows: TaskResourceAssignmentDraft[]) => void;
}

export type TaskResourcesSectionProps = TaskResourcesReadOnly | TaskResourcesEditable;

interface RegistryResource {
  id: string;
  name: string;
  resource_type: string;
  is_schedulable_calendar?: boolean;
  is_schedulable_tasks?: boolean;
  archived_at?: string | null;
}

interface BundleListItem {
  id: string;
  name: string;
  items: { resource_id: string }[];
}

function parseResourceListPayload(res: unknown): RegistryResource[] {
  if (res && typeof res === "object" && Array.isArray((res as { data?: unknown }).data)) {
    return ((res as { data: RegistryResource[] }).data ?? []) as RegistryResource[];
  }
  if (Array.isArray(res)) return res as RegistryResource[];
  return [];
}

/**
 * Loads full registry (for assignment row labels) + `?context=task` lists for picker/bundles
 * (server: migration **183** + archive/retired; task union = calendar-on OR task-on).
 */
function useResourceCatalog() {
  const [registryAll, setRegistryAll] = useState<RegistryResource[]>([]);
  const [pickerResources, setPickerResources] = useState<RegistryResource[]>([]);
  const [bundles, setBundles] = useState<BundleListItem[]>([]);
  const [resourceTypeLabels, setResourceTypeLabels] = useState<Map<string, string>>(() => new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/events/resources").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/events/resources?context=task").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/events/bundles?context=task").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/settings/calendar/resource-types").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([fullRes, pickRes, bData, typesRes]) => {
        setRegistryAll(parseResourceListPayload(fullRes));
        setPickerResources(parseResourceListPayload(pickRes));
        const blist = Array.isArray((bData as { data?: unknown })?.data)
          ? (bData as { data: BundleListItem[] }).data
          : [];
        setBundles(
          blist.map((b: BundleListItem) => ({
            id: b.id,
            name: b.name,
            items: Array.isArray(b.items) ? b.items : [],
          }))
        );
        setResourceTypeLabels(resourceTypeLabelMap(parseCalendarResourceTypesPayload(typesRes)));
      })
      .finally(() => setLoading(false));
  }, []);

  const registryById = useMemo(
    () => new Map(registryAll.map((r) => [r.id, r])),
    [registryAll]
  );
  const resourceById = useMemo(
    () => new Map(pickerResources.map((r) => [r.id, r])),
    [pickerResources]
  );

  const bundleMemberIds = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const b of bundles) {
      m.set(
        b.id,
        b.items.map((i) => i.resource_id).filter(Boolean)
      );
    }
    return m;
  }, [bundles]);

  const bundleNamesByDefinitionId = useMemo(
    () => new Map(bundles.map((b) => [b.id, b.name])),
    [bundles]
  );

  const resourcePickerGroups: AutoSuggestGroup[] = useMemo(
    () =>
      buildResourceAutoSuggestGroups(bundles, pickerResources, resourceTypeLabels, {
        bundles: "No bundles defined.",
        resources: "No resources for tasks.",
      }),
    [bundles, pickerResources, resourceTypeLabels]
  );

  const catalogReady = pickerResources.length > 0 || bundles.length > 0;

  return {
    loading,
    catalogReady,
    pickable: pickerResources,
    resourceById,
    registryById,
    bundleMemberIds,
    bundleNamesByDefinitionId,
    resourcePickerGroups,
  };
}

function ResourceAssignmentsPickerBody({
  assignments,
  onAssignmentsChange,
  resourcePickerGroups,
  resourceById,
  bundleMemberIds,
  bundleNamesByDefinitionId,
}: {
  assignments: TaskResourceAssignmentDraft[];
  onAssignmentsChange: (rows: TaskResourceAssignmentDraft[]) => void;
  resourcePickerGroups: AutoSuggestGroup[];
  resourceById: Map<string, RegistryResource>;
  bundleMemberIds: Map<string, string[]>;
  bundleNamesByDefinitionId: Map<string, string>;
}) {
  const selectedResourceCompositeIds = useMemo(
    () => new Set(assignments.map((a) => `resource:${a.resource_id}`)),
    [assignments]
  );

  const applyResourceSelectionChange = (next: Set<string>) => {
    const prev = selectedResourceCompositeIds;
    const added = [...next].filter((id) => !prev.has(id));
    const removed = [...prev].filter((id) => !next.has(id));

    let draft = [...assignments];

    for (const id of removed) {
      if (!id.startsWith("resource:")) continue;
      const rid = id.slice("resource:".length);
      draft = draft.filter((r) => r.resource_id !== rid);
    }

    for (const id of added) {
      if (id.startsWith("bundle:")) {
        const bundleId = id.slice("bundle:".length);
        const members = bundleMemberIds.get(bundleId) ?? [];
        const instance =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        for (const rid of members) {
          if (!resourceById.has(rid)) continue;
          if (draft.some((r) => r.resource_id === rid)) continue;
          draft.push({ resource_id: rid, bundle_instance_id: instance });
        }
      } else if (id.startsWith("resource:")) {
        const rid = id.slice("resource:".length);
        if (!resourceById.has(rid)) continue;
        if (!draft.some((r) => r.resource_id === rid)) {
          draft.push({ resource_id: rid, bundle_instance_id: null });
        }
      }
    }

    onAssignmentsChange(draft);
  };

  const removeBundleGroup = (bundleInstanceId: string) => {
    onAssignmentsChange(assignments.filter((r) => r.bundle_instance_id !== bundleInstanceId));
  };

  const removeSingleResource = (resourceId: string) => {
    onAssignmentsChange(assignments.filter((r) => r.resource_id !== resourceId));
  };

  const resourceLabelFn = useCallback(
    (id: string) => resourceById.get(id)?.name?.trim() || "Unknown resource",
    [resourceById]
  );

  return (
    <div className="relative z-0 space-y-3">
      {assignments.length > 0 ? (
        <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Assigned</p>
          <ResourceAssignmentsRollupList
            assignments={assignments}
            resourceLabel={resourceLabelFn}
            bundleNamesByDefinitionId={bundleNamesByDefinitionId}
            onRemoveResource={removeSingleResource}
            onRemoveBundleInstance={removeBundleGroup}
            emptyMessage="No resources assigned."
          />
        </div>
      ) : null}
      <AutoSuggestMulti
        groups={resourcePickerGroups}
        selectedIds={selectedResourceCompositeIds}
        onSelectionChange={applyResourceSelectionChange}
        placeholder="Search bundles or resources…"
        label={undefined}
        className={ADMIN_PICKER_FIELD_CLASS}
        dropdownClassName={cn(
          ADMIN_PICKER_DROPDOWN_CLASS,
          "z-[110] max-h-[min(24rem,55vh)] shadow-lg"
        )}
      />
    </div>
  );
}

function CenteredEditControl({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="-mt-0.5 text-center">
      <button
        type="button"
        disabled={disabled}
        className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
        onClick={onClick}
      >
        Edit
      </button>
    </div>
  );
}

/** Detail view: server-backed list; modal commits with PUT on Done. */
function TaskResourcesDetailSection({ taskId }: { taskId: string }) {
  const catalog = useResourceCatalog();
  const [rows, setRows] = useState<TaskResourceAssignmentDto[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState<TaskResourceAssignmentDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const loadRows = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const data = await fetchTaskResources(taskId);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const rowsAsDraft = useMemo(
    () =>
      rows.map((r) => ({
        resource_id: r.resource_id,
        bundle_instance_id: r.bundle_instance_id,
      })),
    [rows]
  );

  const openModify = () => {
    setModalDraft(rowsAsDraft.map((r) => ({ ...r })));
    setModifyOpen(true);
  };

  const handleDetailDone = async () => {
    setSaving(true);
    setError(null);
    try {
      await replaceTaskResourceAssignments(taskId, modalDraft);
      await loadRows();
      setModifyOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save resources");
    } finally {
      setSaving(false);
    }
  };

  if (listLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <CenteredEditControl
        onClick={() => openModify()}
        disabled={catalog.loading || !catalog.catalogReady}
      />

      {error ? <p className="text-center text-[11px] text-destructive">{error}</p> : null}

      <div className="max-h-[min(13rem,36vh)] min-h-0 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
        <ResourceAssignmentsRollupList
          variant="compact"
          assignments={rows.map((r) => ({
            resource_id: r.resource_id,
            bundle_instance_id: r.bundle_instance_id,
          }))}
          resourceLabel={(id) => rows.find((r) => r.resource_id === id)?.name ?? "Unknown resource"}
          emptyMessage="—"
        />
      </div>

      {!catalog.loading && !catalog.catalogReady ? (
        <p className="text-center text-[10px] text-muted-foreground">
          <Link href="/admin/events/resources" className="underline-offset-2 hover:underline">
            Resource manager
          </Link>
        </p>
      ) : null}

      <Dialog
        open={modifyOpen}
        onOpenChange={(o) => {
          if (!o && !saving) setModifyOpen(false);
        }}
      >
        <DialogContent className="flex h-[min(90vh,52rem)] max-h-[90vh] w-full flex-col gap-3 overflow-hidden !p-4 sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>Modify resources</DialogTitle>
          </DialogHeader>
          {catalog.loading ? (
            <div className="flex min-h-[10rem] shrink-0 justify-center py-5">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <ResourceAssignmentsPickerBody
                assignments={modalDraft}
                onAssignmentsChange={setModalDraft}
                resourcePickerGroups={catalog.resourcePickerGroups}
                resourceById={catalog.resourceById}
                bundleMemberIds={catalog.bundleMemberIds}
                bundleNamesByDefinitionId={catalog.bundleNamesByDefinitionId}
              />
            </div>
          )}
          <DialogFooter className="shrink-0 border-t border-border/40 pt-3">
            <Button type="button" variant="outline" onClick={() => !saving && setModifyOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving || catalog.loading} onClick={() => void handleDetailDone()}>
              {saving ? "Saving…" : "Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Edit view: list reflects task form draft; modal edits parent state; Done only closes. */
function TaskResourcesEditSection({
  pendingResourceAssignments,
  onPendingResourceAssignmentsChange,
}: {
  pendingResourceAssignments: TaskResourceAssignmentDraft[];
  onPendingResourceAssignmentsChange: (rows: TaskResourceAssignmentDraft[]) => void;
}) {
  const catalog = useResourceCatalog();
  const [modifyOpen, setModifyOpen] = useState(false);

  const removeResource = useCallback(
    (resourceId: string) => {
      onPendingResourceAssignmentsChange(
        pendingResourceAssignments.filter((r) => r.resource_id !== resourceId)
      );
    },
    [onPendingResourceAssignmentsChange, pendingResourceAssignments]
  );

  const removeBundleInstance = useCallback(
    (instanceId: string) => {
      onPendingResourceAssignmentsChange(
        pendingResourceAssignments.filter((r) => r.bundle_instance_id !== instanceId)
      );
    },
    [onPendingResourceAssignmentsChange, pendingResourceAssignments]
  );

  const resourceLabelEdit = useCallback(
    (id: string) => catalog.registryById.get(id)?.name?.trim() || "Unknown resource",
    [catalog.registryById]
  );

  if (catalog.loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <CenteredEditControl
        onClick={() => setModifyOpen(true)}
        disabled={!catalog.catalogReady}
      />

      <div className="max-h-[min(13rem,36vh)] min-h-0 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
        <ResourceAssignmentsRollupList
          variant="compact"
          assignments={pendingResourceAssignments}
          resourceLabel={resourceLabelEdit}
          bundleNamesByDefinitionId={catalog.bundleNamesByDefinitionId}
          onRemoveResource={removeResource}
          onRemoveBundleInstance={removeBundleInstance}
          emptyMessage="—"
        />
      </div>

      {!catalog.catalogReady ? (
        <p className="text-center text-[10px] text-muted-foreground">
          <Link href="/admin/events/resources" className="underline-offset-2 hover:underline">
            Resource manager
          </Link>
        </p>
      ) : null}

      <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
        <DialogContent className="flex h-[min(90vh,52rem)] max-h-[90vh] w-full flex-col gap-3 overflow-hidden !p-4 sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>Modify resources</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <ResourceAssignmentsPickerBody
              assignments={pendingResourceAssignments}
              onAssignmentsChange={onPendingResourceAssignmentsChange}
              resourcePickerGroups={catalog.resourcePickerGroups}
              resourceById={catalog.resourceById}
              bundleMemberIds={catalog.bundleMemberIds}
              bundleNamesByDefinitionId={catalog.bundleNamesByDefinitionId}
            />
          </div>
          <DialogFooter className="shrink-0 border-t border-border/40 pt-3">
            <Button type="button" onClick={() => setModifyOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TaskResourcesSection(props: TaskResourcesSectionProps) {
  if (props.canManage) {
    const { pendingResourceAssignments, onPendingResourceAssignmentsChange } = props;
    return (
      <TaskResourcesEditSection
        pendingResourceAssignments={pendingResourceAssignments}
        onPendingResourceAssignmentsChange={onPendingResourceAssignmentsChange}
      />
    );
  }

  return <TaskResourcesDetailSection taskId={props.taskId} />;
}
