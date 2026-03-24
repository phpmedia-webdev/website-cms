"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResourceAdmin } from "@/lib/supabase/participants-resources";
import type { CalendarResourceTypeOption } from "@/lib/supabase/settings";
import { formatMinutesAsHoursMinutes } from "@/lib/supabase/projects";
import type { ResourceUsageRow } from "@/lib/resources/resource-usage-analytics";
import { BarChart3, Loader2 } from "lucide-react";

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: localYmd(from), to: localYmd(to) };
}

interface UsagePayload {
  range: { from: string; to: string };
  rows: ResourceUsageRow[];
  methodology: string;
  tasks_attribution_available: boolean;
}

interface ResourceUsageAnalyticsTabProps {
  resources: ResourceAdmin[];
  initialResourceTypes?: CalendarResourceTypeOption[];
}

export function ResourceUsageAnalyticsTab({
  resources,
  initialResourceTypes = [],
}: ResourceUsageAnalyticsTabProps) {
  const defaults = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [typeSlug, setTypeSlug] = useState<string>("__all__");
  const [resourceId, setResourceId] = useState<string>("__all__");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UsagePayload | null>(null);

  const typeOptions = useMemo(() => {
    if (initialResourceTypes.length > 0) return initialResourceTypes;
    return [
      { slug: "room", label: "Room" },
      { slug: "equipment", label: "Equipment" },
      { slug: "video", label: "Video" },
    ];
  }, [initialResourceTypes]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to, limit: "100" });
      if (typeSlug && typeSlug !== "__all__") params.set("resource_type", typeSlug);
      if (resourceId && resourceId !== "__all__") params.set("resource_id", resourceId);
      const res = await fetch(`/api/events/resources/usage?${params.toString()}`);
      const json = (await res.json().catch(() => ({}))) as {
        data?: UsagePayload;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? `Request failed (${res.status})`);
        setData(null);
        return;
      }
      setData(json.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, typeSlug, resourceId]);

  const sortedResources = useMemo(
    () => [...resources].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [resources]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="usage-from">From</Label>
          <Input
            id="usage-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[11rem] font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="usage-to">To</Label>
          <Input
            id="usage-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[11rem] font-mono text-sm"
          />
        </div>
        <div className="min-w-[10rem] flex-1 space-y-1.5">
          <Label>Type</Label>
          <Select value={typeSlug} onValueChange={setTypeSlug}>
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t.slug} value={t.slug}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <Label>Resource</Label>
          <Select value={resourceId} onValueChange={setResourceId}>
            <SelectTrigger>
              <SelectValue placeholder="All resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All resources</SelectItem>
              {sortedResources.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </>
          ) : (
            <>
              <BarChart3 className="mr-2 h-4 w-4" />
              Run report
            </>
          )}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!data && !loading && !error ? (
        <p className="text-sm text-muted-foreground">
          Choose a date range and click <strong>Run report</strong> to load usage estimates.
        </p>
      ) : null}

      {data?.tasks_attribution_available === false ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          Task time could not be loaded (permissions or schema). Event-based minutes still show if
          available.
        </p>
      ) : null}

      {data && data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No usage in this range for the selected filters (or no resources assigned to events/tasks with
          time in range).
        </p>
      ) : null}

      {data && data.rows.length > 0 ? (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">#</th>
                  <th className="p-3 text-left font-medium">Resource</th>
                  <th className="p-3 text-left font-medium">Type</th>
                  <th className="p-3 text-right font-medium">Events (est.)</th>
                  <th className="p-3 text-right font-medium">Tasks (est.)</th>
                  <th className="p-3 text-right font-medium">Total (est.)</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={row.resource_id} className="border-t border-border">
                    <td className="p-3 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-muted-foreground">{row.resource_type}</td>
                    <td className="p-3 text-right font-mono tabular-nums">
                      {formatMinutesAsHoursMinutes(Math.round(row.minutes_from_events))}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums">
                      {formatMinutesAsHoursMinutes(Math.round(row.minutes_from_tasks))}
                    </td>
                    <td className="p-3 text-right font-mono font-medium tabular-nums">
                      {formatMinutesAsHoursMinutes(Math.round(row.minutes_total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{data.methodology}</p>
        </div>
      ) : null}
    </div>
  );
}
