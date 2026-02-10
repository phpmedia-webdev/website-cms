"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import type { Event } from "@/lib/supabase/events";
import { CalendarToolbar } from "./CalendarToolbar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./events-calendar.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

/** react-big-calendar event shape; extra id for linking to edit */
export interface RBCEvent {
  start: Date;
  end: Date;
  title: string;
  id?: string;
  resource?: unknown;
}

/** Week view: "Feb 9 – Feb 15, 2025" */
function dayRangeHeaderFormat(
  { start, end }: { start: Date; end: Date },
  _culture: string,
  _local: unknown
) {
  const startStr = format(start, "MMM d", { locale: enUS });
  const endStr = format(end, "MMM d, yyyy", { locale: enUS });
  return `${startStr} – ${endStr}`;
}

function toRBCEvent(ev: Event): RBCEvent {
  return {
    start: new Date(ev.start_date),
    end: new Date(ev.end_date),
    title: ev.title,
    id: ev.id,
  };
}

export interface EventsCalendarProps {
  events: Event[];
  date: Date;
  view: View;
  onDateChange: (date: Date) => void;
  onViewChange: (view: View) => void;
  onRangeChange?: (range: { start: Date; end: Date }) => void;
  height?: number;
}

export function EventsCalendar({
  events,
  date,
  view,
  onDateChange,
  onViewChange,
  onRangeChange,
  height = 500,
}: EventsCalendarProps) {
  const router = useRouter();
  const rbcEvents = useMemo(() => events.map(toRBCEvent), [events]);

  const handleSelectEvent = useCallback(
    (event: RBCEvent) => {
      if (event.id) router.push(`/admin/events/${event.id}/edit`);
    },
    [router]
  );

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (!onRangeChange) return;
      if (Array.isArray(range)) {
        const start = range[0];
        const end = range[range.length - 1];
        if (start && end) onRangeChange({ start, end });
      } else {
        onRangeChange(range);
      }
    },
    [onRangeChange]
  );

  return (
    <div className="events-calendar rbc-theme-override w-full h-full min-w-0">
      <Calendar
        localizer={localizer}
        events={rbcEvents}
        date={date}
        view={view}
        onNavigate={onDateChange}
        onView={onViewChange}
        onRangeChange={handleRangeChange}
        onSelectEvent={handleSelectEvent}
        views={["month", "week", "day", "agenda"]}
        components={{ toolbar: CalendarToolbar }}
        formats={{
          dayHeaderFormat: "cccc, MMM d, yyyy",
          dayRangeHeaderFormat,
        }}
        style={{ height }}
        popup
      />
    </div>
  );
}
