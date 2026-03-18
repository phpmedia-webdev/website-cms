"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { CustomizerOptionRow } from "@/components/settings/CustomizerOptionsTable";
import { CustomizerOptionsTable } from "@/components/settings/CustomizerOptionsTable";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";
import { CRM_STATUS_SLUG_NEW } from "@/lib/supabase/settings";

const CRM_SUBTAB_STATUSES = "contact-statuses";
const CRM_SUBTAB_NOTE_TYPES = "note-types";
/** Scope slug for contact status list in the customizer table (fixed in code). */
const CONTACT_STATUS_SCOPE = "contact_status";
/** Scope slug for note type list in the customizer table (fixed in code). */
const NOTE_TYPE_SCOPE = "note_type";

interface CrmSettingsClientProps {
  isSuperadmin?: boolean;
  initialNoteTypes: string[];
  initialContactStatuses: CrmContactStatusOption[];
}

export function CrmSettingsClient({
  isSuperadmin = false,
  initialNoteTypes,
  initialContactStatuses,
}: CrmSettingsClientProps) {
  const [noteTypeItems, setNoteTypeItems] = useState<CustomizerOptionRow[]>(() =>
    initialNoteTypes.map((s) => ({ slug: s, label: s }))
  );
  const [noteTypesSaving, setNoteTypesSaving] = useState(false);
  const [noteTypesSaved, setNoteTypesSaved] = useState(false);

  const [contactStatuses, setContactStatuses] = useState<CrmContactStatusOption[]>(
    initialContactStatuses
  );
  const [statusesSaving, setStatusesSaving] = useState(false);
  const [statusesSaved, setStatusesSaved] = useState(false);

  // --- Contact Status (uses shared CustomizerOptionsTable) ---
  const handleSaveStatuses = async () => {
    const valid = contactStatuses.every(
      (s) => s.slug.trim() && s.label.trim() && s.color
    );
    if (!valid) return;
    const slugs = contactStatuses.map((s) => s.slug.trim().toLowerCase());
    if (new Set(slugs).size !== slugs.length) return; // duplicate slugs
    setStatusesSaving(true);
    setStatusesSaved(false);
    try {
      const res = await fetch("/api/settings/crm/contact-statuses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statuses: contactStatuses.map((s) => ({
            slug: s.slug.trim().toLowerCase(),
            label: s.label.trim(),
            color: s.color,
            is_core: !!s.is_core,
          })),
        }),
      });
      if (res.ok) setStatusesSaved(true);
    } finally {
      setStatusesSaving(false);
    }
  };

  // --- Note Types (uses shared CustomizerOptionsTable; data still from settings API until customizer table is used) ---
  const handleSaveNoteTypes = async () => {
    const slugs = noteTypeItems
      .filter((i) => i.slug.trim())
      .map((i) => i.slug.trim().toLowerCase().replace(/\s+/g, "-"));
    if (new Set(slugs).size !== slugs.length) return;
    setNoteTypesSaving(true);
    setNoteTypesSaved(false);
    try {
      const res = await fetch("/api/settings/crm/note-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types: slugs }),
      });
      if (res.ok) setNoteTypesSaved(true);
    } finally {
      setNoteTypesSaving(false);
    }
  };

  return (
    <Card>
      <Tabs defaultValue={CRM_SUBTAB_STATUSES} className="w-full">
        {/* Folder-style tabs: tabs at top of card, active tab meets content */}
        <div className="border-b px-4 pt-4">
          <TabsList className="h-auto w-full justify-start rounded-none border-0 bg-transparent p-0 gap-0">
            <TabsTrigger
              value={CRM_SUBTAB_STATUSES}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-[0_1px_0_0_hsl(var(--border))]"
            >
              Contact Status
            </TabsTrigger>
            <TabsTrigger
              value={CRM_SUBTAB_NOTE_TYPES}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-[0_1px_0_0_hsl(var(--border))]"
            >
              Note Types
            </TabsTrigger>
          </TabsList>
        </div>
        <CardContent className="p-0">
          <TabsContent value={CRM_SUBTAB_STATUSES} className="mt-0 rounded-b-lg border-0 p-6">
            <CardDescription className="mb-4">
              Define the status options for contacts (e.g., New, Contacted, Archived). Order and color are used in the contact list and detail views.
            </CardDescription>
            <CustomizerOptionsTable
              scope={CONTACT_STATUS_SCOPE}
              items={contactStatuses as CustomizerOptionRow[]}
              onItemsChange={(next) => {
                setContactStatuses(next as CrmContactStatusOption[]);
                setStatusesSaved(false);
              }}
              onSave={handleSaveStatuses}
              saving={statusesSaving}
              saved={statusesSaved}
              isSuperadmin={isSuperadmin}
              showColor={true}
              protectedSlug={CRM_STATUS_SLUG_NEW}
              addButtonLabel="Add status"
              saveButtonLabel="Save statuses"
              emptyLabel="No statuses defined"
              getDefaultItem={() => ({ slug: "", label: "", color: "#6b7280", is_core: false })}
              validateForSave={(list) => {
                const valid = list.every((s) => s.slug.trim() && s.label.trim() && s.color);
                if (!valid) return false;
                const slugs = list.map((s) => s.slug.trim().toLowerCase());
                return new Set(slugs).size === slugs.length;
              }}
            />
          </TabsContent>
          <TabsContent value={CRM_SUBTAB_NOTE_TYPES} className="mt-0 rounded-b-lg border-0 p-6">
            <CardDescription className="mb-4">
              Define the types of notes that can be added to contacts (e.g., call, task, email, meeting).
            </CardDescription>
            <CustomizerOptionsTable
              scope={NOTE_TYPE_SCOPE}
              items={noteTypeItems}
              onItemsChange={(next) => {
                setNoteTypeItems(next);
                setNoteTypesSaved(false);
              }}
              onSave={handleSaveNoteTypes}
              saving={noteTypesSaving}
              saved={noteTypesSaved}
              isSuperadmin={isSuperadmin}
              showColor={false}
              addButtonLabel="Add type"
              saveButtonLabel="Save note types"
              emptyLabel="No note types defined"
              getDefaultItem={() => ({ slug: "", label: "" })}
              validateForSave={(list) => {
                const valid = list.every((i) => i.slug.trim() && i.label.trim());
                if (!valid) return false;
                const slugs = list.map((i) => i.slug.trim().toLowerCase().replace(/\s+/g, "-"));
                return new Set(slugs).size === slugs.length;
              }}
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
