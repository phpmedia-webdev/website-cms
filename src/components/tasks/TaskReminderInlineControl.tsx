"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type ReminderMethod = "email" | "sms" | "notification";
type ReminderUnit = "minutes" | "hours" | "days";
type ReminderData = {
  offset_value: number;
  offset_unit: ReminderUnit;
  methods: ReminderMethod[];
  is_active: boolean;
};

const DEFAULT_REMINDER: ReminderData = {
  offset_value: 1,
  offset_unit: "days",
  methods: ["notification"],
  is_active: false,
};

export function TaskReminderInlineControl({
  taskId,
  dueDate,
}: {
  taskId: string;
  dueDate: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminder, setReminder] = useState<ReminderData>(DEFAULT_REMINDER);

  const loadReminder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/reminder`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as {
        data?: {
          offset_value?: number;
          offset_unit?: ReminderUnit;
          methods?: ReminderMethod[];
          is_active?: boolean;
        } | null;
      };
      if (!res.ok) throw new Error("Failed to load reminder");
      const data = json.data;
      if (!data) {
        setReminder(DEFAULT_REMINDER);
        return;
      }
      setReminder({
        offset_value: Math.max(1, Number(data.offset_value ?? 1)),
        offset_unit:
          data.offset_unit === "minutes" || data.offset_unit === "hours" || data.offset_unit === "days"
            ? data.offset_unit
            : "days",
        methods: Array.isArray(data.methods)
          ? data.methods.filter((m): m is ReminderMethod =>
              m === "email" || m === "sms" || m === "notification"
            )
          : ["notification"],
        is_active: data.is_active === true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reminder");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadReminder();
  }, [loadReminder]);

  const hasDueDate = useMemo(() => !!dueDate?.trim(), [dueDate]);
  const active = reminder.is_active;

  const saveReminder = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/reminder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offset_value: reminder.offset_value,
          offset_unit: reminder.offset_unit,
          methods: reminder.methods,
          is_active: true,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { offset_value?: number; offset_unit?: ReminderUnit; methods?: ReminderMethod[]; is_active?: boolean };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to save reminder");
      setReminder((prev) => ({
        ...prev,
        offset_value: Number(json.data?.offset_value ?? prev.offset_value),
        offset_unit:
          json.data?.offset_unit === "minutes" ||
          json.data?.offset_unit === "hours" ||
          json.data?.offset_unit === "days"
            ? json.data.offset_unit
            : prev.offset_unit,
        methods: Array.isArray(json.data?.methods)
          ? json.data.methods.filter((m): m is ReminderMethod =>
              m === "email" || m === "sms" || m === "notification"
            )
          : prev.methods,
        is_active: json.data?.is_active === true,
      }));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save reminder");
    } finally {
      setSaving(false);
    }
  }, [taskId, reminder]);

  const turnOffReminder = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/reminder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offset_value: reminder.offset_value,
          offset_unit: reminder.offset_unit,
          methods: reminder.methods,
          is_active: false,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to disable reminder");
      setReminder((prev) => ({ ...prev, is_active: false }));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disable reminder");
    } finally {
      setSaving(false);
    }
  }, [taskId, reminder]);

  if (!hasDueDate) {
    return <span className="text-xs italic text-muted-foreground">Set due date to add reminder</span>;
  }

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen(true)}
        className={[
          "text-xs italic underline-offset-4 hover:underline",
          active ? "text-foreground" : "text-muted-foreground",
        ].join(" ")}
      >
        {active ? "Reminder Active" : "Add Reminder"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Task Reminder</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div>
                <Label htmlFor="task-reminder-offset">Remind me</Label>
                <Input
                  id="task-reminder-offset"
                  type="number"
                  min={1}
                  max={365}
                  value={reminder.offset_value}
                  onChange={(e) =>
                    setReminder((prev) => ({
                      ...prev,
                      offset_value: Math.max(1, Math.min(365, Number(e.target.value || 1))),
                    }))
                  }
                />
              </div>
              <div className="pb-2 text-sm text-muted-foreground">before</div>
              <div>
                <Label htmlFor="task-reminder-unit">Unit</Label>
                <Select
                  value={reminder.offset_unit}
                  onValueChange={(v) =>
                    setReminder((prev) => ({
                      ...prev,
                      offset_unit: v === "minutes" || v === "hours" || v === "days" ? v : "days",
                    }))
                  }
                >
                  <SelectTrigger id="task-reminder-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Methods</Label>
              <div className="mt-2 flex flex-wrap gap-4">
                {(["email", "sms", "notification"] as ReminderMethod[]).map((method) => {
                  const checked = reminder.methods.includes(method);
                  return (
                    <label key={method} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = !!v;
                          setReminder((prev) => {
                            const set = new Set(prev.methods);
                            if (next) set.add(method);
                            else set.delete(method);
                            const methods = [...set].filter(
                              (m): m is ReminderMethod => m === "email" || m === "sms" || m === "notification"
                            );
                            return { ...prev, methods };
                          });
                        }}
                      />
                      <span className="capitalize">{method}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={turnOffReminder} disabled={saving || !active}>
              Turn Off
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={saveReminder} disabled={saving}>
                Save Reminder
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

