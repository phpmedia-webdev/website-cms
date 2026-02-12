"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import Agenda from "react-big-calendar/lib/Agenda";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addDays,
  endOfDay,
  add,
  sub,
} from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import type { Event } from "@/lib/supabase/events";
import { eventIdForEdit } from "@/lib/recurrence";
import { CalendarToolbar } from "./CalendarToolbar";
import { Badge } from "@/components/ui/badge";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./events-calendar.css";

const AGENDA_PAST_DAYS = 30;

const CalendarViewContext = createContext<View>("month");

/** Agenda range that includes past days (e.g. 30 back, 30 forward). */
function agendaRangeWithPast(
  date: Date,
  opts: { length?: number; localizer?: { add: (d: Date, n: number, u: string) => Date } }
) {
  const length = opts?.length ?? 30;
  const localizer = opts?.localizer;
  const add = (d: Date, n: number) =>
    localizer ? localizer.add(d, n, "day") : addDays(d, n);
  return {
    start: add(date, -AGENDA_PAST_DAYS),
    end: add(date, length),
  };
}

/** Agenda header title for the extended range. */
function agendaTitle(
  start: Date,
  opts: { length?: number; localizer?: { add: (d: Date, n: number, u: string) => Date; format?: (r: { start: Date; end: Date }, f: string) => string } }
) {
  const r = agendaRangeWithPast(start, opts);
  return opts?.localizer?.format?.({ start: r.start, end: r.end }, "agendaHeaderFormat") ?? `${r.start.toDateString()} – ${r.end.toDateString()}`;
}

/** Agenda view that includes past days in range. Uses default Agenda with custom range + title. */
function AgendaWithPastRange(props: React.ComponentProps<typeof Agenda>) {
  return <Agenda {...props} />;
}
AgendaWithPastRange.range = agendaRangeWithPast;
AgendaWithPastRange.navigate = Agenda.navigate;
AgendaWithPastRange.title = agendaTitle;

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

/** Custom event cell: "Past" badge only in Agenda view; other views show title only to avoid breaking layout. */
function EventWithPastBadge(
  props: { event: RBCEvent; title: string; [key: string]: unknown }
) {
  const currentView = useContext(CalendarViewContext);
  const { event, title } = props;
  const isPast = event?.end ? new Date(event.end) < new Date() : false;
  const showBadge = currentView === "agenda" && isPast;

  if (currentView !== "agenda") {
    return <>{title}</>;
  }
  return (
    <span className="rbc-event-content-with-badge flex items-center gap-2 flex-wrap">
      <span className="truncate">{title}</span>
      {showBadge && (
        <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
          Past
        </Badge>
      )}
    </span>
  );
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
  /** When set, called instead of navigating to admin edit (e.g. for public calendar detail). */
  onSelectEvent?: (event: RBCEvent) => void;
}

export function EventsCalendar({
  events,
  date,
  view,
  onDateChange,
  onViewChange,
  onRangeChange,
  height = 500,
  onSelectEvent: onSelectEventProp,
}: EventsCalendarProps) {
  const router = useRouter();
  const rbcEvents = useMemo(() => events.map(toRBCEvent), [events]);

  const viewsConfig = useMemo(
    () => ({
      month: true,
      week: true,
      day: true,
      agenda: AgendaWithPastRange,
    }),
    []
  );

  // Big-step navigation: we compute the new date and call onDateChange so double arrows work in all views
  const onBigStep = useCallback(
    (direction: "prev" | "next") => {
      const step =
        view === "month"
          ? { years: 1 }
          : view === "week" || view === "agenda"
            ? { months: 1 }
            : { weeks: 1 };
      const newDate = direction === "prev" ? sub(date, step) : add(date, step);
      onDateChange(newDate);
    },
    [date, view, onDateChange]
  );

  const components = useMemo(
    () => ({
      toolbar: (props: React.ComponentProps<typeof CalendarToolbar>) => (
        <CalendarToolbar {...props} onBigStep={onBigStep} />
      ),
      event: EventWithPastBadge,
    }),
    [onBigStep]
  );

  const handleSelectEvent = useCallback(
    (event: RBCEvent) => {
      if (onSelectEventProp) {
        onSelectEventProp(event);
        return;
      }
      const id = event.id ? eventIdForEdit(event.id) : null;
      if (id) router.push(`/admin/events/${id}/edit`);
    },
    [onSelectEventProp, router]
  );

  // react-big-calendar calls onNavigate(newDate, view, action); forward the date so single and double arrows both work
  const handleNavigate = useCallback(
    (newDate: Date) => {
      if (newDate instanceof Date) onDateChange(newDate);
    },
    [onDateChange]
  );

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (!onRangeChange) return;
      if (Array.isArray(range)) {
        const start = range[0];
        const end = range[range.length - 1];
        if (start && end) {
          // Day view passes a single date [startOfDay]; use full day so events that day are fetched
          const endDate = range.length === 1 ? endOfDay(start) : end;
          onRangeChange({ start, end: endDate });
        }
      } else {
        onRangeChange(range);
      }
    },
    [onRangeChange]
  );

  return (
    <div className="events-calendar rbc-theme-override w-full h-full min-w-0">
      <CalendarViewContext.Provider value={view}>
        <Calendar
          localizer={localizer}
          events={rbcEvents}
          date={date}
          view={view}
          onNavigate={handleNavigate}
          onView={onViewChange}
          onRangeChange={handleRangeChange}
          onSelectEvent={handleSelectEvent}
          views={viewsConfig as import("react-big-calendar").ViewsProps<RBCEvent, object>}
          components={components as unknown as import("react-big-calendar").Components<RBCEvent, object>}
          formats={{
            dayHeaderFormat: "cccc, MMM d, yyyy",
            dayRangeHeaderFormat: (range: { start: Date; end: Date }, culture?: string, local?: unknown) =>
              dayRangeHeaderFormat(range, culture ?? "en", local),
          }}
          style={{ height }}
          popup
        />
      </CalendarViewContext.Provider>
    </div>
  );
}
