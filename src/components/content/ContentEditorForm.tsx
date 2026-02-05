"use client";

import { useState, useEffect } from "react";
import { useSlug } from "@/hooks/useSlug";
import {
  insertContent,
  updateContent,
  getContentTypeFieldsByContentType,
} from "@/lib/supabase/content";
import { setTaxonomyForContent } from "@/lib/supabase/taxonomy";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { ContentRow, ContentType, ContentTypeField } from "@/types/content";
import { TaxonomyAssignmentForContent } from "@/components/taxonomy/TaxonomyAssignmentForContent";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export interface ContentEditorFormProps {
  item: ContentRow | null;
  types: ContentType[];
  onSaved: () => void;
  onCancel: () => void;
  /** When creating, preselect this content type by slug (e.g. from ?type=post). */
  initialContentTypeSlug?: string;
}

/**
 * Shared add/edit content form (no dialog). Use in full-page editor or inside a modal.
 */
export function ContentEditorForm({
  item,
  types,
  onSaved,
  onCancel,
  initialContentTypeSlug,
}: ContentEditorFormProps) {
  const [contentTypeId, setContentTypeId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug, slugFromTitle] = useSlug("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [excerpt, setExcerpt] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [fieldDefs, setFieldDefs] = useState<ContentTypeField[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [accessLevel, setAccessLevel] = useState<"public" | "members" | "mag">(
    (item?.access_level as "public" | "members" | "mag") || "public"
  );
  const [visibilityMode, setVisibilityMode] = useState<"hidden" | "message">(
    (item?.visibility_mode as "hidden" | "message") || "hidden"
  );
  const [restrictedMessage, setRestrictedMessage] = useState(item?.restricted_message || "");
  const [requiredMagId, setRequiredMagId] = useState<string>(item?.required_mag_id || "");
  const [availableMags, setAvailableMags] = useState<{ id: string; name: string; uid: string }[]>([]);

  const isEdit = !!item;
  const postType = types.find((t) => t.slug === "post");
  const typeBySlug = initialContentTypeSlug
    ? types.find((t) => t.slug === initialContentTypeSlug)
    : null;
  const defaultTypeId = typeBySlug?.id ?? postType?.id ?? types[0]?.id ?? "";
  const currentType = types.find((t) => t.id === contentTypeId);

  useEffect(() => {
    if (item) {
      setContentTypeId(item.content_type_id);
      setName(item.title);
      setSlug(item.slug);
      setData(item.body);
      setExcerpt(item.excerpt || "");
      setStatus((item.status as "draft" | "published") || "draft");
      setSlugManuallyEdited(false);
      setCustomFields(
        item.custom_fields && typeof item.custom_fields === "object"
          ? { ...item.custom_fields }
          : {}
      );
      setSelectedCategoryIds(new Set());
      setSelectedTagIds(new Set());
      setAccessLevel((item.access_level as "public" | "members" | "mag") || "public");
      setVisibilityMode((item.visibility_mode as "hidden" | "message") || "hidden");
      setRestrictedMessage(item.restricted_message || "");
      setRequiredMagId(item.required_mag_id || "");
    } else {
      setContentTypeId(defaultTypeId);
      setName("");
      setSlug("");
      setData(null);
      setExcerpt("");
      setStatus("draft");
      setSlugManuallyEdited(false);
      setCustomFields({});
      setSelectedCategoryIds(new Set());
      setSelectedTagIds(new Set());
      setAccessLevel("public");
      setVisibilityMode("hidden");
      setRestrictedMessage("");
      setRequiredMagId("");
    }
  }, [item, defaultTypeId]);

  useEffect(() => {
    fetch("/api/crm/mags")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAvailableMags(data ?? []))
      .catch(() => setAvailableMags([]));
  }, []);

  useEffect(() => {
    if (!contentTypeId) {
      setFieldDefs([]);
      return;
    }
    let cancelled = false;
    getContentTypeFieldsByContentType(contentTypeId).then((defs) => {
      if (!cancelled) {
        setFieldDefs(defs);
        if (!isEdit) setCustomFields({});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [contentTypeId, isEdit]);

  useEffect(() => {
    if (isEdit || slugManuallyEdited) return;
    if (name) slugFromTitle(name);
  }, [isEdit, name, slugManuallyEdited, slugFromTitle]);

  const handleSave = async () => {
    if (!name?.trim() || !slug?.trim()) {
      alert("Name and slug are required.");
      return;
    }
    if (!isEdit && !contentTypeId) {
      alert("Please select a content type.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: name.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        body: data,
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
        featured_image_id: item?.featured_image_id ?? null,
        custom_fields: customFields,
        access_level: accessLevel,
        visibility_mode: visibilityMode,
        restricted_message: restrictedMessage.trim() || null,
        required_mag_id: accessLevel === "mag" && requiredMagId ? requiredMagId : null,
      };

      if (isEdit && item) {
        const ok = await updateContent(item.id, payload);
        if (!ok) throw new Error("Update failed");
        if (currentType) {
          const allIds = [...selectedCategoryIds, ...selectedTagIds];
          await setTaxonomyForContent(item.id, currentType.slug, allIds);
        }
      } else {
        await insertContent({
          ...payload,
          content_type_id: contentTypeId,
          featured_image_id: null,
          custom_fields: customFields,
        });
      }
      onSaved();
    } catch (e) {
      console.error("Content save failed:", e);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {isEdit ? (
        <div className="space-y-2">
          <Label>Type</Label>
          <p className="text-sm text-muted-foreground">{currentType?.label ?? "—"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="content-type">Content type</Label>
          <select
            id="content-type"
            value={contentTypeId}
            onChange={(e) => setContentTypeId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select type…</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="content-name">Name</Label>
        <Input
          id="content-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Title"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content-slug">Slug</Label>
        <Input
          id="content-slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugManuallyEdited(true);
          }}
          placeholder="url-slug"
        />
      </div>
      <div className="space-y-2">
        <Label>Body</Label>
        <RichTextEditor content={data} onChange={setData} placeholder="Body content…" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content-excerpt">Excerpt</Label>
        <Input
          id="content-excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief description"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content-status">Status</Label>
        <select
          id="content-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membership Protection</CardTitle>
          <CardDescription>
            Control who can view this content on the public site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Access Level</label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as "public" | "members" | "mag")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="public">Public</option>
              <option value="members">Members only</option>
              <option value="mag">Specific membership(s)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">When restricted (visibility)</label>
            <select
              value={visibilityMode}
              onChange={(e) => setVisibilityMode(e.target.value as "hidden" | "message")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={accessLevel === "public"}
            >
              <option value="hidden">Hide content</option>
              <option value="message">Show message</option>
            </select>
          </div>
          {accessLevel === "mag" && (
            <div>
              <label className="text-sm font-medium mb-2 block">Required Membership</label>
              <select
                value={requiredMagId}
                onChange={(e) => setRequiredMagId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select membership…</option>
                {availableMags.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.uid})
                  </option>
                ))}
              </select>
            </div>
          )}
          {accessLevel !== "public" && visibilityMode === "message" && (
            <div>
              <label className="text-sm font-medium mb-2 block">Restricted Message</label>
              <Input
                value={restrictedMessage}
                onChange={(e) => setRestrictedMessage(e.target.value)}
                placeholder="e.g. Sign in to view this content"
                className="w-full"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {fieldDefs.length > 0 && (
        <div className="space-y-4 pt-2 border-t">
          <h3 className="text-sm font-medium">Custom fields</h3>
          <div className="space-y-4">
            {fieldDefs.map((f) => (
              <div key={f.id} className="space-y-2">
                <Label htmlFor={`cf-${f.key}`}>{f.label}</Label>
                {f.type === "textarea" ? (
                  <textarea
                    id={`cf-${f.key}`}
                    value={String(customFields[f.key] ?? "")}
                    onChange={(e) =>
                      setCustomFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                ) : f.type === "checkbox" ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`cf-${f.key}`}
                      checked={!!customFields[f.key]}
                      onCheckedChange={(v) =>
                        setCustomFields((prev) => ({ ...prev, [f.key]: !!v }))
                      }
                    />
                  </div>
                ) : f.type === "number" ? (
                  <Input
                    id={`cf-${f.key}`}
                    type="number"
                    value={customFields[f.key] != null ? String(customFields[f.key]) : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCustomFields((prev) => ({
                        ...prev,
                        [f.key]: v === "" ? null : Number(v),
                      }));
                    }}
                  />
                ) : (
                  <Input
                    id={`cf-${f.key}`}
                    value={String(customFields[f.key] ?? "")}
                    onChange={(e) =>
                      setCustomFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isEdit && item && currentType && (
        <div className="space-y-2 pt-2 border-t">
          <h3 className="text-sm font-medium">Categories &amp; Tags</h3>
          <TaxonomyAssignmentForContent
            contentId={item.id}
            contentTypeSlug={currentType.slug}
            sectionLabel={currentType.label}
            disabled={saving}
            embedded
            selectedCategoryIds={selectedCategoryIds}
            selectedTagIds={selectedTagIds}
            onCategoryToggle={(id, checked) => {
              setSelectedCategoryIds((prev) => {
                const next = new Set(prev);
                if (checked) next.add(id);
                else next.delete(id);
                return next;
              });
            }}
            onTagToggle={(id, checked) => {
              setSelectedTagIds((prev) => {
                const next = new Set(prev);
                if (checked) next.add(id);
                else next.delete(id);
                return next;
              });
            }}
            onInitialLoad={({ categoryIds, tagIds }) => {
              setSelectedCategoryIds(new Set(categoryIds));
              setSelectedTagIds(new Set(tagIds));
            }}
          />
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : isEdit ? (
            "Update"
          ) : (
            "Create"
          )}
        </Button>
      </div>
    </div>
  );
}
