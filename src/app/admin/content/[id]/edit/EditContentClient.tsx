"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getContentById, getContentTypes } from "@/lib/supabase/content";
import { ContentEditorForm } from "@/components/content/ContentEditorForm";
import type { ContentRow, ContentType } from "@/types/content";

export function EditContentClient() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [item, setItem] = useState<ContentRow | null>(null);
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (!row) setError("Content not found");
      })
      .catch((e) => {
        console.error("Failed to load content:", e);
        setError("Failed to load content");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaved = () => {
    router.push("/admin/content");
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
      <div className="flex items-center gap-3">
        <Link
          href="/admin/content"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Edit content</h1>
        <p className="text-muted-foreground mt-1">{item.title || item.slug || "—"}</p>
      </div>
      <ContentEditorForm
        item={item}
        types={types}
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
    </div>
  );
}
