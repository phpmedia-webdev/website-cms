"use client";

/**
 * Agenda view with Date | Time | Event | Description columns.
 * Forked from react-big-calendar's Agenda (three columns) so description can sit in its own column.
 */

import { Fragment, type ComponentProps, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { isSameDay } from "date-fns";
import Agenda from "react-big-calendar/lib/Agenda";
import { inRange } from "react-big-calendar/lib/utils/eventLevels";
import { isSelected } from "react-big-calendar/lib/utils/selection";
import { cn } from "@/lib/utils";

export type AgendaWithDescriptionProps = ComponentProps<typeof Agenda>;

/** Strip basic HTML so description shows as one line in the table. */
function descriptionPlainText(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return "";
  return String(raw)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function AgendaWithDescription(props: AgendaWithDescriptionProps) {
  const {
    accessors,
    components,
    date,
    events: eventsProp,
    getters,
    getNow = () => new Date(),
    length = 30,
    localizer,
    onDoubleClickEvent,
    onSelectEvent,
    selected,
  } = props;

  const now = getNow();

  const messages = localizer.messages;
  const EventComponent = components.event;
  const AgendaDate = components.date;
  const TimeComponent = components.time;

  const timeRangeLabel = (day: Date, event: object): ReactElement => {
    let labelClass = "";
    const end = accessors.end(event);
    const start = accessors.start(event);
    let label: ReactNode = messages.allDay;

    if (!accessors.allDay(event)) {
      if (localizer.eq(start, end)) {
        label = localizer.format(start, "agendaTimeFormat");
      } else if (localizer.isSameDate(start, end)) {
        label = localizer.format({ start, end }, "agendaTimeRangeFormat");
      } else if (localizer.isSameDate(day, start)) {
        label = localizer.format(start, "agendaTimeFormat");
      } else if (localizer.isSameDate(day, end)) {
        label = localizer.format(end, "agendaTimeFormat");
      }
    }

    if (localizer.gt(day, start, "day")) labelClass = "rbc-continues-prior";
    if (localizer.lt(day, end, "day")) labelClass += " rbc-continues-after";

    return (
      <span className={labelClass.trim()}>
        {TimeComponent ? (
          <TimeComponent event={event} day={day} label={label} />
        ) : (
          label
        )}
      </span>
    );
  };

  const renderDay = (day: Date, dayEvents: object[], dayKey: number) => {
    let filtered = dayEvents.filter((e) =>
      inRange(e, localizer.startOf(day, "day"), localizer.endOf(day, "day"), accessors, localizer)
    );

    return filtered.map((event, idx) => {
      const title = accessors.title(event);
      const end = accessors.end(event);
      const start = accessors.start(event);
      const userProps = getters.eventProp(
        event,
        start,
        end,
        isSelected(event, selected)
      );
      const dateLabel = idx === 0 ? localizer.format(day, "agendaDateFormat") : undefined;

      const descSource =
        event && typeof event === "object" && "description" in event
          ? (event as { description?: string | null }).description
          : "";
      const descriptionText = descriptionPlainText(descSource);

      const isPastEvent = end < now;
      const isTodayRow = isSameDay(day, now);
      const rowTone = isPastEvent
        ? "rbc-agenda-row--past"
        : isTodayRow
          ? "rbc-agenda-row--today"
          : "rbc-agenda-row--future";

      const first =
        idx === 0 ? (
          <td rowSpan={filtered.length} className="rbc-agenda-date-cell">
            {AgendaDate ? (
              <AgendaDate day={day} label={dateLabel} />
            ) : (
              dateLabel
            )}
          </td>
        ) : null;

      const rowClick = (e: MouseEvent<HTMLTableRowElement>) => {
        onSelectEvent?.(event, e);
      };
      const rowDblClick = (e: MouseEvent<HTMLTableRowElement>) => {
        onDoubleClickEvent?.(event, e);
      };

      return (
        <tr
          key={`${dayKey}_${idx}`}
          className={cn(userProps.className, rowTone)}
          style={userProps.style}
          onClick={rowClick}
          onDoubleClick={rowDblClick}
        >
          {first}
          <td className="rbc-agenda-time-cell">{timeRangeLabel(day, event)}</td>
          <td className="rbc-agenda-event-cell rbc-agenda-event-name-cell">
            {EventComponent ? (
              <EventComponent event={event} title={title} />
            ) : (
              title
            )}
          </td>
          <td className="rbc-agenda-description-cell">
            <span
              className="rbc-agenda-description-inner block truncate text-left text-sm text-muted-foreground"
              title={descriptionText || undefined}
            >
              {descriptionText || "—"}
            </span>
          </td>
        </tr>
      );
    });
  };

  const rangeEnd = localizer.add(date, length, "day");
  const dayRange = localizer.range(date, rangeEnd, "day");

  let events = [...eventsProp].filter((event) =>
    inRange(
      event,
      localizer.startOf(date, "day"),
      localizer.endOf(rangeEnd, "day"),
      accessors,
      localizer
    )
  );
  events.sort((a, b) => +accessors.start(a) - +accessors.start(b));

  if (events.length === 0) {
    return (
      <div className="rbc-agenda-view">
        <span className="rbc-agenda-empty">{messages.noEventsInRange}</span>
      </div>
    );
  }

  return (
    <div className="rbc-agenda-view rbc-agenda-view--with-description">
      {/*
        Single table (thead + tbody) inside one scroll container so colgroup aligns with header labels.
        Stock RBC uses two tables + scrollbar on the body only, which shifts column edges vs thead.
      */}
      <div className="rbc-agenda-content rbc-agenda-with-desc-scroll">
        <table className="rbc-agenda-table rbc-agenda-table--fixed-cols">
          <colgroup>
            <col className="rbc-agenda-col-date" />
            <col className="rbc-agenda-col-time" />
            <col className="rbc-agenda-col-event-name" />
            <col className="rbc-agenda-col-description" />
          </colgroup>
          <thead className="rbc-agenda-with-desc-thead">
            <tr>
              <th className="rbc-header">{messages.date}</th>
              <th className="rbc-header">{messages.time}</th>
              <th className="rbc-header">{messages.event}</th>
              <th className="rbc-header">Description</th>
            </tr>
          </thead>
          <tbody>
            {dayRange.map((day: Date, idx: number) => (
              <Fragment key={idx}>{renderDay(day, events, idx)}</Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
