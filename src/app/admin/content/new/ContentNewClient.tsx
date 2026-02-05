"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getContentTypes } from "@/lib/supabase/content";
import { ContentEditorForm } from "@/components/content/ContentEditorForm";
import type { ContentType } from "@/types/content";

export function ContentNewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeSlug = searchParams.get("type") ?? undefined;
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContentTypes().then((t) => {
      setTypes(t.filter((x) => x.slug !== "page"));
    }).finally(() => setLoading(false));
  }, []);

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
        <h1 className="text-2xl font-bold">Add content</h1>
        <p className="text-muted-foreground mt-1">Create a new post or content item.</p>
      </div>
      <ContentEditorForm
        item={null}
        types={types}
        onSaved={handleSaved}
        onCancel={handleCancel}
        initialContentTypeSlug={typeSlug}
      />
    </div>
  );
}
