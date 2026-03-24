"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ComponentProps,
} from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import Agenda from "react-big-calendar/lib/Agenda";
import AgendaWithDescription from "./AgendaWithDescription";
import type { CSSProperties } from "react";
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
import {
  contrastTextOnHex,
  DEFAULT_EVENT_TYPE_COLOR,
  resolveEventTypeColor,
} from "@/lib/event-type-colors";
import { CalendarToolbar } from "./CalendarToolbar";
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

/**
 * Agenda's built-in body only lists/filters from `date` through `date + length` (default 30 days forward).
 * Our toolbar title and `agendaRangeWithPast` use 30 days back + 30 forward. Shift the anchor and extend
 * `length` so listed days and the inRange filter match what we fetch via onRangeChange.
 */
function AgendaWithPastRange(props: ComponentProps<typeof Agenda>) {
  const { date, length: forwardLength, localizer, ...rest } = props;
  const forward = forwardLength ?? 30;
  const shiftedStart = localizer.add(date, -AGENDA_PAST_DAYS, "day");
  const totalLength = AGENDA_PAST_DAYS + forward;
  return (
    <AgendaWithDescription
      {...rest}
      date={shiftedStart}
      length={totalLength}
      localizer={localizer}
    />
  );
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
  /** Customizer `event_type` slug */
  eventTypeSlug?: string | null;
  /** Resolved hex color for this type */
  displayColor?: string;
  /** Plain or HTML description (agenda column strips tags for display) */
  description?: string | null;
  /** Full native tooltip (time, location, resources) — admin calendar */
  hoverDetail?: string | null;
  /** Same as hoverDetail when set; else title — for `tooltipAccessor` */
  tooltip?: string;
}

/** Month: color chip + truncated title (one line). Agenda: chip + title (row tone = past/today/future in CSS). */
function CalendarEventContent(props: {
  event: RBCEvent;
  title: string;
  [key: string]: unknown;
}) {
  const currentView = useContext(CalendarViewContext);
  const { event, title } = props;
  const color = event.displayColor ?? DEFAULT_EVENT_TYPE_COLOR;
  /* Do not set `title` on inner nodes — browser uses the innermost titled element; short title would win over
     `.rbc-event-content`'s full tooltip from `tooltipAccessor` (month/week/day + popup). Agenda uses `<tr title>`. */

  if (currentView === "month") {
    return (
      <span className="rbc-event-month-inner flex min-w-0 max-w-full items-center gap-1.5">
        <span
          className="size-2 shrink-0 rounded-full border border-black/15 dark:border-white/20"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="min-w-0 truncate text-left text-xs font-normal leading-tight text-foreground">
          {title}
        </span>
      </span>
    );
  }

  if (currentView === "agenda") {
    return (
      <span className="rbc-agenda-event-title-row flex w-full min-w-0 items-center justify-start gap-2">
        <span
          className="size-2 shrink-0 rounded-full border border-black/15 dark:border-white/20"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="min-w-0 shrink truncate text-left">{title}</span>
      </span>
    );
  }

  return <span className="block min-w-0 truncate">{title}</span>;
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

function toRBCEvent(
  ev: Event,
  colorMap: Record<string, string>,
  hoverDetail?: string | null
): RBCEvent {
  const displayColor = resolveEventTypeColor(ev.event_type, colorMap);
  const tip = hoverDetail?.trim() ? hoverDetail.trim() : undefined;
  return {
    start: new Date(ev.start_date),
    end: new Date(ev.end_date),
    title: ev.title,
    id: ev.id,
    eventTypeSlug: ev.event_type ?? undefined,
    displayColor,
    description: ev.description,
    hoverDetail: tip,
    /** RBC `tooltipAccessor` default reads `title`; we set `tooltipAccessor` to prefer `hoverDetail` / this field. */
    tooltip: tip ?? ev.title,
  };
}

export interface EventsCalendarProps {
  events: Event[];
  /** Slug → hex from customizer `event_type` (from API `event_type_colors` or SSR). */
  eventTypeColors?: Record<string, string>;
  date: Date;
  view: View;
  onDateChange: (date: Date) => void;
  onViewChange: (view: View) => void;
  onRangeChange?: (range: { start: Date; end: Date }) => void;
  height?: number;
  /** When set, called instead of navigating to admin edit (e.g. for public calendar detail). */
  onSelectEvent?: (event: RBCEvent) => void;
  /** Keyed by calendar event `id` (includes recurrence instance ids). Native hover for all views. */
  eventHoverDetailByEventId?: Record<string, string>;
}

export function EventsCalendar({
  events,
  eventTypeColors = {},
  date,
  view,
  onDateChange,
  onViewChange,
  onRangeChange,
  height = 500,
  onSelectEvent: onSelectEventProp,
  eventHoverDetailByEventId,
}: EventsCalendarProps) {
  const router = useRouter();
  const rbcEvents = useMemo(
    () =>
      events.map((ev) =>
        toRBCEvent(ev, eventTypeColors, eventHoverDetailByEventId?.[ev.id])
      ),
    [events, eventTypeColors, eventHoverDetailByEventId]
  );

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

  const chipOnlyEventStyle = {
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "none",
    color: "inherit",
  } satisfies CSSProperties;

  /**
   * RBC applies only `className` + `style` from here onto `.rbc-event`.
   * The visible browser tooltip on `.rbc-event-content` comes from `tooltipAccessor` (default was `title` field).
   */
  const eventPropGetter = useCallback(
    (ev: RBCEvent) => {
      if (view === "month") {
        return {
          className: "rbc-event--month-compact",
          style: chipOnlyEventStyle,
        };
      }
      if (view === "agenda") {
        return {
          className: "rbc-event--agenda-compact",
          style: chipOnlyEventStyle,
        };
      }
      const bg = ev.displayColor ?? DEFAULT_EVENT_TYPE_COLOR;
      const fg = contrastTextOnHex(bg);
      return {
        style: {
          backgroundColor: bg,
          color: fg,
          borderColor: bg,
        } satisfies CSSProperties,
      };
    },
    [view]
  );

  /**
   * RBC EventCell sets `title` on `.rbc-event-content` from this accessor (default was event.title only).
   */
  const tooltipAccessor = useCallback((event: object) => {
    const e = event as RBCEvent;
    return (e.hoverDetail?.trim() || e.tooltip?.trim() || e.title || "").trim();
  }, []);

  const components = useMemo(
    () => ({
      toolbar: (props: ComponentProps<typeof CalendarToolbar>) => (
        <CalendarToolbar {...props} onBigStep={onBigStep} />
      ),
      event: CalendarEventContent,
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
          eventPropGetter={eventPropGetter}
          tooltipAccessor={tooltipAccessor}
          views={viewsConfig as import("react-big-calendar").ViewsProps<RBCEvent, object>}
          components={components as unknown as import("react-big-calendar").Components<RBCEvent, object>}
          formats={{
            dayHeaderFormat: "cccc, MMM d, yyyy",
            dayRangeHeaderFormat: (range: { start: Date; end: Date }, culture?: string, local?: unknown) =>
              dayRangeHeaderFormat(range, culture ?? "en", local),
            /* Agenda date column: weekday + month + day, no year (e.g. Wed Feb 18) */
            agendaDateFormat: "EEE MMM d",
            agendaTimeFormat: "hh:mm a",
            agendaTimeRangeFormat: (
              range: { start: Date; end: Date },
              culture?: string,
              loc?: { format: (value: Date, formatStr: string, cult?: string) => string }
            ) => {
              const c = culture ?? "en-US";
              const a = loc?.format(range.start, "hh:mm a", c) ?? "";
              const b = loc?.format(range.end, "hh:mm a", c) ?? "";
              return `${a} – ${b}`;
            },
          }}
          style={{ height }}
          popup
        />
      </CalendarViewContext.Provider>
    </div>
  );
}
