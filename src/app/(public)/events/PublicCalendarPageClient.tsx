"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { View } from "react-big-calendar";
import format from "date-fns/format";
import type { Event } from "@/lib/supabase/events";
import { EventsCalendar } from "@/components/events/EventsCalendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/components/events/events-calendar.css";

function useCalendarHeight(minHeight = 400) {
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

function formatEventTime(ev: { start_date: string; end_date: string; is_all_day: boolean }): string {
  if (ev.is_all_day) {
    const s = new Date(ev.start_date);
    const e = new Date(ev.end_date);
    const sameDay = s.toDateString() === e.toDateString();
    if (sameDay) return format(s, "EEEE, MMMM d, yyyy");
    return `${format(s, "MMM d, yyyy")} – ${format(e, "MMM d, yyyy")}`;
  }
  const s = new Date(ev.start_date);
  const e = new Date(ev.end_date);
  return `${format(s, "EEEE, MMM d, yyyy 'at' h:mm a")} – ${format(e, "h:mm a")}`;
}

export function PublicCalendarPageClient() {
  const { ref: calendarRef, height: calendarHeight } = useCalendarHeight(400);
  const [events, setEvents] = useState<Event[]>([]);
  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<View>("month");
  const [loading, setLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchEvents = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const res = await fetch(`/api/events/public?${params}`);
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

  useEffect(() => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    fetchEvents(start, end);
  }, [date.getFullYear(), date.getMonth(), fetchEvents]);

  useEffect(() => {
    if (!selectedEventId) {
      setDetailEvent(null);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/events/public/${encodeURIComponent(selectedEventId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setDetailEvent(json?.data ?? null))
      .finally(() => setDetailLoading(false));
  }, [selectedEventId]);

  const icsUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/events/ics`
      : "/api/events/ics";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground mt-1">
            Public events. Subscribe to add them to your calendar.
          </p>
        </div>
        <a href={icsUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Subscribe to calendar (ICS)
          </Button>
        </a>
      </div>

      <div ref={calendarRef} className="h-[calc(100vh-14rem)] min-h-[400px]">
        {loading && events.length === 0 ? (
          <p className="text-muted-foreground py-8">Loading events…</p>
        ) : (
          <EventsCalendar
            events={events}
            date={date}
            view={view}
            onDateChange={setDate}
            onViewChange={setView}
            onRangeChange={handleRangeChange}
            height={calendarHeight}
            onSelectEvent={(rbcEvent) => {
              if (rbcEvent.id) setSelectedEventId(String(rbcEvent.id));
            }}
          />
        )}
      </div>

      <Dialog open={!!selectedEventId} onOpenChange={(open) => !open && setSelectedEventId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{detailLoading ? "Loading…" : detailEvent?.title ?? "Event"}</DialogTitle>
          </DialogHeader>
          {detailEvent && !detailLoading && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground font-medium">
                {formatEventTime(detailEvent)}
              </p>
              {detailEvent.location?.trim() && (
                <p>
                  <span className="text-muted-foreground">Location: </span>
                  {detailEvent.location}
                </p>
              )}
              {detailEvent.description?.trim() && (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{detailEvent.description}</p>
                </div>
              )}
              <a href={icsUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Subscribe to calendar
                </Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
