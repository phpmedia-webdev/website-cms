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
import type { Event } from "@/lib/supabase/events";
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
    const ids = events.map((e) => e.id);
    getContentTaxonomyRelationships(ids)
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
        const t = eventTaxonomyMap.get(e.id);
        if (!t) return false;
        return t.categoryIds.some((id) => filterCategoryIds.has(id));
      });
    }

    if (filterTagIds.size > 0) {
      list = list.filter((e) => {
        const t = eventTaxonomyMap.get(e.id);
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

    return list;
  }, [
    events,
    search,
    filterCategoryIds,
    filterTagIds,
    filterMembershipIds,
    eventTaxonomyMap,
  ]);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setFilterCategoryIds(new Set());
    setFilterTagIds(new Set());
    setFilterMembershipIds(new Set());
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

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-11rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-2">
            Manage events and recurring schedules
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/events/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Link>
        </Button>
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
        <EventsCalendar
          events={filteredEvents}
          date={date}
          view={view}
          onDateChange={setDate}
          onViewChange={setView}
          onRangeChange={handleRangeChange}
          height={calendarHeight}
        />
      </div>
    </div>
  );
}
