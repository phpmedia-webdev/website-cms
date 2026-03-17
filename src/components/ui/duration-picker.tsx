"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Preset durations in minutes. */
const PRESETS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 h", minutes: 60 },
  { label: "3 h", minutes: 180 },
] as const;

export interface DurationPickerProps {
  /** Total duration in minutes. Null = not set. */
  value: number | null;
  /** Called with total minutes when value changes. Pass null to clear. */
  onValueChange: (minutes: number | null) => void;
  id?: string;
  label?: string;
  className?: string;
  /** Max hours to allow (default 999). */
  maxHours?: number;
  disabled?: boolean;
}

/**
 * Two-field picker (hours + minutes) with presets. Value stored as total minutes.
 * For display of a duration use formatMinutesAsHoursMinutes from @/lib/supabase/projects.
 */
export function DurationPicker({
  value,
  onValueChange,
  id = "duration",
  label = "Estimated time",
  className,
  maxHours = 999,
  disabled = false,
}: DurationPickerProps) {
  const total = value ?? 0;
  const [hours, setHours] = React.useState(Math.floor(total / 60));
  const [minutes, setMinutes] = React.useState(total % 60);

  // Sync from value when it changes externally (e.g. initial load)
  React.useEffect(() => {
    const t = value ?? 0;
    setHours(Math.floor(t / 60));
    setMinutes(t % 60);
  }, [value]);

  const commit = React.useCallback(
    (h: number, m: number) => {
      const totalMinutes = h * 60 + m;
      if (totalMinutes <= 0) {
        onValueChange(null);
        return;
      }
      onValueChange(totalMinutes);
    },
    [onValueChange]
  );

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
    const h = Math.min(maxHours, v);
    setHours(h);
    commit(h, minutes);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
    const m = Math.min(59, v);
    setMinutes(m);
    commit(hours, m);
  };

  const applyPreset = (presetMinutes: number) => {
    const h = Math.floor(presetMinutes / 60);
    const m = presetMinutes % 60;
    setHours(h);
    setMinutes(m);
    onValueChange(presetMinutes);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Input
            id={id}
            type="number"
            min={0}
            max={maxHours}
            value={hours === 0 ? "" : hours}
            onChange={handleHoursChange}
            placeholder="0"
            className="w-16 text-center"
            disabled={disabled}
            aria-label="Hours"
          />
          <span className="text-sm text-muted-foreground">h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            max={59}
            value={minutes === 0 ? "" : minutes}
            onChange={handleMinutesChange}
            placeholder="0"
            className="w-16 text-center"
            disabled={disabled}
            aria-label="Minutes"
          />
          <span className="text-sm text-muted-foreground">min</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <Button
            key={preset.minutes}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => applyPreset(preset.minutes)}
            disabled={disabled}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
