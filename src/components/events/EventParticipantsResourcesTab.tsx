"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutoSuggestMulti, type AutoSuggestOption } from "@/components/ui/auto-suggest-multi";
import {
  DirectoryParticipantPicker,
  ADMIN_PICKER_DROPDOWN_CLASS,
  ADMIN_PICKER_FIELD_CLASS,
  toDirectoryParticipantCompositeId,
  parseDirectoryParticipantCompositeId,
} from "@/components/pickers";

export type PendingParticipant = { source_type: "crm_contact" | "team_member"; source_id: string };

interface Participant {
  id: string;
  source_type: string;
  source_id: string;
  display_name: string | null;
}

interface Resource {
  id: string;
  name: string;
  resource_type: string;
}

export type ParticipantsSnapshotItem = { source_type: string; source_id: string };

interface EventParticipantsResourcesTabProps {
  /** Omit for new-event (create) mode: use pending state and callbacks only. */
  eventId?: string | null;
  /** Create mode: selected participants (applied on event submit). */
  pendingParticipants?: PendingParticipant[];
  /** Create mode: called when user adds/removes pending participants. */
  onPendingParticipantsChange?: (list: PendingParticipant[]) => void;
  /** Create mode: selected resource ids (applied on event submit). */
  pendingResourceIds?: string[];
  /** Create mode: called when user adds/removes pending resources. */
  onPendingResourceIdsChange?: (ids: string[]) => void;
  /** Called when the list of participants (to be saved) changes. Used for conflict check. */
  onParticipantsSnapshot?: (list: ParticipantsSnapshotItem[]) => void;
}

export function EventParticipantsResourcesTab({
  eventId,
  pendingParticipants = [],
  onPendingParticipantsChange,
  pendingResourceIds = [],
  onPendingResourceIdsChange,
  onParticipantsSnapshot,
}: EventParticipantsResourcesTabProps) {
  const isCreateMode = !eventId;

  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [resourceIds, setResourceIds] = useState<string[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  /** Unified directory rows from GET /api/directory (contacts + team). */
  const [directoryRows, setDirectoryRows] = useState<
    { source_type: string; source_id: string; display_label: string; subtitle: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const loadAssignments = useCallback(() => {
    if (!eventId) return;
    Promise.all([
      fetch(`/api/events/${eventId}/participants`).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch(`/api/events/${eventId}/resources`).then((r) => (r.ok ? r.json() : { data: [] })),
    ]).then(([pRes, rRes]) => {
      setParticipantIds(pRes.data ?? []);
      setResourceIds(rRes.data ?? []);
    });
  }, [eventId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      isCreateMode ? Promise.resolve({ data: [] }) : fetch("/api/events/participants").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/events/resources").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/directory?limit=5000")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .catch(() => ({ data: [] })),
    ])
      .then(([pData, rData, dirRes]) => {
        if (!isCreateMode) setParticipants((pData?.data ?? []) as Participant[]);
        const rawResources = rData && typeof rData === "object" && Array.isArray(rData.data) ? rData.data : Array.isArray(rData) ? rData : [];
        setResources((rawResources ?? []) as Resource[]);
        const rows = Array.isArray(dirRes?.data) ? dirRes.data : [];
        setDirectoryRows(rows);
      })
      .finally(() => setLoading(false));
  }, [isCreateMode]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

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
        if (r.ok) loadAssignments();
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
        if (r.ok) loadAssignments();
      })
      .finally(() => setAssigning(false));
  };

  const resourceOptions: AutoSuggestOption[] = resources.map((r) => ({
    id: r.id,
    label: `${r.name} (${r.resource_type})`,
  }));

  const selectedResourceIds = isCreateMode
    ? new Set(pendingResourceIds)
    : new Set(resourceIds);

  const addResourceById = (resourceId: string) => {
    if (!resourceId || !eventId) return;
    setAssigning(true);
    fetch(`/api/events/${eventId}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource_id: resourceId }),
    })
      .then((r) => {
        if (r.ok) loadAssignments();
      })
      .finally(() => setAssigning(false));
  };

  const removeResourceById = (resourceId: string) => {
    if (isCreateMode && onPendingResourceIdsChange) {
      onPendingResourceIdsChange(pendingResourceIds.filter((id) => id !== resourceId));
      return;
    }
    if (!eventId) return;
    setAssigning(true);
    fetch(`/api/events/${eventId}/resources`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource_id: resourceId }),
    })
      .then((r) => {
        if (r.ok) loadAssignments();
      })
      .finally(() => setAssigning(false));
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6 pt-4">
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

      <div className="space-y-2">
        <Label className="text-sm">Resources</Label>
        {isCreateMode && (
          <p className="text-xs text-muted-foreground">
            Selections will be applied when you save the event.
          </p>
        )}
        {resourceOptions.length > 0 ? (
          <AutoSuggestMulti
            options={resourceOptions}
            selectedIds={selectedResourceIds}
            onSelectionChange={(nextIds) => {
              if (isCreateMode && onPendingResourceIdsChange) {
                onPendingResourceIdsChange([...nextIds]);
              } else if (eventId) {
                const prev = selectedResourceIds;
                const added = [...nextIds].find((id) => !prev.has(id));
                const removed = [...prev].find((id) => !nextIds.has(id));
                if (added) addResourceById(added);
                if (removed) removeResourceById(removed);
              }
            }}
            placeholder="Type to search resources…"
            label={undefined}
            className={ADMIN_PICKER_FIELD_CLASS}
            dropdownClassName={ADMIN_PICKER_DROPDOWN_CLASS}
          />
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              No resources in the list yet. Add rooms, equipment, or video resources; they will then appear here for this event and apply when you save.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/events/resources">Add resources (Calendar → Resources)</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
