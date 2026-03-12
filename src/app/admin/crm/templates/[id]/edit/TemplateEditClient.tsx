"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getContentById, getContentTypes } from "@/lib/supabase/content";
import { ContentEditorForm, type ContentEditorFormHandle } from "@/components/content/ContentEditorForm";
import { Button } from "@/components/ui/button";
import type { ContentRow, ContentType } from "@/types/content";

export function TemplateEditClient({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<ContentRow | null>(null);
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<ContentEditorFormHandle>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Missing content id");
      return;
    }
    Promise.all([getContentById(id), getContentTypes()])
      .then(([row, typeList]) => {
        setItem(row ?? null);
        setTypes(typeList);
        if (!row) setError("Template not found");
      })
      .catch((e) => {
        console.error("Failed to load template:", e);
        setError("Failed to load template");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = () => {
    router.push("/admin/crm/templates");
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4 p-6">
        <Link
          href="/admin/crm/templates"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </Link>
        <p className="text-destructive">{error ?? "Template not found."}</p>
      </div>
    );
  }

  const isTemplateType = types.find((t) => t.id === item.content_type_id)?.slug === "template";

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/crm/templates"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="font-bold text-2xl">Edit template</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={() => formRef.current?.save()}>
            Save
          </Button>
        </div>
      </header>
      <ContentEditorForm
        ref={formRef}
        item={item}
        types={types}
        showPlaceholderPicker={isTemplateType}
        onSaved={() => {}}
        onCancel={handleCancel}
      />
    </div>
  );
}
