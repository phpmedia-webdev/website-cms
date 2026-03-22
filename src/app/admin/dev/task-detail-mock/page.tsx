"use client";

/**
 * MOCK ONLY — Task detail layout exploration. No API, no DB, no shared task libs.
 * Visit: /admin/dev/task-detail-mock
 */

import * as React from "react";
import { DurationPicker } from "@/components/ui/duration-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function formatMinutesTotal(minutes: number): string {
  if (minutes <= 0) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} h`);
  if (m > 0 || parts.length === 0) parts.push(`${m} min`);
  return parts.join(" ");
}

const MOCK_ASSIGNEES = [
  { id: "1", initials: "JD", name: "Jordan Doe", color: "bg-violet-500" },
  { id: "2", initials: "AK", name: "Alex Kim", color: "bg-sky-500" },
  { id: "3", initials: "MR", name: "Morgan Reed", color: "bg-emerald-500" },
];

const MOCK_RESOURCES = [
  { id: "cam-1", label: "Camera — Sony FX3" },
  { id: "cam-2", label: "Camera — Canon R5" },
  { id: "light-1", label: "Lighting kit (3-point)" },
  { id: "tripod-1", label: "Tripod — Manfrotto" },
  { id: "audio-1", label: "Audio — Zoom H6 + lav" },
  { id: "eq-1", label: "Equipment — Gimbal RS3" },
];

type TimeEntry = { id: string; at: string; message: string; minutes: number };
type Comment = { id: string; at: string; author: string; initials: string; body: string };

function AvatarCircle({
  initials,
  className,
  title,
}: {
  initials: string;
  className?: string;
  title?: string;
}) {
  return (
    <div
      title={title}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-background",
        className
      )}
    >
      {initials}
    </div>
  );
}

export default function TaskDetailMockPage() {
  const [estimatedMinutes, setEstimatedMinutes] = React.useState<number | null>(195);
  const [timeLogMinutes, setTimeLogMinutes] = React.useState("30");
  const [timeLogMessage, setTimeLogMessage] = React.useState("");
  const [timeEntries, setTimeEntries] = React.useState<TimeEntry[]>([
    { id: "e1", at: "2026-03-14T10:15:00", message: "Initial triage & repro steps", minutes: 45 },
    { id: "e2", at: "2026-03-14T11:40:00", message: "Client call — scope clarified", minutes: 30 },
    { id: "e3", at: "2026-03-14T14:05:00", message: "Draft fix on staging", minutes: 90 },
  ]);
  const [comments, setComments] = React.useState<Comment[]>([
    {
      id: "c1",
      at: "2026-03-14T09:00:00",
      author: "Jordan Doe",
      initials: "JD",
      body: "Customer reports checkout timeout on mobile Safari — attached HAR in ticket.",
    },
    {
      id: "c2",
      at: "2026-03-14T09:22:00",
      author: "Alex Kim",
      initials: "AK",
      body: "Reproduced on iOS 18. Can we bump priority if this blocks their launch Friday?",
    },
  ]);
  const [commentDraft, setCommentDraft] = React.useState("");
  const [selectedResources, setSelectedResources] = React.useState<Record<string, boolean>>({
    "cam-1": true,
    "light-1": true,
  });

  const totalLoggedMinutes = timeEntries.reduce((s, e) => s + e.minutes, 0);

  const addTimeEntry = () => {
    const mins = Math.max(0, parseInt(timeLogMinutes, 10) || 0);
    const msg = timeLogMessage.trim() || "Time logged";
    setTimeEntries((prev) => [
      {
        id: `e-${Date.now()}`,
        at: new Date().toISOString(),
        message: msg,
        minutes: mins,
      },
      ...prev,
    ]);
    setTimeLogMessage("");
  };

  const addComment = () => {
    const body = commentDraft.trim();
    if (!body) return;
    setComments((prev) => [
      {
        id: `c-${Date.now()}`,
        at: new Date().toISOString(),
        author: "You (mock)",
        initials: "YO",
        body,
      },
      ...prev,
    ]);
    setCommentDraft("");
  };

  const setResourceChecked = (id: string, checked: boolean) => {
    setSelectedResources((prev) => ({ ...prev, [id]: checked }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 pb-16">
      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
        <strong>Mock layout only</strong> — no data is saved. Safe to iterate on structure and copy. Route:{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">/admin/dev/task-detail-mock</code>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Main column */}
        <div className="min-w-0 flex-1 space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Task</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Fix mobile Safari checkout timeout on staging
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Reference ID for support / linking:{" "}
              <span className="font-mono text-foreground">TSK-2026-0842</span>
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Description</CardTitle>
              <CardDescription>Rich text would go here in production (Tiptap or similar).</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                className="min-h-[120px] resize-none bg-muted/30"
                defaultValue={`Steps:\n1. Open checkout on iPhone Safari\n2. Fill cart and proceed to payment\n3. Spinner hangs > 60s\n\nExpected: redirect to confirmation.\nActual: silent failure after payment intent.`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fields</CardTitle>
              <CardDescription>Type, status, phase, and schedule (mock controls).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select defaultValue="support">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Support ticket</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue="in_progress">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Phase (grouping labels)</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Discovery</Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    + Add phase
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mock-start">Start date</Label>
                <Input id="mock-start" type="date" defaultValue="2026-03-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mock-due">Due date</Label>
                <Input id="mock-due" type="date" defaultValue="2026-03-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estimated task time</CardTitle>
              <CardDescription>
                Picker uses hours + minutes; detail shows total as minutes (and readable breakdown).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <DurationPicker
                label="Estimate (hours & minutes)"
                value={estimatedMinutes}
                onValueChange={setEstimatedMinutes}
                id="mock-estimate"
              />
              <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                <p className="text-muted-foreground">Shown on detail</p>
                <p className="text-lg font-semibold tabular-nums">
                  {estimatedMinutes != null ? `${estimatedMinutes} minutes` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {estimatedMinutes != null ? `(${formatMinutesTotal(estimatedMinutes)})` : "Not set"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Total time logged</CardTitle>
              <CardDescription>Sum of time log entries below (calculated in UI).</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatMinutesTotal(totalLoggedMinutes)}</p>
              <p className="text-xs text-muted-foreground">
                {totalLoggedMinutes} minutes total · compare to estimate of{" "}
                {estimatedMinutes ?? "—"} min
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Time log</CardTitle>
              <CardDescription>Timestamped entries with a short note (mock: stored in component state only).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 sm:flex-row sm:items-end">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tl-mins">Minutes for this entry</Label>
                    <Input
                      id="tl-mins"
                      type="number"
                      min={0}
                      value={timeLogMinutes}
                      onChange={(e) => setTimeLogMinutes(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="tl-msg">Short message</Label>
                    <Input
                      id="tl-msg"
                      placeholder="e.g. Code review with client"
                      value={timeLogMessage}
                      onChange={(e) => setTimeLogMessage(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="button" onClick={addTimeEntry}>
                  Add entry
                </Button>
              </div>
              <ul className="space-y-2">
                {timeEntries.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground tabular-nums">
                      {new Date(e.at).toLocaleString()}
                    </span>
                    <span className="min-w-0 flex-1 font-medium">{e.message}</span>
                    <Badge variant="secondary" className="tabular-nums">
                      {e.minutes} min
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Comment thread</CardTitle>
              <CardDescription>Threaded discussion (mock — newest first).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comment-body">Add comment</Label>
                <Textarea
                  id="comment-body"
                  placeholder="Write a comment…"
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button type="button" size="sm" onClick={addComment}>
                  Post comment
                </Button>
              </div>
              <ul className="space-y-3 border-t pt-4">
                {comments.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <AvatarCircle
                      initials={c.initials}
                      className="bg-primary"
                      title={c.author}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{c.author}</span>
                        <span>·</span>
                        <time dateTime={c.at}>{new Date(c.at).toLocaleString()}</time>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="w-full shrink-0 space-y-4 lg:w-80">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Task ID #</CardTitle>
              <CardDescription className="text-xs">Support / task reference</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-lg font-semibold tracking-tight">TSK-2026-0842</p>
              <p className="mt-1 text-xs text-muted-foreground">Use in emails, invoices, and ticket bridges.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Assignees</CardTitle>
              <CardDescription className="text-xs">Small circle avatars</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex -space-x-2">
                {MOCK_ASSIGNEES.map((a) => (
                  <AvatarCircle key={a.id} initials={a.initials} className={a.color} title={a.name} />
                ))}
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted/50 text-xs font-medium text-muted-foreground ring-2 ring-background hover:bg-muted"
                  title="Add assignee"
                >
                  +
                </button>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {MOCK_ASSIGNEES.map((a) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resources</CardTitle>
              <CardDescription className="text-xs">Track time / usage against gear & equipment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Picklist (mock). Production would load from your resource registry.
              </p>
              <ul className="space-y-2">
                {MOCK_RESOURCES.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`res-${r.id}`}
                      checked={!!selectedResources[r.id]}
                      onCheckedChange={(v) => setResourceChecked(r.id, v === true)}
                    />
                    <label htmlFor={`res-${r.id}`} className="cursor-pointer text-sm leading-none">
                      {r.label}
                    </label>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
