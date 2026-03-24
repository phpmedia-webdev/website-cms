"use client";

import { mockEvents, type ProjectEvent } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Calendar, Clock, MapPin, Users } from "lucide-react";

const EVENT_TYPE_MAP: Record<ProjectEvent["type"], { label: string; className: string }> = {
  meeting:  { label: "Meeting",  className: "bg-blue-100 text-blue-700 border border-blue-200" },
  deadline: { label: "Deadline", className: "bg-red-100 text-red-700 border border-red-200" },
  review:   { label: "Review",   className: "bg-amber-100 text-amber-700 border border-amber-200" },
  demo:     { label: "Demo",     className: "bg-purple-100 text-purple-700 border border-purple-200" },
  release:  { label: "Release",  className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
};

function EventTypeChip({ type }: { type: ProjectEvent["type"] }) {
  const cfg = EVENT_TYPE_MAP[type];
  return (
    <span className={cn("inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", cfg.className)}>
      {cfg.label}
    </span>
  );
}

function MemberAvatarGroup({ attendees }: { attendees: ProjectEvent["attendees"] }) {
  const max = 4;
  const visible = attendees.slice(0, max);
  const extra = attendees.length - max;
  return (
    <div className="flex items-center -space-x-1.5" aria-label={`${attendees.length} attendees`}>
      {visible.map((m) => {
        const hue = (parseInt(m.id) * 47 + 200) % 360;
        const initials = m.name.split(" ").map((n) => n[0]).join("");
        return (
          <span
            key={m.id}
            className="size-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-1 ring-white"
            style={{ background: `oklch(0.52 0.2 ${hue})` }}
            title={m.name}
          >
            {initials}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="size-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-muted text-muted-foreground ring-1 ring-white">
          +{extra}
        </span>
      )}
    </div>
  );
}

export function EventsTable() {
  const events = mockEvents;
  return (
    <div className="flex flex-col gap-3">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl">
        <table className="w-full text-sm border-collapse" aria-label="Project events">
          <thead>
            <tr className="glass-card border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendees</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => (
              <tr
                key={ev.id}
                className={cn(
                  "border-b border-border/50 hover:bg-primary/5 transition-colors",
                  i % 2 === 0 ? "bg-card/40" : "bg-card/20"
                )}
              >
                <td className="pl-4 pr-3 py-3">
                  <span className="font-medium text-foreground">{ev.title}</span>
                </td>
                <td className="px-3 py-3">
                  <EventTypeChip type={ev.type} />
                </td>
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0" />
                    {ev.date}
                  </span>
                </td>
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5 shrink-0" />
                    {ev.time}
                  </span>
                </td>
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0" />
                    {ev.location}
                  </span>
                </td>
                <td className="pl-3 pr-4 py-3">
                  <MemberAvatarGroup attendees={ev.attendees} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {events.map((ev) => (
          <div key={ev.id} className="glass-card rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-foreground text-sm">{ev.title}</span>
              <EventTypeChip type={ev.type} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="size-3.5" />{ev.date}</span>
              <span className="flex items-center gap-1.5"><Clock className="size-3.5" />{ev.time}</span>
              <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{ev.location}</span>
              <span className="flex items-center gap-1.5"><Users className="size-3.5" />{ev.attendees.length} attendees</span>
            </div>
            <MemberAvatarGroup attendees={ev.attendees} />
          </div>
        ))}
      </div>
    </div>
  );
}
