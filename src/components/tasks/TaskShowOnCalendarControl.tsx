"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

export function TaskShowOnCalendarControl({
  taskId,
  href,
}: {
  taskId: string;
  href: string;
}) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tasks/${taskId}/calendar-visibility`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { show_on_calendar: false }))
      .then((j: { show_on_calendar?: boolean }) => {
        if (!cancelled) setChecked(j.show_on_calendar === true);
      })
      .catch(() => {
        if (!cancelled) setChecked(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const canOpenLink = useMemo(() => checked, [checked]);

  async function onToggle(next: boolean) {
    setChecked(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/calendar-visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_on_calendar: next }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setChecked((prev) => !prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`task-show-on-calendar-${taskId}`}
        checked={checked}
        disabled={loading || saving}
        onCheckedChange={(v) => void onToggle(Boolean(v))}
        aria-label="Show due date on calendar"
      />
      <label
        htmlFor={`task-show-on-calendar-${taskId}`}
        className="text-xs font-normal text-muted-foreground"
      >
        {canOpenLink ? (
          <Link href={href} className="underline-offset-4 hover:underline">
            Show due date on calendar
          </Link>
        ) : (
          <span>Show due date on calendar</span>
        )}
      </label>
    </div>
  );
}

