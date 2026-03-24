"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AutoSuggestMulti } from "@/components/ui/auto-suggest-multi";
import { TaxonomyMultiSelect, type TaxonomyMultiSelectOption } from "@/components/media/TaxonomyMultiSelect";
import { ProjectEventLinkCombobox } from "@/components/events/ProjectEventLinkCombobox";
import {
  parseCalendarResourceTypesPayload,
  resourceTypeLabelMap,
} from "@/lib/events/resource-picker-groups";

export interface EventsFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  eventTypeOptions?: { slug: string; label: string }[];
  selectedEventType?: string | null;
  onSelectedEventTypeChange?: (value: string | null) => void;
  selectedProjectId?: string | null;
  onSelectedProjectIdChange?: (projectId: string | null) => void;
  filterCategories?: TaxonomyMultiSelectOption[];
  filterTags?: TaxonomyMultiSelectOption[];
  filterMemberships?: { id: string; name: string }[];
  selectedCategoryIds?: Set<string>;
  selectedTagIds?: Set<string>;
  selectedMembershipIds?: Set<string>;
  filterParticipantIds?: Set<string>;
  filterResourceIds?: Set<string>;
  onFilterParticipantsResourcesApply?: (participantIds: Set<string>, resourceIds: Set<string>) => void;
  onCategoryToggle?: (id: string, checked: boolean) => void;
  onTagToggle?: (id: string, checked: boolean) => void;
  onMembershipToggle?: (id: string, checked: boolean) => void;
  showParticipantsModal?: boolean;
  onShowParticipantsModalChange?: (open: boolean) => void;
}

interface ParticipantOption {
  id: string;
  source_type: string;
  source_id: string;
  display_name: string | null;
}
interface ResourceOption {
  id: string;
  name: string;
  resource_type: string;
}
/** Unified directory row from GET /api/directory (labels for participant picker). */
interface DirectoryRow {
  source_type: string;
  source_id: string;
  display_label: string;
  subtitle?: string;
}

function directoryLabelKey(sourceType: string, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

export function EventsFilterBar({
  search,
  onSearchChange,
  eventTypeOptions = [],
  selectedEventType = null,
  onSelectedEventTypeChange,
  selectedProjectId = null,
  onSelectedProjectIdChange,
  filterCategories = [],
  filterTags = [],
  filterMemberships = [],
  selectedCategoryIds = new Set(),
  selectedTagIds = new Set(),
  selectedMembershipIds = new Set(),
  filterParticipantIds = new Set(),
  filterResourceIds = new Set(),
  onFilterParticipantsResourcesApply,
  onCategoryToggle,
  onTagToggle,
  onMembershipToggle,
  showParticipantsModal = false,
  onShowParticipantsModalChange,
}: EventsFilterBarProps) {
  const [modalParticipantIds, setModalParticipantIds] = useState<Set<string>>(new Set());
  const [modalResourceIds, setModalResourceIds] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [resourceTypeLabels, setResourceTypeLabels] = useState<Map<string, string>>(() => new Map());
  const [directoryRows, setDirectoryRows] = useState<DirectoryRow[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (showParticipantsModal) {
      setModalParticipantIds(new Set(filterParticipantIds));
      setModalResourceIds(new Set(filterResourceIds));
      setModalLoading(true);
      Promise.all([
        fetch("/api/events/participants").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/events/resources?context=calendar").then((r) =>
          r.ok ? r.json() : { data: [] }
        ),
        fetch("/api/settings/calendar/resource-types").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/directory?limit=5000")
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .catch(() => ({ data: [] })),
      ])
        .then(([pData, rData, typesRes, dirRes]) => {
          setParticipants((pData?.data ?? []) as ParticipantOption[]);
          setResources((rData?.data ?? []) as ResourceOption[]);
          setResourceTypeLabels(resourceTypeLabelMap(parseCalendarResourceTypesPayload(typesRes)));
          const rows = Array.isArray(dirRes?.data) ? dirRes.data : [];
          setDirectoryRows(rows as DirectoryRow[]);
        })
        .finally(() => setModalLoading(false));
    }
  }, [showParticipantsModal, filterParticipantIds, filterResourceIds]);

  const labelBySource = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of directoryRows) {
      if (
        (row.source_type === "team_member" || row.source_type === "crm_contact") &&
        typeof row.source_id === "string"
      ) {
        const key = directoryLabelKey(row.source_type, row.source_id);
        const raw = row.display_label?.trim();
        m.set(
          key,
          raw ||
            (row.source_type === "team_member" ? "Team member" : "Contact")
        );
      }
    }
    return m;
  }, [directoryRows]);

  const teamParticipantOptions = useMemo(() => {
    return participants
      .filter((p) => p.source_type === "team_member")
      .map((p) => {
        const label =
          labelBySource.get(directoryLabelKey(p.source_type, p.source_id)) ??
          p.display_name?.trim() ??
          "Team member";
        return { id: p.id, label };
      });
  }, [participants, labelBySource]);

  const crmParticipantOptions = useMemo(() => {
    return participants
      .filter((p) => p.source_type === "crm_contact")
      .map((p) => {
        const label =
          labelBySource.get(directoryLabelKey(p.source_type, p.source_id)) ??
          p.display_name?.trim() ??
          "Contact";
        return { id: p.id, label };
      });
  }, [participants, labelBySource]);

  const resourceOptions = useMemo(
    () =>
      resources.map((r) => {
        const typeLabel = resourceTypeLabels.get(r.resource_type)?.trim() || r.resource_type;
        return {
          id: r.id,
          label: `${r.name} (${typeLabel})`,
          searchText: `${r.name} ${r.resource_type} ${typeLabel}`,
        };
      }),
    [resources, resourceTypeLabels]
  );

  const magOptions: TaxonomyMultiSelectOption[] = filterMemberships.map((m) => ({
    id: m.id,
    name: m.name,
  }));

  return (
    <div className="space-y-3">
      {/* Row 1: Search | Event Type | Project */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 min-w-0"
          aria-label="Search events"
        />

        <Select
          value={selectedEventType ?? "all"}
          onValueChange={(value) => onSelectedEventTypeChange?.(value === "all" ? null : value)}
        >
          <SelectTrigger className="h-9 min-w-0" aria-label="Filter by event type">
            <SelectValue placeholder="All event types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All event types</SelectItem>
            {eventTypeOptions.map((opt) => (
              <SelectItem key={opt.slug} value={opt.slug}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ProjectEventLinkCombobox
          value={selectedProjectId}
          onValueChange={(projectId) => onSelectedProjectIdChange?.(projectId)}
          className="min-w-0"
        />
      </div>

      {/* Row 2: Equal-width filter fields aligned with row 1 */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="min-w-0">
          {filterCategories.length > 0 && onCategoryToggle && (
            <TaxonomyMultiSelect
              label="Categories"
              options={filterCategories}
              selectedIds={selectedCategoryIds}
              onToggle={onCategoryToggle}
              placeholder="All categories"
              className="w-full"
            />
          )}
        </div>
        <div className="min-w-0">
          {onTagToggle && (
            <TaxonomyMultiSelect
              label="Tags"
              options={filterTags}
              selectedIds={selectedTagIds}
              onToggle={onTagToggle}
              placeholder="All tags"
              className="w-full"
            />
          )}
        </div>
        <div className="min-w-0">
          {filterMemberships.length > 0 && onMembershipToggle && (
            <TaxonomyMultiSelect
              label="Memberships"
              options={magOptions}
              selectedIds={selectedMembershipIds}
              onToggle={onMembershipToggle}
              placeholder="All memberships"
              className="w-full"
            />
          )}
        </div>
        <div className="min-w-0">
          {onShowParticipantsModalChange != null && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full"
              onClick={() => onShowParticipantsModalChange(true)}
              title="Filter by participants and resources"
            >
              <Users className="h-4 w-4 mr-1" />
              Participants and Resources
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showParticipantsModal} onOpenChange={onShowParticipantsModalChange}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] min-h-[32rem] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Filter by participants and resources</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[22rem] overflow-auto space-y-5 py-2">
            {modalLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participants
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <AutoSuggestMulti
                      label="Team Members"
                      options={teamParticipantOptions}
                      selectedIds={modalParticipantIds}
                      onSelectionChange={setModalParticipantIds}
                      placeholder="Type to search team..."
                      dropdownClassName="max-h-40"
                    />
                    <AutoSuggestMulti
                      label="CRM Contacts"
                      options={crmParticipantOptions}
                      selectedIds={modalParticipantIds}
                      onSelectionChange={setModalParticipantIds}
                      placeholder="Type to search contacts..."
                      dropdownClassName="max-h-40"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    Resources
                  </p>
                  <AutoSuggestMulti
                    options={resourceOptions}
                    selectedIds={modalResourceIds}
                    onSelectionChange={setModalResourceIds}
                    placeholder="Type to search resources..."
                    dropdownClassName="max-h-40"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onShowParticipantsModalChange?.(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                onFilterParticipantsResourcesApply?.(modalParticipantIds, modalResourceIds);
                onShowParticipantsModalChange?.(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
