"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getContentTypes } from "@/lib/supabase/content";
import { ContentEditorForm, type ContentEditorFormHandle } from "@/components/content/ContentEditorForm";
import { Button } from "@/components/ui/button";
import type { ContentType } from "@/types/content";

export function TemplateNewClient() {
  const router = useRouter();
  const [types, setTypes] = useState<ContentType[]>([]);
  const [templateType, setTemplateType] = useState<ContentType | null>(null);
  const [loading, setLoading] = useState(true);
  const formRef = useRef<ContentEditorFormHandle>(null);

  useEffect(() => {
    getContentTypes()
      .then((t) => {
        setTypes(t);
        const template = t.find((x) => x.slug === "template") ?? null;
        setTemplateType(template);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (contentId?: string) => {
    if (contentId) {
      router.push(`/admin/crm/templates/${contentId}/edit`);
    } else {
      router.push("/admin/crm/templates");
    }
  };

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

  if (!templateType) {
    return (
      <div className="space-y-4 p-6">
        <Link
          href="/admin/crm/templates"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </Link>
        <p className="text-destructive">Template content type not found. Run migration 134.</p>
      </div>
    );
  }

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
          <span className="font-bold text-2xl">New template</span>
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
        item={null}
        types={types}
        initialContentTypeSlug="template"
        showPlaceholderPicker
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
    </div>
  );
}
