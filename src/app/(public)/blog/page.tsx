import Link from "next/link";
import { getPublishedPosts, getPublishedPostsCount } from "@/lib/supabase/content";
import { filterContentByAccess } from "@/lib/auth/content-access";
import { format } from "date-fns";

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogListPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [allPosts, total] = await Promise.all([
    getPublishedPosts(PAGE_SIZE, offset),
    getPublishedPostsCount(),
  ]);
  const posts = await filterContentByAccess(allPosts);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
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
            <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Blog pagination">
              {page > 1 ? (
                <Link
                  href={page === 2 ? "/blog" : `/blog?page=${page - 1}`}
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
                  href={`/blog?page=${page + 1}`}
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
