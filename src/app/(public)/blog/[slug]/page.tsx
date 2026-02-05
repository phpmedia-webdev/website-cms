import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { getPublishedContentByTypeAndSlug } from "@/lib/supabase/content";
import { PublicContentRenderer } from "@/components/public/content/PublicContentRenderer";
import { checkContentAccess } from "@/lib/auth/content-access";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedContentByTypeAndSlug("post", slug);
  if (!post) return { title: "Post Not Found" };
  return { title: post.title };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedContentByTypeAndSlug("post", slug);
  if (!post) notFound();

  const access = await checkContentAccess({
    access_level: (post.access_level as "public" | "members" | "mag") ?? "public",
    required_mag_id: post.required_mag_id ?? null,
    visibility_mode: (post.visibility_mode as "hidden" | "message") ?? "hidden",
    restricted_message: post.restricted_message ?? null,
  });

  if (!access.hasAccess) {
    const returnPath = `/blog/${slug}`;
    const { createServerSupabaseClientSSR } = await import("@/lib/supabase/client");
    const supabase = await createServerSupabaseClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
    }
    return (
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <Link href="/blog" className="text-sm text-muted-foreground hover:underline mb-6 inline-block">
          ← Back to Blog
        </Link>
        <article>
          <h1 className="text-4xl font-bold mb-2">{post.title}</h1>
          <div className="rounded-lg border bg-muted/50 p-6 text-muted-foreground">
            {access.visibilityMode === "message" && access.restrictedMessage
              ? access.restrictedMessage
              : "You don't have access to this post."}
          </div>
        </article>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <Link href="/blog" className="text-sm text-muted-foreground hover:underline mb-6 inline-block">
        ← Back to Blog
      </Link>
      <article>
        <h1 className="text-4xl font-bold mb-2">{post.title}</h1>
        {post.published_at && (
          <time className="text-sm text-muted-foreground block mb-6" dateTime={post.published_at}>
            {format(new Date(post.published_at), "MMMM d, yyyy")}
          </time>
        )}
        {post.excerpt && <p className="text-lg text-muted-foreground mb-8">{post.excerpt}</p>}
        <PublicContentRenderer content={post.body} />
      </article>
    </main>
  );
}
