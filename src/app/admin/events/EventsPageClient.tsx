"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EventsCalendar } from "@/components/events/EventsCalendar";
import { EventsFilterBar } from "@/components/events/EventsFilterBar";
import { Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Event } from "@/lib/supabase/events";
import { eventIdForEdit } from "@/lib/recurrence";
import { buildCalendarEventHoverText } from "@/lib/events/calendar-event-hover";
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
  /** From SSR + GET /api/events `event_type_colors` (Customizer scope event_type). */
  initialEventTypeColors?: Record<string, string>;
}

type EventTypeOption = { slug: string; label: string };

export function EventsPageClient({
  events: initialEvents,
  initialEventTypeColors = {},
}: EventsPageClientProps) {
  const { ref: calendarRef, height: calendarHeight } = useContainerHeight(400);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [eventTypeColors, setEventTypeColors] = useState<Record<string, string>>(
    () => initialEventTypeColors
  );
  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<View>("month");
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [eventTypeOptions, setEventTypeOptions] = useState<EventTypeOption[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filterMembershipIds, setFilterMembershipIds] = useState<Set<string>>(new Set());
  const [filterPublic, setFilterPublic] = useState(true);
  const [filterInternal, setFilterInternal] = useState(true);
  const [filterParticipantIds, setFilterParticipantIds] = useState<Set<string>>(new Set());
  const [filterResourceIds, setFilterResourceIds] = useState<Set<string>>(new Set());
  const [eventParticipantMap, setEventParticipantMap] = useState<Map<string, Set<string>>>(new Map());
  const [eventResourceMap, setEventResourceMap] = useState<Map<string, Set<string>>>(new Map());
  const [resourceNamesByEvent, setResourceNamesByEvent] = useState<Record<string, string[]>>({});

  const [myViewEnabled, setMyViewEnabled] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);

  const [mags, setMags] = useState<{ id: string; name: string; uid: string }[]>([]);

  useEffect(() => {
    fetch("/api/settings/customizer?scope=event_type")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        const raw = Array.isArray(data) ? data : [];
        setEventTypeOptions(
          raw
            .map((row: Record<string, unknown>) => ({
              slug: String(row.slug ?? "").trim(),
              label: String(row.label ?? row.slug ?? "").trim() || String(row.slug ?? ""),
            }))
            .filter((o) => o.slug.length > 0)
        );
      })
      .catch(() => setEventTypeOptions([]));
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
          .filter((m: { id: string }) => m.id.length > 0);
        setMags(normalized);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/events/me-participant-id")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { participantId?: string | null }) =>
        setMyParticipantId(data.participantId ?? null)
      )
      .catch(() => setMyParticipantId(null));
  }, []);

  useEffect(() => {
    if (events.length === 0) {
      setEventParticipantMap(new Map());
      setEventResourceMap(new Map());
      setResourceNamesByEvent({});
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
        const namesBy = (data?.resourceNamesByEvent ?? {}) as Record<string, string[]>;
        Object.entries(pa).forEach(([eid, arr]) => pMap.set(eid, new Set(arr)));
        Object.entries(ra).forEach(([eid, arr]) => rMap.set(eid, new Set(arr)));
        setEventParticipantMap(pMap);
        setEventResourceMap(rMap);
        setResourceNamesByEvent(namesBy);
      })
      .catch(() => {
        setEventParticipantMap(new Map());
        setEventResourceMap(new Map());
        setResourceNamesByEvent({});
      });
  }, [events]);

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

    if (selectedEventType) {
      list = list.filter((e) => (e.event_type ?? null) === selectedEventType);
    }

    if (selectedProjectId) {
      list = list.filter((e) => (e.project_id ?? null) === selectedProjectId);
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
    selectedEventType,
    selectedProjectId,
    filterMembershipIds,
    filterPublic,
    filterInternal,
    filterParticipantIds,
    filterResourceIds,
    eventParticipantMap,
    eventResourceMap,
  ]);

  /** Native `title` hover for month / week / day / agenda (per occurrence id + resource names from assignments API). */
  const eventHoverDetailByEventId = useMemo(() => {
    const out: Record<string, string> = {};
    for (const e of filteredEvents) {
      const realId = eventIdForEdit(e.id);
      const names = resourceNamesByEvent[realId] ?? [];
      out[e.id] = buildCalendarEventHoverText(e, names);
    }
    return out;
  }, [filteredEvents, resourceNamesByEvent]);

  const hasFilters = useMemo(
    () =>
      search.trim().length > 0 ||
      !!selectedEventType ||
      !!selectedProjectId ||
      filterMembershipIds.size > 0 ||
      !filterPublic ||
      !filterInternal ||
      filterParticipantIds.size > 0 ||
      filterResourceIds.size > 0,
    [
      search,
      selectedEventType,
      selectedProjectId,
      filterMembershipIds,
      filterPublic,
      filterInternal,
      filterParticipantIds,
      filterResourceIds,
    ]
  );

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setSelectedEventType(null);
    setSelectedProjectId(null);
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
      if (json.event_type_colors && typeof json.event_type_colors === "object") {
        setEventTypeColors(json.event_type_colors as Record<string, string>);
      }
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
      <div className="grid shrink-0 grid-cols-1 items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">Calendar Events</h1>
          <p className="mt-2 text-muted-foreground">
            Manage events and recurring schedules
          </p>
        </div>

        <div className="flex justify-center md:px-2">
          <div
            className="inline-flex items-center gap-4 rounded-full border border-border/80 bg-muted/30 px-4 py-2 shadow-sm"
            title={
              myParticipantId == null
                ? "Participant record not linked; My View unavailable"
                : undefined
            }
          >
            <span
              className={cn(
                "select-none text-sm font-medium transition-colors",
                !myViewEnabled ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              All Events
            </span>
            <Switch
              id="my-view"
              checked={myViewEnabled}
              onCheckedChange={setMyViewEnabled}
              disabled={myParticipantId == null}
              aria-label={
                myViewEnabled
                  ? "Showing My View; switch to All Events"
                  : "Showing All Events; switch to My View"
              }
              className="scale-[1.45] border border-border/60 shadow-sm data-[state=unchecked]:bg-muted data-[state=checked]:bg-primary"
            />
            <span
              className={cn(
                "select-none text-sm font-medium transition-colors",
                myViewEnabled ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              My View
            </span>
          </div>
        </div>

        <div className="flex justify-start md:justify-end">
          <Button asChild className="shrink-0">
            <Link href="/admin/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Link>
          </Button>
        </div>
      </div>

      <div className="shrink-0">
        <EventsFilterBar
          search={search}
          onSearchChange={setSearch}
          eventTypeOptions={eventTypeOptions}
          selectedEventType={selectedEventType}
          onSelectedEventTypeChange={setSelectedEventType}
          selectedProjectId={selectedProjectId}
          onSelectedProjectIdChange={setSelectedProjectId}
          filterPublic={filterPublic}
          filterInternal={filterInternal}
          onFilterPublicChange={(checked) => {
            setFilterPublic(checked);
            if (!checked) setFilterInternal((prev) => prev || true);
          }}
          onFilterInternalChange={(checked) => {
            setFilterInternal(checked);
            if (!checked) setFilterPublic((prev) => prev || true);
          }}
          canReset={hasFilters}
          onReset={handleResetFilters}
          filterMemberships={mags}
          selectedMembershipIds={filterMembershipIds}
          onMembershipToggle={(id, checked) => {
            setFilterMembershipIds((prev) => {
              const next = new Set(prev);
              if (checked) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
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
          eventTypeColors={eventTypeColors}
          date={date}
          view={view}
          onDateChange={handleDateChange}
          onViewChange={setView}
          onRangeChange={handleRangeChange}
          height={calendarHeight}
          eventHoverDetailByEventId={eventHoverDetailByEventId}
        />
      </div>
    </div>
  );
}
