import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedContentByTypeAndSlug } from "@/lib/supabase/content";
import { PublicContentRenderer } from "@/components/public/content/PublicContentRenderer";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedContentByTypeAndSlug("page", slug);
  if (!page) return { title: "Page Not Found" };
  return { title: page.title };
}

export default async function DynamicPageRoute({ params }: Props) {
  const { slug } = await params;
  const page = await getPublishedContentByTypeAndSlug("page", slug);
  if (!page) notFound();
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-4xl font-bold mb-6">{page.title}</h1>
      <PublicContentRenderer content={page.body} />
    </main>
  );
}
