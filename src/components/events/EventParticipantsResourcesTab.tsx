"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutoSuggestMulti, type AutoSuggestOption } from "@/components/ui/auto-suggest-multi";

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

function toCompositeId(sourceType: "team_member" | "crm_contact", sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

function parseCompositeId(
  compositeId: string
): { source_type: "team_member" | "crm_contact"; source_id: string } | null {
  if (compositeId.startsWith("team_member:"))
    return { source_type: "team_member", source_id: compositeId.slice("team_member:".length) };
  if (compositeId.startsWith("crm_contact:"))
    return { source_type: "crm_contact", source_id: compositeId.slice("crm_contact:".length) };
  return null;
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
  const [contacts, setContacts] = useState<{ id: string; full_name?: string; email?: string }[]>([]);
  const [teamUsers, setTeamUsers] = useState<
    { user_id: string; email?: string; display_name?: string }[]
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
      fetch("/api/crm/contacts").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/settings/team").then((r) => (r.ok ? r.json() : { users: [] })).then((d) => d?.users ?? []).catch(() => []),
    ])
      .then(([pData, rData, cData, tData]) => {
        if (!isCreateMode) setParticipants((pData?.data ?? []) as Participant[]);
        const rawResources = rData && typeof rData === "object" && Array.isArray(rData.data) ? rData.data : Array.isArray(rData) ? rData : [];
        setResources((rawResources ?? []) as Resource[]);
        setContacts(Array.isArray(cData) ? cData : []);
        setTeamUsers(Array.isArray(tData) ? tData : []);
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

  const contactLabel = (c: { full_name?: string; email?: string }) =>
    (c.full_name?.trim() || c.email || "Contact") as string;
  const teamLabel = (u: { display_name?: string; email?: string }) =>
    (u.display_name?.trim() || u.email || "Team member") as string;

  const participantOptions: AutoSuggestOption[] = [
    ...teamUsers.map((u) => ({
      id: toCompositeId("team_member", u.user_id),
      label: teamLabel(u),
    })),
    ...contacts.map((c) => ({
      id: toCompositeId("crm_contact", c.id),
      label: contactLabel(c),
    })),
  ];

  const assignedCompositeIds = isCreateMode
    ? new Set(pendingParticipants.map((p) => toCompositeId(p.source_type, p.source_id)))
    : new Set(
        participantIds
          .map((pid) => {
            const p = participants.find((x) => x.id === pid);
            return p ? toCompositeId(p.source_type as "team_member" | "crm_contact", p.source_id) : null;
          })
          .filter((id): id is string => id != null)
      );

  const handleParticipantSelectionChange = (selectedIds: Set<string>) => {
    if (isCreateMode && onPendingParticipantsChange) {
      const list: PendingParticipant[] = [];
      selectedIds.forEach((id) => {
        const parsed = parseCompositeId(id);
        if (parsed) list.push(parsed);
      });
      onPendingParticipantsChange(list);
    }
  };

  const addParticipantByCompositeId = (compositeId: string) => {
    const parsed = parseCompositeId(compositeId);
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
      const parsed = parseCompositeId(compositeId);
      if (!parsed) return;
      onPendingParticipantsChange(
        pendingParticipants.filter(
          (p) => !(p.source_type === parsed.source_type && p.source_id === parsed.source_id)
        )
      );
      return;
    }
    const pid = participants.find(
      (p) => toCompositeId(p.source_type as "team_member" | "crm_contact", p.source_id) === compositeId
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
        <AutoSuggestMulti
          options={participantOptions}
          selectedIds={assignedCompositeIds}
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
          placeholder="Type to search team or contacts…"
          label={undefined}
          className="max-w-md"
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
            className="max-w-md"
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
