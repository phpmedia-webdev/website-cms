import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublishedGalleryBySlug } from "@/lib/supabase/galleries-server";
import { checkGalleryAccess } from "@/lib/auth/gallery-access";
import { GalleryPageClient } from "@/components/public/media/GalleryPageClient";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ style?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await getPublishedGalleryBySlug(slug);
  if (!gallery) return { title: "Gallery Not Found" };
  return { title: gallery.name };
}

export default async function GalleryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { style: styleFromUrl } = await searchParams;
  const gallery = await getPublishedGalleryBySlug(slug);
  if (!gallery) notFound();

  const accessResult = await checkGalleryAccess(gallery.access);

  const loginUrl = `/login?redirect=${encodeURIComponent(`/gallery/${gallery.slug}`)}`;

  if (!accessResult.hasAccess) {
    if (accessResult.visibilityMode === "message" && accessResult.restrictedMessage) {
      return (
        <main className="container mx-auto px-4 py-16 max-w-4xl">
          <h1 className="text-4xl font-bold mb-6">{gallery.name}</h1>
          <p className="text-muted-foreground mb-6">{accessResult.restrictedMessage}</p>
          <Button asChild variant="outline">
            <Link href={loginUrl}>Sign in to view</Link>
          </Button>
        </main>
      );
    }
    return (
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6">{gallery.name}</h1>
        <p className="text-muted-foreground">This gallery is restricted.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={loginUrl}>Sign in</Link>
        </Button>
      </main>
    );
  }

  // Use style from URL if valid, otherwise use first style
  const validStyle = gallery.styles.find((s) => s.id === styleFromUrl);
  const initialStyleId = validStyle?.id ?? gallery.first_style_id;

  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">{gallery.name}</h1>
      <Suspense fallback={<div className="text-muted-foreground">Loading gallery...</div>}>
        <GalleryPageClient
          galleryId={gallery.id}
          galleryName={gallery.name}
          gallerySlug={gallery.slug}
          styles={gallery.styles}
          initialStyleId={initialStyleId}
        />
      </Suspense>
    </main>
  );
}
