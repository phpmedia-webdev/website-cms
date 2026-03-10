import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { getPublishedContentByTypeAndSlug } from "@/lib/supabase/content";
import { getButtonStyles, getDesignSystemConfig } from "@/lib/supabase/settings";
import { getTaxonomyTermsForContentDisplay } from "@/lib/supabase/taxonomy";
import { getTenantUserById } from "@/lib/supabase/tenant-users";
import { getSiteUrl } from "@/lib/supabase/settings";
import { getMediaById } from "@/lib/supabase/media";
import { PublicContentRenderer } from "@/components/public/content/PublicContentRenderer";
import { checkContentAccess } from "@/lib/auth/content-access";
import { getCommentsByContentId } from "@/lib/supabase/crm";
import { getMemberByUserId } from "@/lib/supabase/members";
import { getRoleForCurrentUser, isAdminRole, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getCommentAuthorDisplayName } from "@/lib/blog-comments/author-name";
import { BlogPostComments } from "@/components/blog/BlogPostComments";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedContentByTypeAndSlug("post", slug);
  if (!post) return { title: "Post Not Found" };

  const baseUrl = await getSiteUrl();
  const title = post.seo_title?.trim() || post.title;
  const description =
    (post.meta_description?.trim() || post.excerpt?.trim() || "").slice(0, 160) || undefined;
  const canonical = baseUrl ? `${baseUrl}/blog/${encodeURIComponent(post.slug)}` : undefined;

  let imageUrl: string | undefined;
  const imageId = post.og_image_id || post.featured_image_id;
  if (imageId) {
    try {
      const media = await getMediaById(imageId);
      const url = media?.variants?.[0]?.url;
      if (url) {
        imageUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
      }
    } catch {
      // omit image on error
    }
  }

  const openGraph: Metadata["openGraph"] = {
    title,
    description: description ?? undefined,
    url: canonical,
    type: "article",
    publishedTime: post.published_at ?? undefined,
    ...(imageUrl && { images: [{ url: imageUrl }] }),
  };

  const twitter: Metadata["twitter"] = {
    card: "summary_large_image",
    title,
    description: description ?? undefined,
    ...(imageUrl && { images: [imageUrl] }),
  };

  return {
    title,
    description: description ?? undefined,
    openGraph,
    twitter,
    ...(canonical && { alternates: { canonical } }),
  };
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

  const [author, { categories, tags }, approvedComments] = await Promise.all([
    post.author_id ? getTenantUserById(post.author_id) : Promise.resolve(null),
    getTaxonomyTermsForContentDisplay(post.id, "post"),
    getCommentsByContentId(post.id, "approved"),
  ]);
  const authorLabel = author ? (author.display_name?.trim() || author.email) : null;

  const commentAuthorIds = [...new Set(approvedComments.map((c) => c.author_id).filter(Boolean))] as string[];
  const authorNames: Record<string, string> = {};
  await Promise.all(
    commentAuthorIds.map(async (authId) => {
      authorNames[authId] = await getCommentAuthorDisplayName(authId);
    })
  );
  const commentsForDisplay = approvedComments.map((c) => ({
    id: c.id,
    body: c.body,
    created_at: c.created_at,
    authorName: c.author_id ? authorNames[c.author_id] ?? "Commenter" : "Commenter",
  }));

  const { createServerSupabaseClientSSR } = await import("@/lib/supabase/client");
  const supabase = await createServerSupabaseClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  const verifiedEmail = !!user && !!(user as { email_confirmed_at?: string | null }).email_confirmed_at;
  let canPostComment = false;
  if (user && verifiedEmail) {
    const [member, role] = await Promise.all([
      getMemberByUserId(user.id),
      getRoleForCurrentUser(),
    ]);
    const isStaff = role !== null && (isSuperadminFromRole(role) || isAdminRole(role));
    canPostComment = !!member || isStaff;
  }

  const baseUrl = await getSiteUrl();
  const canonicalUrl = baseUrl ? `${baseUrl}/blog/${encodeURIComponent(post.slug)}` : "";
  const [buttonStyles, config] = await Promise.all([getButtonStyles(), getDesignSystemConfig()]);
  let jsonLdImage: string | undefined;
  const imageId = post.og_image_id || post.featured_image_id;
  if (imageId) {
    try {
      const media = await getMediaById(imageId);
      const url = media?.variants?.[0]?.url;
      if (url) {
        jsonLdImage = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
      }
    } catch {
      // omit
    }
  }
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seo_title?.trim() || post.title,
    description: (post.meta_description?.trim() || post.excerpt?.trim() || "").slice(0, 200) || undefined,
    ...(jsonLdImage && { image: jsonLdImage }),
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at ?? undefined,
    ...(authorLabel && { author: { "@type": "Person", name: authorLabel } }),
    ...(canonicalUrl && { url: canonicalUrl }),
  };

  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
        <PublicContentRenderer content={post.body} buttonStyles={buttonStyles} themeColors={config.colors} />
      </article>
      <BlogPostComments
        contentId={post.id}
        comments={commentsForDisplay}
        canPostComment={canPostComment}
        redirectPath={`/blog/${encodeURIComponent(post.slug)}`}
      />
    </main>
  );
}
