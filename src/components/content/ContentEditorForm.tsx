"use client";

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export interface ContentEditorFormProps {
  item: ContentRow | null;
  types: ContentType[];
  onSaved: () => void;
  onCancel: () => void;
  /** When creating, preselect this content type by slug (e.g. from ?type=post). */
  initialContentTypeSlug?: string;
  /** When set, checkbox is controlled by parent (e.g. rendered in page header). */
  useForAgentTraining?: boolean;
  onUseForAgentTrainingChange?: (value: boolean) => void;
  /** Called when saving state changes (e.g. for header buttons to show loading). */
  onSavingChange?: (saving: boolean) => void;
}

export interface ContentEditorFormHandle {
  save: () => void;
}

/** Tiptap JSON body for new FAQ content (Topic / Q / A template). Single line between each item; parser uses Topic:/Q:/A: prefixes. */
function getFaqTemplateBody(): Record<string, unknown> {
  return {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Topic: add your topic here (required)" }] },
      { type: "paragraph", content: [{ type: "text", text: "Q: Follow this format. Add a question here." }] },
      { type: "paragraph", content: [{ type: "text", text: "A: Put the answer here" }] },
      { type: "paragraph", content: [{ type: "text", text: "Q: Next Question here" }] },
      { type: "paragraph", content: [{ type: "text", text: "A: Answer here. Add as many FAQ's as needed." }] },
    ],
  };
}

/** Tiptap JSON body for new Quote content (Quote / Author template). */
function getQuoteTemplateBody(): Record<string, unknown> {
  return {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Quote: Add the quote or testimonial text here." }] },
      { type: "paragraph", content: [{ type: "text", text: "Author: Name, title, or attribution." }] },
    ],
  };
}

/**
 * Shared add/edit content form (no dialog). Use in full-page editor or inside a modal.
 * Pass a ref to trigger save() from outside (e.g. header buttons).
 */
const ContentEditorFormComponent = ({
  item,
  types,
  onSaved,
  onCancel,
  initialContentTypeSlug,
  useForAgentTraining: controlledUseForAgentTraining,
  onUseForAgentTrainingChange,
  onSavingChange,
}: ContentEditorFormProps,
ref: React.Ref<ContentEditorFormHandle>) => {
  const [contentTypeId, setContentTypeId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug, slugFromTitle] = useSlug("");
  // Initialize body from item or content-type template on first paint (Tiptap only uses content as initial state)
  const [data, setData] = useState<Record<string, unknown> | null>(
    () =>
      item?.body ??
      (initialContentTypeSlug === "faq"
        ? getFaqTemplateBody()
        : initialContentTypeSlug === "quote"
          ? getQuoteTemplateBody()
          : null)
  );
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
  const [internalUseForAgentTraining, setInternalUseForAgentTraining] = useState<boolean>(
    item?.use_for_agent_training ?? false
  );
  const [bodyCharCount, setBodyCharCount] = useState(0);
  const handleSaveRef = useRef<() => void>(() => {});
  const useForAgentTraining =
    controlledUseForAgentTraining !== undefined ? controlledUseForAgentTraining : internalUseForAgentTraining;
  const setUseForAgentTraining =
    onUseForAgentTrainingChange ?? setInternalUseForAgentTraining;

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
      if (onUseForAgentTrainingChange) onUseForAgentTrainingChange(item.use_for_agent_training ?? false);
      else setInternalUseForAgentTraining(item.use_for_agent_training ?? false);
    } else {
      setContentTypeId(defaultTypeId);
      setName("");
      setSlug("");
      setData(
        initialContentTypeSlug === "faq"
          ? getFaqTemplateBody()
          : initialContentTypeSlug === "quote"
            ? getQuoteTemplateBody()
            : null
      );
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
      if (onUseForAgentTrainingChange) onUseForAgentTrainingChange(false);
      else setInternalUseForAgentTraining(false);
    }
  }, [item, defaultTypeId, onUseForAgentTrainingChange]);

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
        use_for_agent_training: useForAgentTraining,
      };

      if (isEdit && item) {
        const ok = await updateContent(item.id, payload);
        if (!ok) throw new Error("Update failed");
        if (currentType) {
          const allIds = [...selectedCategoryIds, ...selectedTagIds];
          await setTaxonomyForContent(item.id, currentType.slug, allIds);
        }
      } else {
        const insertPayload = {
          ...payload,
          content_type_id: contentTypeId,
          featured_image_id: null,
          custom_fields: customFields,
        };
        const insertResult = await insertContent(insertPayload);
        if (!insertResult) throw new Error("Insert failed");
        if (currentType) {
          const allIds = [...selectedCategoryIds, ...selectedTagIds];
          await setTaxonomyForContent(insertResult.id, currentType.slug, allIds);
        }
      }
      onSaved();
    } catch (e) {
      console.error("Content save failed:", e);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  handleSaveRef.current = handleSave;

  useImperativeHandle(ref, () => ({ save: () => handleSaveRef.current?.() }), []);
  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  const taxonomyAssignment =
    isEdit && item && currentType ? (
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
    ) : currentType ? (
      <TaxonomyAssignmentForContent
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
      />
    ) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-[60%_40%] gap-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {(isEdit || initialContentTypeSlug) ? (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Content type</Label>
                <div className="rounded-md border border-input bg-muted/50 px-3 py-2.5">
                  <p className="text-base font-medium">{currentType?.label ?? "—"}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="content-type" className="text-base font-semibold">Content type</Label>
                <select
                  id="content-type"
                  value={contentTypeId}
                  onChange={(e) => setContentTypeId(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
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
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-4">
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="content-use-for-agent-training"
                checked={useForAgentTraining}
                onCheckedChange={(v) => setUseForAgentTraining(!!v)}
              />
              <Label htmlFor="content-use-for-agent-training" className="font-normal cursor-pointer">
                Use for AI Agent Training
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Body</Label>
          <span className="text-sm text-muted-foreground">{bodyCharCount.toLocaleString()} characters</span>
        </div>
        <RichTextEditor
          key={item?.id ?? "new"}
          content={data}
          onChange={setData}
          onCharCountChange={setBodyCharCount}
          placeholder="Body content…"
        />
      </div>

      <Tabs defaultValue="taxonomy" className="w-full">
        <TabsList>
          <TabsTrigger value="taxonomy">Taxonomy settings</TabsTrigger>
          <TabsTrigger value="membership">Membership settings</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom fields</TabsTrigger>
        </TabsList>
        <TabsContent value="taxonomy" className="space-y-4">
          {taxonomyAssignment}
          <div className="space-y-2">
            <Label htmlFor="content-excerpt">Excerpt</Label>
            <Input
              id="content-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief description"
            />
          </div>
        </TabsContent>
        <TabsContent value="membership" className="space-y-4">
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
        </TabsContent>
        <TabsContent value="custom-fields" className="space-y-4">
          {fieldDefs.length > 0 ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">No custom fields for this content type.</p>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4">
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
};

export const ContentEditorForm = forwardRef(ContentEditorFormComponent);
