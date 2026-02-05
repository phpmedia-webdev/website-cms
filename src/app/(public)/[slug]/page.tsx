import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedContentByTypeAndSlug } from "@/lib/supabase/content";
import { PublicContentRenderer } from "@/components/public/content/PublicContentRenderer";
import { checkContentAccess } from "@/lib/auth/content-access";

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

  const access = await checkContentAccess({
    access_level: (page.access_level as "public" | "members" | "mag") ?? "public",
    required_mag_id: page.required_mag_id ?? null,
    visibility_mode: (page.visibility_mode as "hidden" | "message") ?? "hidden",
    restricted_message: page.restricted_message ?? null,
  });

  if (!access.hasAccess) {
    const returnPath = `/${slug}`;
    const { createServerSupabaseClientSSR } = await import("@/lib/supabase/client");
    const supabase = await createServerSupabaseClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
    }
    return (
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-6">{page.title}</h1>
        <div className="rounded-lg border bg-muted/50 p-6 text-muted-foreground">
          {access.visibilityMode === "message" && access.restrictedMessage
            ? access.restrictedMessage
            : "You don't have access to this page."}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-4xl font-bold mb-6">{page.title}</h1>
      <PublicContentRenderer content={page.body} />
    </main>
  );
}
