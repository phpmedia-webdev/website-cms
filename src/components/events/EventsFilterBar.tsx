"use client";

import { useState, useEffect, useMemo } from "react";
import { RotateCcw, Users, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AutoSuggestMulti } from "@/components/ui/auto-suggest-multi";
import { TaxonomyMultiSelect, type TaxonomyMultiSelectOption } from "@/components/media/TaxonomyMultiSelect";

export interface EventsFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterCategories?: TaxonomyMultiSelectOption[];
  filterTags?: TaxonomyMultiSelectOption[];
  filterMemberships?: { id: string; name: string }[];
  selectedCategoryIds?: Set<string>;
  selectedTagIds?: Set<string>;
  selectedMembershipIds?: Set<string>;
  filterPublic?: boolean;
  filterInternal?: boolean;
  filterParticipantIds?: Set<string>;
  filterResourceIds?: Set<string>;
  onFilterPublicChange?: (checked: boolean) => void;
  onFilterInternalChange?: (checked: boolean) => void;
  onFilterParticipantsResourcesApply?: (participantIds: Set<string>, resourceIds: Set<string>) => void;
  onCategoryToggle?: (id: string, checked: boolean) => void;
  onTagToggle?: (id: string, checked: boolean) => void;
  onMembershipToggle?: (id: string, checked: boolean) => void;
  onReset?: () => void;
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
interface TeamUser {
  user_id: string;
  email?: string;
  display_name?: string;
}
interface ContactOption {
  id: string;
  full_name?: string;
  email?: string;
}

export function EventsFilterBar({
  search,
  onSearchChange,
  filterCategories = [],
  filterTags = [],
  filterMemberships = [],
  selectedCategoryIds = new Set(),
  selectedTagIds = new Set(),
  selectedMembershipIds = new Set(),
  filterPublic = true,
  filterInternal = true,
  filterParticipantIds = new Set(),
  filterResourceIds = new Set(),
  onFilterPublicChange,
  onFilterInternalChange,
  onFilterParticipantsResourcesApply,
  onCategoryToggle,
  onTagToggle,
  onMembershipToggle,
  onReset,
  showParticipantsModal = false,
  onShowParticipantsModalChange,
}: EventsFilterBarProps) {
  const [modalParticipantIds, setModalParticipantIds] = useState<Set<string>>(new Set());
  const [modalResourceIds, setModalResourceIds] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (showParticipantsModal) {
      setModalParticipantIds(new Set(filterParticipantIds));
      setModalResourceIds(new Set(filterResourceIds));
      setModalLoading(true);
      Promise.all([
        fetch("/api/events/participants").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/events/resources").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/settings/team").then((r) => (r.ok ? r.json() : { users: [] })).then((d) => d?.users ?? []),
        fetch("/api/crm/contacts").then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([pData, rData, tData, cData]) => {
          setParticipants((pData?.data ?? []) as ParticipantOption[]);
          setResources((rData?.data ?? []) as ResourceOption[]);
          setTeamUsers(Array.isArray(tData) ? tData : []);
          setContacts(Array.isArray(cData) ? cData : []);
        })
        .finally(() => setModalLoading(false));
    }
  }, [showParticipantsModal, filterParticipantIds, filterResourceIds]);

  const teamParticipantOptions = useMemo(() => {
    return participants
      .filter((p) => p.source_type === "team_member")
      .map((p) => {
        const u = teamUsers.find((t) => t.user_id === p.source_id);
        const label = u?.display_name?.trim() || u?.email || "Team member";
        return { id: p.id, label };
      });
  }, [participants, teamUsers]);

  const crmParticipantOptions = useMemo(() => {
    return participants
      .filter((p) => p.source_type === "crm_contact")
      .map((p) => ({
        id: p.id,
        label: (p.display_name?.trim() || "Contact") as string,
      }));
  }, [participants]);

  const resourceOptions = useMemo(
    () =>
      resources.map((r) => ({
        id: r.id,
        label: `${r.name} (${r.resource_type})`,
      })),
    [resources]
  );

  const hasFilters =
    search.trim().length > 0 ||
    selectedCategoryIds.size > 0 ||
    selectedTagIds.size > 0 ||
    selectedMembershipIds.size > 0 ||
    !filterPublic ||
    !filterInternal ||
    filterParticipantIds.size > 0 ||
    filterResourceIds.size > 0;

  const magOptions: TaxonomyMultiSelectOption[] = filterMemberships.map((m) => ({
    id: m.id,
    name: m.name,
  }));

  return (
    <div className="space-y-3">
      {/* Row 1: Search | Reset (right justified) */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 flex-1 min-w-0"
          aria-label="Search events"
        />
        {onShowParticipantsModalChange != null && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => onShowParticipantsModalChange(true)}
            title="Filter by participants and resources"
          >
            <Users className="h-4 w-4 mr-1" />
            Participants and Resources
          </Button>
        )}
        {onReset && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            onClick={onReset}
            disabled={!hasFilters}
            title="Reset search and filters"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Row 2: Categories, Tags, Memberships */}
      <div className="flex flex-wrap items-center gap-2">
        {filterCategories.length > 0 && onCategoryToggle && (
          <TaxonomyMultiSelect
            label="Categories"
            options={filterCategories}
            selectedIds={selectedCategoryIds}
            onToggle={onCategoryToggle}
            placeholder="All categories"
          />
        )}
        {onTagToggle && (
          <TaxonomyMultiSelect
            label="Tags"
            options={filterTags}
            selectedIds={selectedTagIds}
            onToggle={onTagToggle}
            placeholder="All tags"
          />
        )}
        {filterMemberships.length > 0 && onMembershipToggle && (
          <TaxonomyMultiSelect
            label="Memberships"
            options={magOptions}
            selectedIds={selectedMembershipIds}
            onToggle={onMembershipToggle}
            placeholder="All memberships"
          />
        )}
        {onFilterPublicChange != null && onFilterInternalChange != null && (
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-public"
                checked={filterPublic}
                onCheckedChange={(v) => {
                  const checked = !!v;
                  if (!checked && !filterInternal) {
                    onFilterInternalChange(true);
                  }
                  onFilterPublicChange(checked);
                }}
                aria-label="Show public events"
              />
              <label htmlFor="filter-public" className="text-sm cursor-pointer select-none">
                Public
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-internal"
                checked={filterInternal}
                onCheckedChange={(v) => {
                  const checked = !!v;
                  if (!checked && !filterPublic) {
                    onFilterPublicChange(true);
                  }
                  onFilterInternalChange(checked);
                }}
                aria-label="Show internal events"
              />
              <label htmlFor="filter-internal" className="text-sm cursor-pointer select-none">
                Internal
              </label>
            </div>
          </div>
        )}
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
