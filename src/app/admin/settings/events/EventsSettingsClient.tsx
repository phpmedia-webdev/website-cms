"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import type { CustomizerOptionRow } from "@/components/settings/CustomizerOptionsTable";
import { CustomizerOptionsTable } from "@/components/settings/CustomizerOptionsTable";

const SCOPE_EVENT_TYPE = "event_type";

interface EventsSettingsClientProps {
  isSuperadmin?: boolean;
  initialEventTypes: CustomizerOptionRow[];
}

export function EventsSettingsClient({
  isSuperadmin = false,
  initialEventTypes,
}: EventsSettingsClientProps) {
  const [eventTypes, setEventTypes] = useState<CustomizerOptionRow[]>(initialEventTypes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/customizer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: SCOPE_EVENT_TYPE,
          items: eventTypes.map((i) => ({
            slug: i.slug.trim().toLowerCase().replace(/\s+/g, "-"),
            label: i.label.trim(),
            color: i.color ?? null,
            is_core: !!i.is_core,
          })),
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const validateSlugLabel = (items: CustomizerOptionRow[]) => {
    const valid = items.every((i) => i.slug.trim() && i.label.trim());
    if (!valid) return false;
    const slugs = items.map((i) => i.slug.trim().toLowerCase().replace(/\s+/g, "-"));
    return new Set(slugs).size === slugs.length;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <CardDescription className="mb-4">
          Define event types for calendar events (e.g., Meeting, Webinar, Deadline). These appear when creating or editing an event. Order shown is the order in the picker.
        </CardDescription>
        <CustomizerOptionsTable
          scope={SCOPE_EVENT_TYPE}
          items={eventTypes}
          onItemsChange={(next) => {
            setEventTypes(next);
            setSaved(false);
          }}
          onSave={handleSave}
          saving={saving}
          saved={saved}
          isSuperadmin={isSuperadmin}
          showColor={true}
          addButtonLabel="Add type"
          saveButtonLabel="Save event types"
          emptyLabel="No event types defined"
          getDefaultItem={() => ({ slug: "", label: "", color: "#6b7280", is_core: false })}
          validateForSave={validateSlugLabel}
        />
      </CardContent>
    </Card>
  );
}
