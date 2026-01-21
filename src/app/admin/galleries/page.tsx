import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Folder } from "lucide-react";
import Image from "next/image";

export default async function GalleriesPage() {
  const supabase = createServerSupabaseClient();
  const { data: galleries, error } = await supabase
    .from("galleries")
    .select(`
      *,
      cover_image:media(id, url)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading galleries:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Galleries</h1>
          <p className="text-muted-foreground mt-2">
            Manage your gallery collections
          </p>
        </div>
        <Link href="/admin/galleries/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Gallery
          </Button>
        </Link>
      </div>

      {!galleries || galleries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No galleries yet</p>
            <Link href="/admin/galleries/new">
              <Button>Create Your First Gallery</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {galleries.map((gallery: any) => (
            <Link key={gallery.id} href={`/admin/galleries/${gallery.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer overflow-hidden">
                <div className="aspect-video relative bg-muted">
                  {gallery.cover_image?.url ? (
                    <Image
                      src={gallery.cover_image.url}
                      alt={gallery.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Folder className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{gallery.name}</h3>
                  {gallery.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {gallery.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
