import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Folder } from "lucide-react";
import { GalleriesListClient } from "./GalleriesListClient";

export default async function GalleriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status === "draft" || params.status === "published"
    ? params.status
    : undefined;

  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  let query = supabase
    .schema(schema)
    .from("galleries")
    .select("id, name, slug, description, cover_image_id, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: galleries, error } = await query;

  if (error) {
    console.error("Error loading galleries:", error.message ?? JSON.stringify(error));
  }

  // Fetch cover image URLs from media_variants (media table has no url column)
  const coverImageUrls = new Map<string, string>();
  if (galleries?.length) {
    const coverIds = galleries
      .map((g: { cover_image_id?: string | null }) => g.cover_image_id)
      .filter((id: string | null | undefined): id is string => !!id);
    if (coverIds.length > 0) {
      const { data: variantRows } = await supabase
        .schema(schema)
        .from("media_variants")
        .select("media_id, url")
        .in("media_id", coverIds)
        .in("variant_type", ["original", "large"])
        .order("variant_type", { ascending: false });
      for (const row of variantRows ?? []) {
        if (!coverImageUrls.has(row.media_id)) coverImageUrls.set(row.media_id, row.url);
      }
    }
  }

  if (!galleries || galleries.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Galleries</h1>
          <p className="text-muted-foreground mt-2">
            Manage your gallery collections
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No galleries yet</p>
            <Link href="/admin/galleries/new">
              <Button>Create Your First Gallery</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const coverUrls: Record<string, string> = {};
  for (const [k, v] of coverImageUrls) coverUrls[k] = v;

  return (
    <GalleriesListClient
      galleries={galleries}
      coverImageUrls={coverUrls}
      statusFilter={statusFilter}
    />
  );
}
