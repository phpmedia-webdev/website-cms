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
import { GalleryMediaPicker } from "@/components/galleries/GalleryMediaPicker";
import { TaxonomyAssignmentForContent } from "@/components/taxonomy/TaxonomyAssignmentForContent";
import {
  EventParticipantsResourcesTab,
  type PendingParticipant,
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

interface EventFormClientProps {
  event?: Event | null;
  coverImageUrls?: Record<string, string>;
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

export function EventFormClient({ event, coverImageUrls = {} }: EventFormClientProps) {
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
  const [pendingResourceIds, setPendingResourceIds] = useState<string[]>([]);

  const [recurrencePreset, setRecurrencePreset] = useState<RecurrencePreset>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(null);
  const [recurrenceRuleRaw, setRecurrenceRuleRaw] = useState<string | null>(null);
  const [showOnPublicCalendar, setShowOnPublicCalendar] = useState(false);
  const [showPublicWarning, setShowPublicWarning] = useState(false);

  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickerMedia, setPickerMedia] = useState<Awaited<ReturnType<typeof getMediaWithVariants>>>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only set date/time defaults once for new events; avoid re-running when coverImageUrls changes
  const newEventDefaultsSet = useRef(false);

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
          .filter((m) => m.id.length > 0);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      event_type: showOnPublicCalendar ? "public" : "meeting",
    };

    try {
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
        for (const resourceId of pendingResourceIds) {
          await fetch(`/api/events/${eventId}/resources`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resource_id: resourceId }),
          });
        }
      }
      if (!isEdit && eventId) {
        router.push(`/admin/events/${eventId}/edit`);
      } else {
        router.push("/admin/events");
      }
      router.refresh();
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
      event_type: showOnPublicCalendar ? "public" : "meeting",
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
          <form onSubmit={handleSubmit} className="space-y-4 w-full min-w-0">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="space-y-1">
              <Label htmlFor="title" className="text-sm">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                required
              />
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
            <div className="flex items-center gap-2 py-0.5">
              <Checkbox
                id="is_all_day"
                checked={isAllDay}
                onCheckedChange={(v) => setIsAllDay(!!v)}
              />
              <Label htmlFor="is_all_day" className="cursor-pointer">
                All day
              </Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="recurrence" className="text-sm">Repeats</Label>
              <Select
                value={recurrencePreset}
                onValueChange={(v) => {
                  setRecurrencePreset(v as RecurrencePreset);
                  setRecurrenceRuleRaw(null);
                }}
              >
                <SelectTrigger id="recurrence" className="w-52">
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
                      className="w-40"
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
                />
                {!isAllDay && (
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
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
                />
                {!isAllDay && (
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                )}
              </div>
            </div>
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
                  pendingResourceIds={pendingResourceIds}
                  onPendingResourceIdsChange={setPendingResourceIds}
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
