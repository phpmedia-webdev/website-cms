"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutoSuggestMulti, type AutoSuggestGroup } from "@/components/ui/auto-suggest-multi";
import {
  DirectoryParticipantPicker,
  ADMIN_PICKER_DROPDOWN_CLASS,
  ADMIN_PICKER_FIELD_CLASS,
  toDirectoryParticipantCompositeId,
  parseDirectoryParticipantCompositeId,
} from "@/components/pickers";
import {
  buildResourceAutoSuggestGroups,
  parseCalendarResourceTypesPayload,
  resourceTypeLabelMap,
} from "@/lib/events/resource-picker-groups";
import { ResourceAssignmentsRollupList } from "@/components/events/ResourceAssignmentsRollupList";
import { cn } from "@/lib/utils";

export type PendingParticipant = { source_type: "crm_contact" | "team_member"; source_id: string };

/** Draft row for event resources (applied when the event form is saved). */
export type PendingResourceAssignment = {
  resource_id: string;
  bundle_instance_id: string | null;
  /** Bundle definition id when rows came from one bundle apply; UI label only (stripped by PUT). */
  source_bundle_id?: string | null;
};

interface Participant {
  id: string;
  source_type: string;
  source_id: string;
  display_name: string | null;
}

interface RegistryResource {
  id: string;
  name: string;
  resource_type: string;
  is_schedulable_calendar?: boolean;
  archived_at?: string | null;
}

interface BundleListItem {
  id: string;
  name: string;
  items: { resource_id: string }[];
}

export type ParticipantsSnapshotItem = { source_type: string; source_id: string };

interface EventParticipantsResourcesTabProps {
  /** Omit for new-event (create) mode: use pending state and callbacks only. */
  eventId?: string | null;
  /** Create mode: selected participants (applied on event submit). */
  pendingParticipants?: PendingParticipant[];
  /** Create mode: called when user adds/removes pending participants. */
  onPendingParticipantsChange?: (list: PendingParticipant[]) => void;
  /** Draft resource rows (create + edit): applied when the event form is saved. */
  pendingResourceAssignments?: PendingResourceAssignment[];
  onPendingResourceAssignmentsChange?: (rows: PendingResourceAssignment[]) => void;
  /** Called when the list of participants (to be saved) changes. Used for conflict check. */
  onParticipantsSnapshot?: (list: ParticipantsSnapshotItem[]) => void;
  /** Split tabs: show only one block. Default shows both. */
  mode?: "participants" | "resources" | "all";
}

export function EventParticipantsResourcesTab({
  eventId,
  pendingParticipants = [],
  onPendingParticipantsChange,
  pendingResourceAssignments = [],
  onPendingResourceAssignmentsChange,
  onParticipantsSnapshot,
  mode = "all",
}: EventParticipantsResourcesTabProps) {
  const isCreateMode = !eventId;

  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [registryResources, setRegistryResources] = useState<RegistryResource[]>([]);
  const [bundles, setBundles] = useState<BundleListItem[]>([]);
  const [resourceTypeLabels, setResourceTypeLabels] = useState<Map<string, string>>(() => new Map());
  /** Unified directory rows from GET /api/directory (contacts + team). */
  const [directoryRows, setDirectoryRows] = useState<
    { source_type: string; source_id: string; display_label: string; subtitle: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const loadParticipantAssignments = useCallback(() => {
    if (!eventId) return;
    fetch(`/api/events/${eventId}/participants`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((pRes) => setParticipantIds(pRes.data ?? []));
  }, [eventId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      isCreateMode
        ? Promise.resolve({ data: [] })
        : fetch("/api/events/participants").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/events/resources?context=calendar").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/events/bundles?context=calendar").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/settings/calendar/resource-types").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/directory?limit=5000")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .catch(() => ({ data: [] })),
    ])
      .then(([pData, rData, bData, typesRes, dirRes]) => {
        if (!isCreateMode) setParticipants((pData?.data ?? []) as Participant[]);
        const rawResources =
          rData && typeof rData === "object" && Array.isArray(rData.data)
            ? rData.data
            : Array.isArray(rData)
              ? rData
              : [];
        setRegistryResources((rawResources ?? []) as RegistryResource[]);
        const blist = Array.isArray(bData?.data) ? bData.data : [];
        setBundles(
          blist.map((b: BundleListItem) => ({
            id: b.id,
            name: b.name,
            items: Array.isArray(b.items) ? b.items : [],
          }))
        );
        setResourceTypeLabels(resourceTypeLabelMap(parseCalendarResourceTypesPayload(typesRes)));
        const rows = Array.isArray(dirRes?.data) ? dirRes.data : [];
        setDirectoryRows(rows);
      })
      .finally(() => setLoading(false));
  }, [isCreateMode]);

  useEffect(() => {
    loadParticipantAssignments();
  }, [loadParticipantAssignments]);

  useEffect(() => {
    if (!onParticipantsSnapshot) return;
    if (isCreateMode) {
      onParticipantsSnapshot(pendingParticipants);
      return;
    }
    const list: ParticipantsSnapshotItem[] = participantIds
      .map((pid) => {
        const p = participants.find((x) => x.id === pid);
        return p ? { source_type: p.source_type, source_id: p.source_id } : null;
      })
      .filter((x): x is ParticipantsSnapshotItem => x != null);
    onParticipantsSnapshot(list);
  }, [isCreateMode, pendingParticipants, participantIds, participants, onParticipantsSnapshot]);

  const assignedCompositeIds = isCreateMode
    ? new Set(
        pendingParticipants.map((p) => toDirectoryParticipantCompositeId(p.source_type, p.source_id))
      )
    : new Set(
        participantIds
          .map((pid) => {
            const p = participants.find((x) => x.id === pid);
            return p
              ? toDirectoryParticipantCompositeId(
                  p.source_type as "team_member" | "crm_contact",
                  p.source_id
                )
              : null;
          })
          .filter((id): id is string => id != null)
      );

  const handleParticipantSelectionChange = (selectedIds: Set<string>) => {
    if (isCreateMode && onPendingParticipantsChange) {
      const list: PendingParticipant[] = [];
      selectedIds.forEach((id) => {
        const parsed = parseDirectoryParticipantCompositeId(id);
        if (parsed) list.push(parsed);
      });
      onPendingParticipantsChange(list);
    }
  };

  const addParticipantByCompositeId = (compositeId: string) => {
    const parsed = parseDirectoryParticipantCompositeId(compositeId);
    if (!parsed || !eventId) return;
    setAssigning(true);
    fetch(`/api/events/${eventId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_type: parsed.source_type, source_id: parsed.source_id }),
    })
      .then((r) => {
        if (r.ok) loadParticipantAssignments();
      })
      .finally(() => setAssigning(false));
  };

  const removeParticipantByCompositeId = (compositeId: string) => {
    if (isCreateMode && onPendingParticipantsChange) {
      const parsed = parseDirectoryParticipantCompositeId(compositeId);
      if (!parsed) return;
      onPendingParticipantsChange(
        pendingParticipants.filter(
          (p) => !(p.source_type === parsed.source_type && p.source_id === parsed.source_id)
        )
      );
      return;
    }
    const pid = participants.find(
      (p) =>
        toDirectoryParticipantCompositeId(
          p.source_type as "team_member" | "crm_contact",
          p.source_id
        ) === compositeId
    )?.id;
    if (!pid || !eventId) return;
    setAssigning(true);
    fetch(`/api/events/${eventId}/participants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: pid }),
    })
      .then((r) => {
        if (r.ok) loadParticipantAssignments();
      })
      .finally(() => setAssigning(false));
  };

  /** API returns `?context=calendar` — already filtered (183 + archive/retired). */
  const resourceById = useMemo(
    () => new Map(registryResources.map((r) => [r.id, r])),
    [registryResources]
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
      buildResourceAutoSuggestGroups(bundles, registryResources, resourceTypeLabels, {
        bundles: "No bundles defined (Resource manager → Bundles).",
        resources: "No schedulable resources.",
      }),
    [bundles, registryResources, resourceTypeLabels]
  );

  const selectedResourceCompositeIds = useMemo(
    () => new Set(pendingResourceAssignments.map((a) => `resource:${a.resource_id}`)),
    [pendingResourceAssignments]
  );

  const applyResourceSelectionChange = (next: Set<string>) => {
    if (!onPendingResourceAssignmentsChange) return;
    const prev = selectedResourceCompositeIds;
    const added = [...next].filter((id) => !prev.has(id));
    const removed = [...prev].filter((id) => !next.has(id));

    let draft = [...pendingResourceAssignments];

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
          draft.push({
            resource_id: rid,
            bundle_instance_id: instance,
            source_bundle_id: bundleId,
          });
        }
      } else if (id.startsWith("resource:")) {
        const rid = id.slice("resource:".length);
        if (!resourceById.has(rid)) continue;
        if (!draft.some((r) => r.resource_id === rid)) {
          draft.push({ resource_id: rid, bundle_instance_id: null });
        }
      }
    }

    onPendingResourceAssignmentsChange(draft);
  };

  const removeBundleGroup = (bundleInstanceId: string) => {
    if (!onPendingResourceAssignmentsChange) return;
    onPendingResourceAssignmentsChange(
      pendingResourceAssignments.filter((r) => r.bundle_instance_id !== bundleInstanceId)
    );
  };

  const removeSingleResourceAssignment = (resourceId: string) => {
    if (!onPendingResourceAssignmentsChange) return;
    onPendingResourceAssignmentsChange(
      pendingResourceAssignments.filter((r) => r.resource_id !== resourceId)
    );
  };

  const resourceLabelFn = useCallback(
    (id: string) => {
      const n = resourceById.get(id)?.name?.trim();
      return n || "Unknown resource";
    },
    [resourceById]
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const showParticipants = mode === "all" || mode === "participants";
  const showResources = mode === "all" || mode === "resources";

  return (
    <div className={cn("space-y-6", mode === "all" && "pt-4")}>
      {showParticipants ? (
      <div className="space-y-2">
        <Label className="text-sm">Participants</Label>
        {isCreateMode && (
          <p className="text-xs text-muted-foreground">
            Selections will be applied when you save the event.
          </p>
        )}
        <DirectoryParticipantPicker
          directoryRows={directoryRows}
          selectedCompositeIds={assignedCompositeIds}
          onSelectionChange={(nextIds) => {
            if (isCreateMode) {
              handleParticipantSelectionChange(nextIds);
            } else {
              const prev = assignedCompositeIds;
              const added = [...nextIds].find((id) => !prev.has(id));
              const removed = [...prev].find((id) => !nextIds.has(id));
              if (added) addParticipantByCompositeId(added);
              if (removed) removeParticipantByCompositeId(removed);
            }
          }}
        />
      </div>
      ) : null}

      {showResources ? (
      <div className="space-y-2">
        <Label className="text-sm">Resources</Label>
        <p className="text-xs text-muted-foreground">
          Choose bundles or individual resources. Selections are applied when you save the event (draft
          only until then).
        </p>
        {registryResources.length > 0 || bundles.length > 0 ? (
          <>
            <AutoSuggestMulti
              groups={resourcePickerGroups}
              selectedIds={selectedResourceCompositeIds}
              onSelectionChange={applyResourceSelectionChange}
              placeholder="Search bundles or resources…"
              label={undefined}
              className={ADMIN_PICKER_FIELD_CLASS}
              dropdownClassName={ADMIN_PICKER_DROPDOWN_CLASS}
            />
            {onPendingResourceAssignmentsChange && pendingResourceAssignments.length > 0 ? (
              <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-2">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Assigned</p>
                <ResourceAssignmentsRollupList
                  assignments={pendingResourceAssignments}
                  resourceLabel={resourceLabelFn}
                  bundleNamesByDefinitionId={bundleNamesByDefinitionId}
                  onRemoveResource={removeSingleResourceAssignment}
                  onRemoveBundleInstance={removeBundleGroup}
                  emptyMessage="No resources assigned."
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              No schedulable resources or bundles yet. Add registry items and bundles in Resource
              manager; they will appear here.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/events/resources">Open Resource manager</Link>
            </Button>
          </div>
        )}
      </div>
      ) : null}
    </div>
  );
}
