import { notFound } from "next/navigation";
import Link from "next/link";
import { getTermBySlugAndType } from "@/lib/supabase/taxonomy";
import {
  getPublishedPostsByTermId,
  getPublishedPostsCountByTermId,
} from "@/lib/supabase/content";
import { filterContentByAccess } from "@/lib/auth/content-access";
import { format } from "date-fns";

const PAGE_SIZE = 20;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogTagArchivePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const termSlug = decodeURIComponent(slug);
  const term = await getTermBySlugAndType(termSlug, "tag");
  if (!term) notFound();

  const search = await searchParams;
  const page = Math.max(1, parseInt(search.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [allPosts, total] = await Promise.all([
    getPublishedPostsByTermId(term.id, PAGE_SIZE, offset),
    getPublishedPostsCountByTermId(term.id),
  ]);
  const posts = await filterContentByAccess(allPosts);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="container mx-auto px-4 py-16">
      <Link href="/blog" className="text-sm text-muted-foreground hover:underline mb-6 inline-block">
        ← Back to Blog
      </Link>
      <h1 className="text-4xl font-bold mb-8">Tag: {term.name}</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts with this tag yet.</p>
      ) : (
        <>
          <ul className="space-y-6">
            {posts.map((post) => (
              <li key={post.id} className="border-b pb-6 last:border-0">
                <Link href={`/blog/${post.slug}`} className="block group">
                  <h2 className="text-xl font-semibold group-hover:underline">{post.title}</h2>
                  {post.published_at && (
                    <time className="text-sm text-muted-foreground" dateTime={post.published_at}>
                      {format(new Date(post.published_at), "MMM d, yyyy")}
                    </time>
                  )}
                  {post.excerpt && (
                    <p className="mt-2 text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Pagination">
              {page > 1 ? (
                <Link
                  href={page === 2 ? `/blog/tag/${slug}` : `/blog/tag/${slug}?page=${page - 1}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">← Previous</span>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/blog/tag/${slug}?page=${page + 1}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Next →
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">Next →</span>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
