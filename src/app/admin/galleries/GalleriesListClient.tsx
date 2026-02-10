"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Folder, LayoutGrid, List } from "lucide-react";
import Image from "next/image";

interface GalleryRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  cover_image_id?: string | null;
  status?: string | null;
  access_level?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface GalleriesListClientProps {
  galleries: GalleryRow[];
  /** Map of cover_image_id -> url (passed as plain object for serialization) */
  coverImageUrls: Record<string, string>;
  statusFilter?: string;
  /** Gallery IDs that have at least one membership (for M badge) */
  galleryIdsWithMembership?: string[];
}

export function GalleriesListClient({
  galleries,
  coverImageUrls,
  statusFilter,
  galleryIdsWithMembership = [],
}: GalleriesListClientProps) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const membershipSet = new Set(galleryIdsWithMembership);
  const showMembershipBadge = (g: GalleryRow) =>
    membershipSet.has(g.id) || g.access_level === "members" || g.access_level === "mag";

  useEffect(() => {
    const stored = localStorage.getItem("galleriesListView");
    if (stored === "grid" || stored === "list") setView(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem("galleriesListView", view);
  }, [view]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Galleries</h1>
          <p className="text-muted-foreground mt-2">
            Manage your gallery collections
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-input overflow-hidden">
            <Link
              href="/admin/galleries"
              className={`px-3 py-1.5 text-sm ${
                !statusFilter
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              All
            </Link>
            <Link
              href="/admin/galleries?status=published"
              className={`px-3 py-1.5 text-sm border-l border-input ${
                statusFilter === "published"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              Published
            </Link>
            <Link
              href="/admin/galleries?status=draft"
              className={`px-3 py-1.5 text-sm border-l border-input ${
                statusFilter === "draft"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              Draft
            </Link>
          </div>
          <div className="flex rounded-md border p-0.5">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/admin/galleries/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Gallery
            </Button>
          </Link>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {galleries.map((gallery) => (
            <Link key={gallery.id} href={`/admin/galleries/${gallery.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer overflow-hidden">
                <div className="aspect-square relative bg-muted">
                  {showMembershipBadge(gallery) && (
                    <span
                      className="absolute top-1.5 right-1.5 z-10 inline-flex h-5 w-5 items-center justify-center rounded bg-red-100 text-red-700 font-semibold text-xs dark:bg-red-900/40 dark:text-red-300"
                      title="Membership restricted"
                    >
                      M
                    </span>
                  )}
                  {gallery.cover_image_id && coverImageUrls[gallery.cover_image_id] ? (
                    <Image
                      src={coverImageUrls[gallery.cover_image_id]!}
                      alt={gallery.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Folder className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-medium text-sm truncate flex-1 min-w-0">
                      {gallery.name}
                    </h3>
                    <Badge
                      variant={gallery.status === "published" ? "default" : "secondary"}
                      className="shrink-0 text-[10px] px-1"
                    >
                      {gallery.status ?? "draft"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {galleries.map((gallery) => (
              <Link key={gallery.id} href={`/admin/galleries/${gallery.id}`}>
                <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors">
                  <div className="relative w-10 h-10 shrink-0 rounded bg-muted overflow-hidden">
                    {showMembershipBadge(gallery) && (
                      <span
                        className="absolute top-0.5 right-0.5 z-10 inline-flex h-4 w-4 items-center justify-center rounded bg-red-100 text-red-700 font-semibold text-[10px] dark:bg-red-900/40 dark:text-red-300"
                        title="Membership restricted"
                      >
                        M
                      </span>
                    )}
                    {gallery.cover_image_id && coverImageUrls[gallery.cover_image_id] ? (
                      <Image
                        src={coverImageUrls[gallery.cover_image_id]!}
                        alt={gallery.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Folder className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{gallery.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {gallery.description || gallery.slug || "—"}
                    </p>
                  </div>
                  {showMembershipBadge(gallery) ? (
                    <span
                      className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded bg-red-100 text-red-700 font-semibold text-xs dark:bg-red-900/40 dark:text-red-300"
                      title="Membership restricted"
                    >
                      M
                    </span>
                  ) : null}
                  <Badge
                    variant={gallery.status === "published" ? "default" : "secondary"}
                    className="shrink-0 text-xs"
                  >
                    {gallery.status ?? "draft"}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
