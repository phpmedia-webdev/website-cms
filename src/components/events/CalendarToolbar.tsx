"use client";

import { add, sub } from "date-fns";
import { ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from "lucide-react";
import type { View } from "react-big-calendar";

const NAVIGATE_DATE = "DATE";
const NAVIGATE_TODAY = "TODAY";

interface CalendarToolbarProps {
  label: string;
  view: View;
  date: Date;
  onNavigate: (action: string, date?: Date) => void;
  onView: (view: View) => void;
  views: View[];
  localizer?: { messages?: Record<string, string> };
}

/** Single arrow = smaller step; double arrow = bigger step. */
function getSteps(view: View): { small: "day" | "week" | "month"; big: "week" | "month" | "year" } {
  switch (view) {
    case "day":
      return { small: "day", big: "week" };
    case "week":
      return { small: "week", big: "month" };
    case "month":
      return { small: "month", big: "year" };
    case "agenda":
      return { small: "week", big: "month" };
    default:
      return { small: "month", big: "year" };
  }
}

export function CalendarToolbar({
  label,
  view,
  date,
  onNavigate,
  onView,
  views,
  localizer,
}: CalendarToolbarProps) {
  const m = localizer?.messages ?? {};
  const messages = {
    today: m.today ?? "Today",
    month: m.month ?? "Month",
    week: m.week ?? "Week",
    day: m.day ?? "Day",
    agenda: m.agenda ?? "Agenda",
    ...m,
  };
  const { small, big } = getSteps(view);

  const prevSmall = () => onNavigate(NAVIGATE_DATE, sub(date, { [small]: 1 }));
  const prevBig = () => onNavigate(NAVIGATE_DATE, sub(date, { [big]: 1 }));
  const nextSmall = () => onNavigate(NAVIGATE_DATE, add(date, { [small]: 1 }));
  const nextBig = () => onNavigate(NAVIGATE_DATE, add(date, { [big]: 1 }));
  const goToday = () => onNavigate(NAVIGATE_TODAY);

  return (
    <div className="rbc-toolbar flex flex-wrap items-center justify-between gap-4">
      {/* Section 1: Arrows + date, left justified */}
      <div className="flex items-center gap-0.5 shrink-0">
        <span className="rbc-btn-group flex items-center">
          <button
            type="button"
            className="rbc-btn px-1.5 py-1"
            onClick={prevSmall}
            title={`Previous ${small}`}
            aria-label={`Previous ${small}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rbc-btn px-1.5 py-1"
            onClick={prevBig}
            title={`Previous ${big}`}
            aria-label={`Previous ${big}`}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        </span>
        <span className="rbc-toolbar-label px-2 font-medium text-sm min-w-0">{label}</span>
        <span className="rbc-btn-group flex items-center">
          <button
            type="button"
            className="rbc-btn px-1.5 py-1"
            onClick={nextBig}
            title={`Next ${big}`}
            aria-label={`Next ${big}`}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rbc-btn px-1.5 py-1"
            onClick={nextSmall}
            title={`Next ${small}`}
            aria-label={`Next ${small}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </span>
      </div>
      {/* Section 2: Today + view buttons, right justified */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="rbc-btn-group">
          <button type="button" className="rbc-btn" onClick={goToday}>
            {messages.today}
          </button>
        </span>
        {views.length > 1 && (
          <span className="rbc-btn-group flex gap-0.5">
            {views.map((v) => (
              <button
                type="button"
                key={v}
                className={`rbc-btn ${view === v ? "rbc-active" : ""}`}
                onClick={() => onView(v)}
              >
                {messages[v] ?? v}
              </button>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
