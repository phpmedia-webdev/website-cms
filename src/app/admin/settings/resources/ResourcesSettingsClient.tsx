"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import type { CustomizerOptionRow } from "@/components/settings/CustomizerOptionsTable";
import { CustomizerOptionsTable } from "@/components/settings/CustomizerOptionsTable";

const SCOPE_RESOURCE_TYPE = "resource_type";

interface ResourcesSettingsClientProps {
  isSuperadmin?: boolean;
  initialResourceTypes: CustomizerOptionRow[];
}

export function ResourcesSettingsClient({
  isSuperadmin = false,
  initialResourceTypes,
}: ResourcesSettingsClientProps) {
  const [resourceTypes, setResourceTypes] = useState<CustomizerOptionRow[]>(initialResourceTypes);
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
          scope: SCOPE_RESOURCE_TYPE,
          items: resourceTypes.map((i) => ({
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
          Define resource types for Calendar and Tasks (e.g., Room, Equipment, Video). These appear in the Resources dropdown when adding or editing a resource. Order shown is the order in the picker.
        </CardDescription>
        <CustomizerOptionsTable
          scope={SCOPE_RESOURCE_TYPE}
          items={resourceTypes}
          onItemsChange={(next) => {
            setResourceTypes(next);
            setSaved(false);
          }}
          onSave={handleSave}
          saving={saving}
          saved={saved}
          isSuperadmin={isSuperadmin}
          showColor={true}
          addButtonLabel="Add type"
          saveButtonLabel="Save resource types"
          emptyLabel="No resource types defined"
          getDefaultItem={() => ({ slug: "", label: "", color: "#6b7280", is_core: false })}
          validateForSave={validateSlugLabel}
        />
      </CardContent>
    </Card>
  );
}
