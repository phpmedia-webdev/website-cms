"use client";

import { Users, Box, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaxonomyMultiSelect, type TaxonomyMultiSelectOption } from "@/components/media/TaxonomyMultiSelect";
import { ProjectEventLinkCombobox } from "@/components/events/ProjectEventLinkCombobox";

export interface EventsFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  eventTypeOptions?: { slug: string; label: string }[];
  selectedEventType?: string | null;
  onSelectedEventTypeChange?: (value: string | null) => void;
  selectedProjectId?: string | null;
  onSelectedProjectIdChange?: (projectId: string | null) => void;
  filterPublic: boolean;
  filterInternal: boolean;
  onFilterPublicChange: (checked: boolean) => void;
  onFilterInternalChange: (checked: boolean) => void;
  showTasksLayer?: boolean;
  onShowTasksLayerChange?: (checked: boolean) => void;
  canReset: boolean;
  onReset: () => void;
  filterMemberships?: { id: string; name: string }[];
  selectedMembershipIds?: Set<string>;
  onMembershipToggle?: (id: string, checked: boolean) => void;
}

export function EventsFilterBar({
  search,
  onSearchChange,
  eventTypeOptions = [],
  selectedEventType = null,
  onSelectedEventTypeChange,
  selectedProjectId = null,
  onSelectedProjectIdChange,
  filterPublic,
  filterInternal,
  onFilterPublicChange,
  onFilterInternalChange,
  showTasksLayer = true,
  onShowTasksLayerChange,
  canReset,
  onReset,
  filterMemberships = [],
  selectedMembershipIds = new Set(),
  onMembershipToggle,
}: EventsFilterBarProps) {
  const magOptions: TaxonomyMultiSelectOption[] = filterMemberships.map((m) => ({
    id: m.id,
    name: m.name,
  }));

  return (
    <div className="space-y-3">
      {/* Row 1: 50% search + event type | 50% public + internal + reset (md+: 4-col grid so row 2 aligns) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-2">
          <Input
            placeholder="Search events"
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
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 md:col-span-2 md:justify-end">
          <div className="mr-1 flex items-center gap-2">
            <Checkbox
              id="filter-tasks"
              checked={showTasksLayer}
              onCheckedChange={(v) => onShowTasksLayerChange?.(!!v)}
              aria-label="Show task due dates on calendar"
            />
            <label htmlFor="filter-tasks" className="cursor-pointer select-none whitespace-nowrap text-sm">
              Show Tasks Coming Due
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-public"
              checked={filterPublic}
              onCheckedChange={(v) => onFilterPublicChange(!!v)}
              aria-label="Show public events"
            />
            <label htmlFor="filter-public" className="cursor-pointer select-none whitespace-nowrap text-sm">
              Public
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-internal"
              checked={filterInternal}
              onCheckedChange={(v) => onFilterInternalChange(!!v)}
              aria-label="Show internal events"
            />
            <label htmlFor="filter-internal" className="cursor-pointer select-none whitespace-nowrap text-sm">
              Internal
            </label>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 sm:min-w-[7rem]"
            onClick={onReset}
            disabled={!canReset}
            title="Reset search and filters"
          >
            <RotateCcw className="mr-1 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Row 2: four equal columns on md+ (same 4-col tracks as row 1) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="min-w-0">
          <ProjectEventLinkCombobox
            value={selectedProjectId}
            onValueChange={(projectId) => onSelectedProjectIdChange?.(projectId)}
            className="min-w-0 w-full"
          />
        </div>

        <div className="min-w-0">
          {filterMemberships.length > 0 && onMembershipToggle ? (
            <TaxonomyMultiSelect
              label="Memberships"
              options={magOptions}
              selectedIds={selectedMembershipIds}
              onToggle={onMembershipToggle}
              placeholder="All memberships"
              className="w-full"
            />
          ) : (
            <div className="flex h-9 items-center rounded-md border border-dashed bg-muted/20 px-3 text-sm text-muted-foreground">
              No memberships
            </div>
          )}
        </div>

        <div className="min-w-0">
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-start font-normal text-muted-foreground"
            disabled
            title="Participant filtering will return in an upcoming update"
            aria-label="Search participants — coming in an upcoming update"
          >
            <Users className="mr-2 h-4 w-4 shrink-0 opacity-60" aria-hidden />
            <span className="truncate">Coming in next update</span>
          </Button>
        </div>

        <div className="min-w-0">
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-start font-normal text-muted-foreground"
            disabled
            title="Resource filtering will return in an upcoming update"
            aria-label="Search resources — coming in an upcoming update"
          >
            <Box className="mr-2 h-4 w-4 shrink-0 opacity-60" aria-hidden />
            <span className="truncate">Coming in next update</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
