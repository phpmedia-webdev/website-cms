"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EventsCalendar } from "@/components/events/EventsCalendar";
import { EventsFilterBar } from "@/components/events/EventsFilterBar";
import {
  getTaxonomyTermsClient,
  getSectionConfigsClient,
  getTermsForContentSection,
  getContentTaxonomyRelationships,
} from "@/lib/supabase/taxonomy";
import type { TaxonomyTerm, SectionTaxonomyConfig } from "@/types/taxonomy";
import { Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Event } from "@/lib/supabase/events";
import { eventIdForEdit } from "@/lib/recurrence";
import type { View } from "react-big-calendar";

function useContainerHeight(minHeight = 400) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(minHeight);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { height: h } = entries[0]?.contentRect ?? {};
      if (typeof h === "number" && h > 0) setHeight(Math.max(minHeight, Math.floor(h)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [minHeight]);
  return { ref, height };
}

interface EventsPageClientProps {
  events: Event[];
}

export function EventsPageClient({
  events: initialEvents,
}: EventsPageClientProps) {
  const { ref: calendarRef, height: calendarHeight } = useContainerHeight(400);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<View>("month");
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterCategoryIds, setFilterCategoryIds] = useState<Set<string>>(new Set());
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());
  const [filterMembershipIds, setFilterMembershipIds] = useState<Set<string>>(new Set());
  const [filterPublic, setFilterPublic] = useState(true);
  const [filterInternal, setFilterInternal] = useState(true);
  const [filterParticipantIds, setFilterParticipantIds] = useState<Set<string>>(new Set());
  const [filterResourceIds, setFilterResourceIds] = useState<Set<string>>(new Set());
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [eventParticipantMap, setEventParticipantMap] = useState<Map<string, Set<string>>>(new Map());
  const [eventResourceMap, setEventResourceMap] = useState<Map<string, Set<string>>>(new Map());

  const [myViewEnabled, setMyViewEnabled] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);

  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [configs, setConfigs] = useState<SectionTaxonomyConfig[]>([]);
  const [mags, setMags] = useState<{ id: string; name: string; uid: string }[]>([]);
  const [eventTaxonomyMap, setEventTaxonomyMap] = useState<
    Map<string, { categoryIds: string[]; tagIds: string[] }>
  >(new Map());

  useEffect(() => {
    Promise.all([getTaxonomyTermsClient(), getSectionConfigsClient()])
      .then(([t, c]) => {
        setTerms(t);
        setConfigs(c);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/crm/mags")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const raw = Array.isArray(data) ? data : (data?.mags ?? []);
        const normalized = raw
          .map((m: Record<string, unknown>) => ({
            id: String(m?.id ?? m?.mag_id ?? ""),
            name: String(m?.name ?? ""),
            uid: String(m?.uid ?? ""),
          }))
          .filter((m) => m.id.length > 0);
        setMags(normalized);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (events.length === 0) {
      setEventTaxonomyMap(new Map());
      return;
    }
    // Use real event IDs only (recurring events have synthetic ids that don't exist in taxonomy_relationships)
    const realIds = [...new Set(events.map((e) => eventIdForEdit(e.id)))];
    getContentTaxonomyRelationships(realIds)
      .then((rels) => {
        const termIdToType = new Map<string, "category" | "tag">();
        terms.forEach((t) => termIdToType.set(t.id, t.type as "category" | "tag"));
        const map = new Map<string, { categoryIds: string[]; tagIds: string[] }>();
        rels.forEach((r) => {
          const t = map.get(r.content_id) ?? { categoryIds: [], tagIds: [] };
          const typ = termIdToType.get(r.term_id);
          if (typ === "category") t.categoryIds.push(r.term_id);
          else if (typ === "tag") t.tagIds.push(r.term_id);
          map.set(r.content_id, t);
        });
        setEventTaxonomyMap(map);
      })
      .catch(() => setEventTaxonomyMap(new Map()));
  }, [events, terms]);

  useEffect(() => {
    fetch("/api/events/me-participant-id")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { participantId?: string | null }) =>
        setMyParticipantId(data.participantId ?? null)
      )
      .catch(() => setMyParticipantId(null));
  }, []);

  useEffect(() => {
    const needAssignments =
      myViewEnabled ||
      filterParticipantIds.size > 0 ||
      filterResourceIds.size > 0;
    if (events.length === 0 || !needAssignments) {
      setEventParticipantMap(new Map());
      setEventResourceMap(new Map());
      return;
    }
    // Use real event IDs only: recurring events have synthetic ids (realId--timestamp); assignments are stored per real event
    const realIds = [...new Set(events.map((e) => eventIdForEdit(e.id)))];
    fetch(`/api/events/assignments?ids=${realIds.join(",")}`)
      .then((r) => (r.ok ? r.json() : { data: {} }))
      .then(({ data }) => {
        const pMap = new Map<string, Set<string>>();
        const rMap = new Map<string, Set<string>>();
        const pa = (data?.participantAssignments ?? {}) as Record<string, string[]>;
        const ra = (data?.resourceAssignments ?? {}) as Record<string, string[]>;
        Object.entries(pa).forEach(([eid, arr]) => pMap.set(eid, new Set(arr)));
        Object.entries(ra).forEach(([eid, arr]) => rMap.set(eid, new Set(arr)));
        setEventParticipantMap(pMap);
        setEventResourceMap(rMap);
      })
      .catch(() => {
        setEventParticipantMap(new Map());
        setEventResourceMap(new Map());
      });
  }, [events, myViewEnabled, filterParticipantIds.size, filterResourceIds.size]);

  const { categories, tags } = useMemo(
    () => getTermsForContentSection(terms, configs, "event"),
    [terms, configs]
  );

  const filterCategories = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name })),
    [categories]
  );
  const filterTags = useMemo(
    () => tags.map((t) => ({ id: t.id, name: t.name })),
    [tags]
  );

  const filteredEvents = useMemo(() => {
    let list = events;

    if (myViewEnabled) {
      if (myParticipantId == null) {
        list = [];
      } else {
        list = list.filter((e) => {
          const realId = eventIdForEdit(e.id);
          const pSet = eventParticipantMap.get(realId);
          return pSet != null && pSet.has(myParticipantId);
        });
      }
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q) ||
          (e.location ?? "").toLowerCase().includes(q)
      );
    }

    if (filterCategoryIds.size > 0) {
      list = list.filter((e) => {
        const t = eventTaxonomyMap.get(eventIdForEdit(e.id));
        if (!t) return false;
        return t.categoryIds.some((id) => filterCategoryIds.has(id));
      });
    }

    if (filterTagIds.size > 0) {
      list = list.filter((e) => {
        const t = eventTaxonomyMap.get(eventIdForEdit(e.id));
        if (!t) return false;
        return t.tagIds.some((id) => filterTagIds.has(id));
      });
    }

    if (filterMembershipIds.size > 0) {
      list = list.filter(
        (e) =>
          e.access_level === "mag" &&
          e.required_mag_id != null &&
          filterMembershipIds.has(e.required_mag_id)
      );
    }

    if (filterPublic !== filterInternal) {
      if (filterPublic) {
        list = list.filter((e) => e.visibility === "public");
      } else {
        list = list.filter((e) => e.visibility === "private");
      }
    }

    if (filterParticipantIds.size > 0) {
      list = list.filter((e) => {
        const realId = eventIdForEdit(e.id);
        const pSet = eventParticipantMap.get(realId);
        if (!pSet) return false;
        return [...filterParticipantIds].some((id) => pSet.has(id));
      });
    }
    if (filterResourceIds.size > 0) {
      list = list.filter((e) => {
        const realId = eventIdForEdit(e.id);
        const rSet = eventResourceMap.get(realId);
        if (!rSet) return false;
        return [...filterResourceIds].some((id) => rSet.has(id));
      });
    }

    return list;
  }, [
    events,
    myViewEnabled,
    myParticipantId,
    search,
    filterCategoryIds,
    filterTagIds,
    filterMembershipIds,
    filterPublic,
    filterInternal,
    filterParticipantIds,
    filterResourceIds,
    eventTaxonomyMap,
    eventParticipantMap,
    eventResourceMap,
  ]);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setFilterCategoryIds(new Set());
    setFilterTagIds(new Set());
    setFilterMembershipIds(new Set());
    setFilterPublic(true);
    setFilterInternal(true);
    setFilterParticipantIds(new Set());
    setFilterResourceIds(new Set());
  }, []);

  const fetchEvents = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      const json = await res.json();
      setEvents(json.data ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRangeChange = useCallback(
    (range: { start: Date; end: Date }) => {
      fetchEvents(range.start, range.end);
    },
    [fetchEvents]
  );

  // react-big-calendar calls onNavigate(newDate, view, action); use first arg so arrows update date
  const handleDateChange = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-11rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-2">
            Manage events and recurring schedules
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center shrink-0">
          <div className="flex items-center gap-2">
            <Switch
              id="my-view"
              checked={myViewEnabled}
              onCheckedChange={setMyViewEnabled}
              disabled={myParticipantId == null}
              aria-label="My View: only events where you are a participant"
            />
            <Label
              htmlFor="my-view"
              className="text-sm font-medium cursor-pointer select-none"
              title="Only events where you're a participant"
            >
              My View
            </Label>
          </div>
        </div>
        <div className="flex flex-1 justify-end shrink-0">
          <Button asChild>
            <Link href="/admin/events/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Link>
          </Button>
        </div>
      </div>

      <div className="shrink-0">
        <EventsFilterBar
          search={search}
          onSearchChange={setSearch}
          filterCategories={filterCategories}
          filterTags={filterTags}
          filterMemberships={mags}
          selectedCategoryIds={filterCategoryIds}
          selectedTagIds={filterTagIds}
          selectedMembershipIds={filterMembershipIds}
          filterPublic={filterPublic}
          filterInternal={filterInternal}
          onFilterPublicChange={(checked) => {
            setFilterPublic(checked);
            if (!checked && !filterInternal) setFilterInternal(true);
          }}
          onFilterInternalChange={(checked) => {
            setFilterInternal(checked);
            if (!checked && !filterPublic) setFilterPublic(true);
          }}
          filterParticipantIds={filterParticipantIds}
          filterResourceIds={filterResourceIds}
          onFilterParticipantsResourcesApply={(pIds, rIds) => {
            setFilterParticipantIds(pIds);
            setFilterResourceIds(rIds);
          }}
          showParticipantsModal={showParticipantsModal}
          onShowParticipantsModalChange={setShowParticipantsModal}
          onCategoryToggle={(id, checked) => {
            setFilterCategoryIds((prev) => {
              const next = new Set(prev);
              if (checked) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          onTagToggle={(id, checked) => {
            setFilterTagIds((prev) => {
              const next = new Set(prev);
              if (checked) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          onMembershipToggle={(id, checked) => {
            setFilterMembershipIds((prev) => {
              const next = new Set(prev);
              if (checked) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          onReset={handleResetFilters}
        />
      </div>

      <div ref={calendarRef} className="relative flex-1 min-h-[400px] w-full">
        {loading && (
          <div
            className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center rounded-lg"
            aria-hidden="true"
          />
        )}
        {myViewEnabled && filteredEvents.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">
              No events where you&apos;re a participant
            </p>
          </div>
        )}
        <EventsCalendar
          events={filteredEvents}
          date={date}
          view={view}
          onDateChange={handleDateChange}
          onViewChange={setView}
          onRangeChange={handleRangeChange}
          height={calendarHeight}
        />
      </div>
    </div>
  );
}
