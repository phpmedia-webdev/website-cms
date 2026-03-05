import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { getPublishedContentByTypeAndSlug } from "@/lib/supabase/content";
import { getTaxonomyTermsForContentDisplay } from "@/lib/supabase/taxonomy";
import { getTenantUserById } from "@/lib/supabase/tenant-users";
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

  const [author, { categories, tags }] = await Promise.all([
    post.author_id ? getTenantUserById(post.author_id) : Promise.resolve(null),
    getTaxonomyTermsForContentDisplay(post.id, "post"),
  ]);
  const authorLabel = author ? (author.display_name?.trim() || author.email) : null;

  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <Link href="/blog" className="text-sm text-muted-foreground hover:underline mb-6 inline-block">
        ← Back to Blog
      </Link>
      <article>
        <h1 className="text-4xl font-bold mb-2">{post.title}</h1>
        {(post.published_at || authorLabel) && (
          <div className="text-sm text-muted-foreground mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {post.published_at && (
              <time dateTime={post.published_at}>
                {format(new Date(post.published_at), "MMMM d, yyyy")}
              </time>
            )}
            {authorLabel && (
              <span>
                {post.published_at ? " · " : null}
                By {authorLabel}
              </span>
            )}
          </div>
        )}
        {(categories.length > 0 || tags.length > 0) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-6 text-sm text-muted-foreground">
            {categories.length > 0 && (
              <span className="flex items-center gap-2">
                <span className="font-medium text-foreground">Categories:</span>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/blog/category/${encodeURIComponent(c.slug)}`}
                    className="hover:underline"
                  >
                    {c.name}
                  </Link>
                ))}
              </span>
            )}
            {tags.length > 0 && (
              <span className="flex items-center gap-2">
                <span className="font-medium text-foreground">Tags:</span>
                {tags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/blog/tag/${encodeURIComponent(t.slug)}`}
                    className="hover:underline"
                  >
                    {t.name}
                  </Link>
                ))}
              </span>
            )}
          </div>
        )}
        {post.excerpt && <p className="text-lg text-muted-foreground mb-8">{post.excerpt}</p>}
        <PublicContentRenderer content={post.body} />
      </article>
    </main>
  );
}
