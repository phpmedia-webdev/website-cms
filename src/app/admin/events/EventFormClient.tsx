"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectEventLinkCombobox } from "@/components/events/ProjectEventLinkCombobox";
import { GalleryMediaPicker } from "@/components/galleries/GalleryMediaPicker";
import { TaxonomyAssignmentForContent } from "@/components/taxonomy/TaxonomyAssignmentForContent";
import {
  EventParticipantsResourcesTab,
  type PendingParticipant,
  type PendingResourceAssignment,
  type ParticipantsSnapshotItem,
} from "@/components/events/EventParticipantsResourcesTab";
import { getMediaWithVariants } from "@/lib/supabase/media";
import { setTaxonomyForContent } from "@/lib/supabase/taxonomy";
import { ArrowLeft, Copy, ImageIcon, Trash2, X } from "lucide-react";
import type { Event } from "@/lib/supabase/events";
import {
  buildRecurrenceRule,
  parseRecurrenceRule,
  RECURRENCE_PRESETS,
  type RecurrencePreset,
} from "@/lib/recurrenceForm";
import {
  DEFAULT_EVENT_TYPE_COLOR,
  normalizeHex,
} from "@/lib/event-type-colors";
import { cn } from "@/lib/utils";

interface EventFormClientProps {
  event?: Event | null;
  coverImageUrls?: Record<string, string>;
  initialProjectId?: string | null;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type EventTypeOption = { slug: string; label: string; color?: string | null };

function hexForEventTypeOption(t: EventTypeOption | undefined): string {
  if (t?.color && String(t.color).trim()) return normalizeHex(String(t.color));
  return DEFAULT_EVENT_TYPE_COLOR;
}

function hexForEventTypeSlug(slug: string, options: EventTypeOption[]): string {
  const row = options.find((o) => o.slug === slug);
  return hexForEventTypeOption(row);
}

function pickDefaultEventTypeSlug(
  options: EventTypeOption[],
  stored: string | null | undefined
): string {
  if (stored && options.some((o) => o.slug === stored)) return stored;
  const meeting = options.find((o) => o.slug === "meeting");
  if (meeting) return meeting.slug;
  return options[0]?.slug ?? "meeting";
}

/** Required indicator next to labels (bold red asterisk). Inputs keep native `required` for validation/a11y. */
function RequiredFieldMark() {
  return (
    <span
      className="ml-0.5 inline-block align-super text-lg font-bold leading-none text-destructive"
      aria-hidden
    >
      *
    </span>
  );
}

function parseToISO(
  dateStr: string,
  timeStr: string | null,
  isAllDay: boolean,
  isEnd: boolean = false
): string {
  if (isAllDay) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const h = isEnd ? 23 : 0;
    const min = isEnd ? 59 : 0;
    return new Date(Date.UTC(y, m - 1, d, h, min, isEnd ? 59 : 0)).toISOString();
  }
  if (timeStr) {
    return new Date(`${dateStr}T${timeStr}`).toISOString();
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0).toISOString();
}

export function EventFormClient({
  event,
  coverImageUrls = {},
  initialProjectId = null,
}: EventFormClientProps) {
  const router = useRouter();
  const isEdit = !!event;

  const [title, setTitle] = useState(event?.title ?? "");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(event?.is_all_day ?? false);
  const [location, setLocation] = useState(event?.location ?? "");
  const [linkUrl, setLinkUrl] = useState((event as { link_url?: string | null })?.link_url ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    (event?.status as "draft" | "published") ?? "published"
  );
  const [coverImageId, setCoverImageId] = useState<string | null>(
    (event as { cover_image_id?: string | null })?.cover_image_id ?? null
  );
  const [coverImagePreviewUrl, setCoverImagePreviewUrl] = useState<string | null>(null);

  const [accessLevel, setAccessLevel] = useState<"public" | "members" | "mag" | "private">(
    (event?.access_level as "public" | "members" | "mag" | "private") ?? "public"
  );
  const [requiredMagId, setRequiredMagId] = useState<string | null>(
    event?.required_mag_id ?? null
  );
  const [availableMags, setAvailableMags] = useState<{ id: string; name: string; uid: string }[]>([]);

  const [taxonomyCategoryIds, setTaxonomyCategoryIds] = useState<Set<string>>(new Set());
  const [taxonomyTagIds, setTaxonomyTagIds] = useState<Set<string>>(new Set());
  const [pendingParticipants, setPendingParticipants] = useState<PendingParticipant[]>([]);
  const [pendingResourceAssignments, setPendingResourceAssignments] = useState<
    PendingResourceAssignment[]
  >([]);

  const [recurrencePreset, setRecurrencePreset] = useState<RecurrencePreset>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(null);
  const [recurrenceRuleRaw, setRecurrenceRuleRaw] = useState<string | null>(null);
  const [showOnPublicCalendar, setShowOnPublicCalendar] = useState(false);
  const [showPublicWarning, setShowPublicWarning] = useState(false);

  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [eventTypeSlug, setEventTypeSlug] = useState<string>("meeting");
  /** New event: large chip stays neutral until user picks a type; edit/detail always shows type color. */
  const [eventTypePickerInteracted, setEventTypePickerInteracted] = useState(!!event);

  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickerMedia, setPickerMedia] = useState<Awaited<ReturnType<typeof getMediaWithVariants>>>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [participantsForConflictCheck, setParticipantsForConflictCheck] = useState<
    ParticipantsSnapshotItem[]
  >([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictList, setConflictList] = useState<
    { eventId: string; title: string; start_date: string; end_date: string }[]
  >([]);
  const [resourceConflictList, setResourceConflictList] = useState<
    {
      eventId: string;
      title: string;
      start_date: string;
      end_date: string;
      resource_id: string;
      resource_name: string;
    }[]
  >([]);

  const [projectId, setProjectId] = useState<string | null>(
    (event as { project_id?: string | null })?.project_id ?? initialProjectId
  );

  // Only set date/time defaults once for new events; avoid re-running when coverImageUrls changes
  const newEventDefaultsSet = useRef(false);
  const skipConflictCheckRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (event) {
      newEventDefaultsSet.current = false;
      setTitle(event.title);
      setStartDate(toDateLocal(event.start_date));
      setStartTime(event.is_all_day ? "" : toDatetimeLocal(event.start_date).split("T")[1] ?? "");
      setEndDate(toDateLocal(event.end_date));
      setEndTime(event.is_all_day ? "" : toDatetimeLocal(event.end_date).split("T")[1] ?? "");
      setIsAllDay(event.is_all_day);
      setLocation(event.location ?? "");
      setLinkUrl((event as { link_url?: string | null }).link_url ?? "");
      setDescription(event.description ?? "");
      setStatus((event.status as "draft" | "published") || "published");
      const cid = (event as { cover_image_id?: string | null }).cover_image_id ?? null;
      setCoverImageId(cid);
      setCoverImagePreviewUrl(cid ? coverImageUrls[cid] ?? null : null);
      setAccessLevel((event.access_level as "public" | "members" | "mag" | "private") ?? "public");
      setRequiredMagId(event.required_mag_id ?? null);
      setShowOnPublicCalendar(event.visibility === "public");
      setProjectId((event as { project_id?: string | null }).project_id ?? null);
      const parsed = parseRecurrenceRule(event.recurrence_rule ?? null);
      setRecurrencePreset(parsed.preset);
      setRecurrenceEndDate(parsed.endDate);
      setRecurrenceRuleRaw(parsed.rawRule);
    } else if (!newEventDefaultsSet.current) {
      // Set defaults once after mount so we don't overwrite user input on re-renders
      const id = setTimeout(() => {
        newEventDefaultsSet.current = true;
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        setStartDate(today);
        setStartTime(time);
        setEndDate(today);
        setEndTime(time);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [event, coverImageUrls]);

  /** Load resource assignments into draft when editing (applied on Save with PUT). */
  useEffect(() => {
    if (!event?.id) {
      setPendingResourceAssignments([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/events/${event.id}/resources`)
      .then((r) => (r.ok ? r.json() : Promise.resolve({})))
      .then((j: { data?: { assignments?: unknown[] } }) => {
        if (cancelled) return;
        const raw = j?.data?.assignments;
        if (!Array.isArray(raw)) {
          setPendingResourceAssignments([]);
          return;
        }
        const rows: PendingResourceAssignment[] = raw
          .filter(
            (x): x is { resource_id: string; bundle_instance_id?: string | null } =>
              x != null &&
              typeof x === "object" &&
              typeof (x as { resource_id?: string }).resource_id === "string"
          )
          .map((x) => ({
            resource_id: String(x.resource_id).trim(),
            bundle_instance_id:
              typeof x.bundle_instance_id === "string" && x.bundle_instance_id.trim()
                ? x.bundle_instance_id.trim()
                : null,
          }));
        setPendingResourceAssignments(rows);
      })
      .catch(() => {
        if (!cancelled) setPendingResourceAssignments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [event?.id]);

  useEffect(() => {
    fetch("/api/settings/customizer?scope=event_type")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        const raw = Array.isArray(data) ? data : [];
        setEventTypes(
          raw
            .map((row: Record<string, unknown>) => {
              const colorRaw = row.color;
              const color =
                colorRaw != null && String(colorRaw).trim()
                  ? String(colorRaw).trim()
                  : null;
              return {
                slug: String(row.slug ?? "").trim(),
                label: String(row.label ?? row.slug ?? "").trim() || String(row.slug ?? ""),
                color,
              };
            })
            .filter((o: EventTypeOption) => o.slug.length > 0)
        );
      })
      .catch(() => setEventTypes([]));
  }, []);

  useEffect(() => {
    if (eventTypes.length === 0) return;
    setEventTypeSlug((prev) => {
      const fromEvent = event?.event_type;
      const candidate = fromEvent ?? prev;
      if (candidate && eventTypes.some((o) => o.slug === candidate)) return candidate;
      return pickDefaultEventTypeSlug(eventTypes, fromEvent);
    });
  }, [event?.id, event?.event_type, eventTypes]);

  useEffect(() => {
    if (event) setEventTypePickerInteracted(true);
  }, [event?.id]);

  useEffect(() => {
    fetch("/api/crm/mags")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const raw = Array.isArray(data) ? data : (data?.mags ?? []);
        const normalized = raw
          .map((m: Record<string, unknown>) => ({
            id: String(m?.id ?? m?.mag_id ?? ""),
            name: String(m?.name ?? ""),
            uid: String(m?.uid ?? ""),
          }))
          .filter((m: { id: string }) => m.id.length > 0);
        setAvailableMags(normalized);
      })
      .catch(() => setAvailableMags([]));
  }, []);

  const handleTaxonomyInitialLoad = useCallback(({ categoryIds, tagIds }: { categoryIds: string[]; tagIds: string[] }) => {
    setTaxonomyCategoryIds(new Set(categoryIds));
    setTaxonomyTagIds(new Set(tagIds));
  }, []);

  const handleCategoryToggle = useCallback((id: string, checked: boolean) => {
    setTaxonomyCategoryIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleTagToggle = useCallback((id: string, checked: boolean) => {
    setTaxonomyTagIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (showImagePicker) {
      setPickerLoading(true);
      getMediaWithVariants()
        .then(setPickerMedia)
        .catch(() => setPickerMedia([]))
        .finally(() => setPickerLoading(false));
    }
  }, [showImagePicker]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    // Defensive: HTML5 validation normally blocks submit before onSubmit; if this still runs invalid, bail without API/nav.
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setError(null);
    setSaving(true);

    const startISO = parseToISO(startDate, isAllDay ? null : startTime, isAllDay, false);
    const endISO = isAllDay
      ? parseToISO(endDate, null, true, true)
      : parseToISO(endDate, endTime || "23:59", false);

    if (new Date(startISO) > new Date(endISO)) {
      setError("Start must be before end");
      setSaving(false);
      return;
    }

    const payload = {
      title: title.trim(),
      start_date: startISO,
      end_date: endISO,
      is_all_day: isAllDay,
      location: location.trim() || null,
      link_url: linkUrl.trim() || null,
      description: description.trim() || null,
      status,
      recurrence_rule:
        recurrenceRuleRaw ?? buildRecurrenceRule(recurrencePreset, recurrenceEndDate) ?? undefined,
      cover_image_id: coverImageId,
      access_level: accessLevel,
      required_mag_id: accessLevel === "mag" && requiredMagId ? requiredMagId : null,
      visibility: showOnPublicCalendar ? "public" : "private",
      event_type: eventTypeSlug.trim() || "meeting",
      project_id: projectId || null,
    };

    try {
      const conflictResourceIds = [
        ...new Set(pendingResourceAssignments.map((a) => a.resource_id).filter(Boolean)),
      ];
      const runSchedulingConflictCheck =
        !skipConflictCheckRef.current &&
        (participantsForConflictCheck.length > 0 || conflictResourceIds.length > 0);

      if (runSchedulingConflictCheck) {
        const conflictRes = await fetch("/api/events/check-conflicts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_date: startISO,
            end_date: endISO,
            participants: participantsForConflictCheck,
            resource_ids: conflictResourceIds,
            exclude_event_id: event?.id ?? undefined,
          }),
        });
        const conflictData = await conflictRes.json().catch(() => ({}));
        const conflicts = Array.isArray(conflictData?.conflicts)
          ? conflictData.conflicts
          : [];
        const resource_conflicts = Array.isArray(conflictData?.resource_conflicts)
          ? conflictData.resource_conflicts
          : [];
        if (conflicts.length > 0 || resource_conflicts.length > 0) {
          setConflictList(conflicts);
          setResourceConflictList(resource_conflicts);
          setShowConflictDialog(true);
          setSaving(false);
          return;
        }
      }
      skipConflictCheckRef.current = false;

      let eventId: string | null = null;
      if (isEdit && event) {
        const res = await fetch(`/api/events/${event.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Update failed");
        }
        eventId = event.id;
      } else {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Create failed");
        }
        const json = await res.json();
        eventId = json?.data?.id ?? null;
      }
      if (eventId) {
        const termIds = [...taxonomyCategoryIds, ...taxonomyTagIds];
        await setTaxonomyForContent(eventId, "event", termIds);
        for (const p of pendingParticipants) {
          await fetch(`/api/events/${eventId}/participants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source_type: p.source_type, source_id: p.source_id }),
          });
        }
        const resPut = await fetch(`/api/events/${eventId}/resources`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments: pendingResourceAssignments }),
        });
        if (!resPut.ok) {
          const errBody = await resPut.json().catch(() => ({}));
          throw new Error(errBody.error ?? "Failed to save resource assignments");
        }
      }
      if (!isEdit && eventId) {
        // New event: return to calendar (same as after editing). Avoid landing on another full-page form.
        router.replace("/admin/events");
        router.refresh();
      } else if (isEdit) {
        router.push("/admin/events");
        router.refresh();
      } else {
        // New event but no id in response (should not happen after 201); stay on page
        setError("Event could not be created (no id returned). Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyAsNew = async () => {
    if (!event) return;
    setError(null);
    setCopying(true);
    const startISO = parseToISO(startDate, isAllDay ? null : startTime, isAllDay, false);
    const endISO = isAllDay
      ? parseToISO(endDate, null, true, true)
      : parseToISO(endDate, endTime || "23:59", false);
    if (new Date(startISO) > new Date(endISO)) {
      setError("Start must be before end");
      setCopying(false);
      return;
    }
    const payload = {
      title: title.trim(),
      start_date: startISO,
      end_date: endISO,
      is_all_day: isAllDay,
      location: location.trim() || null,
      link_url: linkUrl.trim() || null,
      description: description.trim() || null,
      status: "draft" as const,
      recurrence_rule:
        recurrenceRuleRaw ?? buildRecurrenceRule(recurrencePreset, recurrenceEndDate) ?? undefined,
      cover_image_id: coverImageId,
      access_level: accessLevel,
      required_mag_id: accessLevel === "mag" && requiredMagId ? requiredMagId : null,
      visibility: showOnPublicCalendar ? "public" : "private",
      event_type: eventTypeSlug.trim() || "meeting",
      project_id: projectId || null,
    };
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Copy failed");
      }
      const json = await res.json();
      const newId = json?.data?.id ?? null;
      if (newId) {
        router.push(`/admin/events/${newId}/edit`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copy failed");
    } finally {
      setCopying(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      setShowDeleteConfirm(false);
      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/events"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calendar
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex flex-row items-center justify-between w-full gap-4">
            <CardTitle className="text-lg">{isEdit ? "Edit Event" : "Add Event"}</CardTitle>
            <div className="flex items-center gap-3 shrink-0">
              {isEdit && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAsNew}
                    disabled={copying || saving || deleting}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {copying ? "Copying…" : "Copy as new"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={copying || saving || deleting}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <span className="text-muted-foreground" aria-hidden="true">|</span>
                </>
              )}
              <div className="flex items-center gap-2">
                <Label htmlFor="status" className="text-sm font-medium text-muted-foreground">Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "draft" | "published")
                  }
                  className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <span className="text-muted-foreground" aria-hidden="true">|</span>
              <div className="flex items-center gap-2">
                <Label htmlFor="show-on-public" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Show on public calendar
                </Label>
                <Switch
                  id="show-on-public"
                  checked={showOnPublicCalendar}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setShowPublicWarning(true);
                    } else {
                      setShowOnPublicCalendar(false);
                    }
                  }}
                  aria-label="Show on public calendar"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-4 pb-4">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 w-full min-w-0">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="space-y-1">
              <Label htmlFor="title" className="text-sm inline-flex items-center gap-1.5">
                Title
                <RequiredFieldMark />
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
              <div className="space-y-1 min-w-0">
                <Label htmlFor="event-type" className="text-sm inline-flex items-center gap-1.5">
                  Event type
                  <RequiredFieldMark />
                </Label>
                {eventTypes.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-md border-2 border-border shadow-sm ring-1 ring-black/5 dark:ring-white/10",
                        !event && !eventTypePickerInteracted && "bg-muted"
                      )}
                      style={
                        event || eventTypePickerInteracted
                          ? { backgroundColor: hexForEventTypeSlug(eventTypeSlug, eventTypes) }
                          : undefined
                      }
                      title={
                        event || eventTypePickerInteracted
                          ? `Event type color (${eventTypeSlug})`
                          : "Choose an event type to preview its color"
                      }
                      aria-hidden
                    />
                    <Select
                      value={eventTypeSlug}
                      onValueChange={(v) => {
                        setEventTypePickerInteracted(true);
                        setEventTypeSlug(v);
                      }}
                    >
                      <SelectTrigger id="event-type" className="h-9 min-w-0 flex-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map((t) => (
                          <SelectItem key={t.slug} value={t.slug} textValue={t.label}>
                            <span className="flex items-center gap-2">
                              <span
                                className="size-2.5 shrink-0 rounded-full border border-black/15 dark:border-white/25"
                                style={{ backgroundColor: hexForEventTypeOption(t) }}
                                aria-hidden
                              />
                              {t.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No event types in Customizer yet. Defaults to &quot;meeting&quot; until you add types under{" "}
                    <Link href="/admin/settings/customizer?tab=events" className="underline hover:text-foreground">
                      Settings → Customizer → Events
                    </Link>
                    .
                  </p>
                )}
              </div>
              <div className="space-y-1 min-w-0">
                <Label htmlFor="event-project" className="text-sm">
                  Project
                </Label>
                <ProjectEventLinkCombobox
                  htmlId="event-project"
                  value={projectId}
                  onValueChange={setProjectId}
                  disabled={saving || copying || deleting}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description" className="text-sm">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details"
                rows={3}
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Card className="rounded-xl border border-border bg-muted/50 text-card-foreground shadow-none">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <p className="text-sm font-medium leading-none flex items-center gap-1.5">
                  Date &amp; time
                  <RequiredFieldMark />
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_all_day"
                      checked={isAllDay}
                      onCheckedChange={(v) => setIsAllDay(!!v)}
                    />
                    <Label htmlFor="is_all_day" className="cursor-pointer">
                      All day
                    </Label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Label htmlFor="recurrence" className="text-sm shrink-0">
                      Repeats
                    </Label>
                    <Select
                      value={recurrencePreset}
                      onValueChange={(v) => {
                        setRecurrencePreset(v as RecurrencePreset);
                        setRecurrenceRuleRaw(null);
                      }}
                    >
                      <SelectTrigger id="recurrence" className="w-52 bg-background">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_PRESETS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {recurrencePreset !== "none" && (
                  <div className="space-y-1">
                    <Label className="text-sm">End repeat</Label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="recurrence-end"
                          checked={!recurrenceEndDate}
                          onChange={() => setRecurrenceEndDate(null)}
                          className="rounded-full border-input"
                        />
                        Never
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="recurrence-end"
                          checked={!!recurrenceEndDate}
                          onChange={() => {
                            if (!recurrenceEndDate) {
                              const d = new Date();
                              const pad = (n: number) => n.toString().padStart(2, "0");
                              setRecurrenceEndDate(
                                `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
                              );
                            }
                          }}
                          className="rounded-full border-input"
                        />
                        On date
                      </label>
                      {recurrenceEndDate && (
                        <Input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value || null)}
                          className="w-40 bg-background"
                        />
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Start</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="bg-background"
                    />
                    {!isAllDay && (
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="bg-background"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">End</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="bg-background"
                    />
                    {!isAllDay && (
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="bg-background"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="location" className="text-sm">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Venue or address"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="link_url" className="text-sm">Link</Label>
                <Input
                  id="link_url"
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <Dialog open={showPublicWarning} onOpenChange={setShowPublicWarning}>
              <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="text-destructive">Show on public calendar?</DialogTitle>
                  <DialogDescription asChild>
                    <p className="text-sm text-destructive">
                      This event will be visible on the public-facing calendar. Who can view it can still be restricted by memberships. Only turn this on for events you want the public to see.
                    </p>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPublicWarning(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setShowOnPublicCalendar(true);
                      setShowPublicWarning(false);
                    }}
                  >
                    Yes, show on public calendar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card className="bg-muted/40 border-muted">
              <CardContent className="p-4 pt-4">
                <Tabs defaultValue="cover" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="cover">Cover Image</TabsTrigger>
                    <TabsTrigger value="taxonomy">Taxonomy</TabsTrigger>
                    <TabsTrigger value="membership">Memberships</TabsTrigger>
                    <TabsTrigger value="participants-resources">Participants &amp; Resources</TabsTrigger>
                  </TabsList>
                  <TabsContent value="cover" className="space-y-2 pt-4">
                <Label className="text-sm">Cover image</Label>
                <div className="flex items-center gap-2">
                  {coverImageId && (coverImagePreviewUrl ?? coverImageUrls[coverImageId]) ? (
                    <>
                      <div className="relative w-14 h-14 rounded overflow-hidden bg-muted shrink-0">
                        <Image
                          src={coverImagePreviewUrl ?? coverImageUrls[coverImageId]!}
                          alt="Cover"
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowImagePicker(true)}
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCoverImageId(null);
                            setCoverImagePreviewUrl(null);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImagePicker(true)}
                    >
                      <ImageIcon className="h-4 w-4 mr-1" />
                      Choose image
                    </Button>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="taxonomy" className="pt-4">
                <TaxonomyAssignmentForContent
                  contentId={event?.id}
                  contentTypeSlug="event"
                  section="event"
                  sectionLabel="Event"
                  embedded
                  selectedCategoryIds={taxonomyCategoryIds}
                  selectedTagIds={taxonomyTagIds}
                  onCategoryToggle={handleCategoryToggle}
                  onTagToggle={handleTagToggle}
                  onInitialLoad={event?.id ? handleTaxonomyInitialLoad : undefined}
                />
              </TabsContent>
              <TabsContent value="membership" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-sm">Access level</Label>
                  <Select
                    value={accessLevel}
                    onValueChange={(v) => {
                      setAccessLevel(v as "public" | "members" | "mag" | "private");
                      if (v !== "mag") setRequiredMagId(null);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="members">Members only</SelectItem>
                      <SelectItem value="mag">Specific membership</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Control who can see this event. &quot;Specific membership&quot; requires selecting a MAG below.
                  </p>
                </div>
                {accessLevel === "mag" && (
                  <div className="space-y-2">
                    <Label className="text-sm">Required membership</Label>
                    <Select
                      value={requiredMagId ?? ""}
                      onValueChange={(v) => setRequiredMagId(v || null)}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select a membership…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMags.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="participants-resources" className="pt-4">
                <EventParticipantsResourcesTab
                  eventId={event?.id}
                  pendingParticipants={pendingParticipants}
                  onPendingParticipantsChange={setPendingParticipants}
                  pendingResourceAssignments={pendingResourceAssignments}
                  onPendingResourceAssignmentsChange={setPendingResourceAssignments}
                  onParticipantsSnapshot={setParticipantsForConflictCheck}
                />
              </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/events">Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : isEdit ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Image picker modal - only modal, no nested modal */}
      <Dialog open={showImagePicker} onOpenChange={setShowImagePicker}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose cover image</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            <GalleryMediaPicker
              media={pickerMedia}
              loading={pickerLoading}
              mode="cover"
              onSelectCover={(m) => {
                const url = m.variants?.find(
                  (v) => v.variant_type === "thumbnail" || v.variant_type === "original"
                )?.url;
                setCoverImageId(m.id);
                setCoverImagePreviewUrl(url ?? null);
                setShowImagePicker(false);
              }}
              onCancel={() => setShowImagePicker(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showConflictDialog}
        onOpenChange={(open) => {
          setShowConflictDialog(open);
          if (!open) setResourceConflictList([]);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scheduling conflict</DialogTitle>
            <DialogDescription>
              {conflictList.length > 0 && resourceConflictList.length > 0
                ? "Some participants or exclusive resources overlap other events in this time range. Save anyway?"
                : conflictList.length > 0
                  ? "Some participants are already in other events during this time. Save anyway?"
                  : "Some exclusive resources are already booked on other events during this time. Save anyway?"}
            </DialogDescription>
          </DialogHeader>
          {conflictList.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Participants</p>
              <ul className="max-h-40 list-inside list-disc space-y-1 overflow-auto text-sm">
                {conflictList.map((c) => (
                  <li key={`p-${c.eventId}-${c.start_date}`}>
                    {c.title} — {new Date(c.start_date).toLocaleString()} to{" "}
                    {new Date(c.end_date).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {resourceConflictList.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Exclusive resources</p>
              <ul className="max-h-40 list-inside list-disc space-y-1 overflow-auto text-sm">
                {resourceConflictList.map((c) => (
                  <li key={`r-${c.eventId}-${c.resource_id}-${c.start_date}`}>
                    <span className="font-medium">{c.resource_name}</span> — conflicts with{" "}
                    {c.title} ({new Date(c.start_date).toLocaleString()} –{" "}
                    {new Date(c.end_date).toLocaleString()})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConflictDialog(false);
                setResourceConflictList([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                skipConflictCheckRef.current = true;
                setShowConflictDialog(false);
                setResourceConflictList([]);
                formRef.current?.requestSubmit();
              }}
            >
              Save anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete event</DialogTitle>
            <DialogDescription>
              {recurrencePreset !== "none" || event?.recurrence_rule ? (
                <>
                  Past occurrences will be kept as separate one-off events. Future occurrences will be removed. This cannot be undone.
                </>
              ) : (
                <>This cannot be undone.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
