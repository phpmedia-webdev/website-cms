import Link from "next/link";
import { getPublishedPosts } from "@/lib/supabase/content";
import { format } from "date-fns";

export default async function BlogListPage() {
  const posts = await getPublishedPosts(50);
  return (
    <main className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
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
      )}
    </main>
  );
}
