import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { PostEditor } from "@/components/posts/PostEditor";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !post) {
    notFound();
  }

  return <PostEditor post={post} />;
}
