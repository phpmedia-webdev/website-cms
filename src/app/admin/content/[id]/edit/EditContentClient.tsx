"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { getContentById, getContentTypes } from "@/lib/supabase/content";
import { ContentEditorForm, type ContentEditorFormHandle } from "@/components/content/ContentEditorForm";
import { ContentCommentsBlock } from "@/components/content/ContentCommentsBlock";
import { Button } from "@/components/ui/button";
import type { ContentRow, ContentType } from "@/types/content";

export function EditContentClient() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [item, setItem] = useState<ContentRow | null>(null);
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useForAgentTraining, setUseForAgentTraining] = useState(false);
  const [saving, setSaving] = useState(false);
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
        setTypes(typeList.filter((t) => t.slug !== "page"));
        if (row) setUseForAgentTraining(row.use_for_agent_training ?? false);
        if (!row) setError("Content not found");
      })
      .catch((e) => {
        console.error("Failed to load content:", e);
        setError("Failed to load content");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaved = () => {
    // Stay on edit page after save so user can preview or keep editing. Use "Back" to return to list.
  };

  const handleCancel = () => {
    router.push("/admin/content");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/content"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Content
        </Link>
        <p className="text-destructive">{error ?? "Content not found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/content"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="font-bold text-2xl">Edit Content</span>
        </div>
        <div className="flex justify-end gap-2">
          {types.find((t) => t.id === item.content_type_id)?.slug === "post" && item.slug && (
            <Button
              type="button"
              variant="outline"
              title="Open post in a new tab (draft visible to you only)"
              onClick={() => {
                const url = `${window.location.origin}/blog/${encodeURIComponent(item.slug)}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Preview
            </Button>
          )}
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => formRef.current?.save()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Update"
            )}
          </Button>
        </div>
      </header>
      <ContentEditorForm
        ref={formRef}
        item={item}
        types={types}
        onSaved={handleSaved}
        onCancel={handleCancel}
        useForAgentTraining={useForAgentTraining}
        onUseForAgentTrainingChange={setUseForAgentTraining}
        onSavingChange={setSaving}
      />
      {types.find((t) => t.id === item.content_type_id)?.slug === "post" && (
        <ContentCommentsBlock contentId={item.id} />
      )}
    </div>
  );
}
