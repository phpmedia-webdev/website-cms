import { StatsCard } from "@/components/dashboard/StatsCard";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { FileText, Folder, Image, ClipboardList } from "lucide-react";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  // Fetch stats with error handling
  let stats = {
    posts: 0,
    galleries: 0,
    media: 0,
    forms: 0,
  };

  try {
    const [postsResult, galleriesResult, mediaResult, formsResult] = await Promise.all([
      supabase.schema(schema).from("posts").select("id", { count: "exact", head: true }),
      supabase.schema(schema).from("galleries").select("id", { count: "exact", head: true }),
      supabase.schema(schema).from("media").select("id", { count: "exact", head: true }),
      supabase.schema(schema).from("forms").select("id", { count: "exact", head: true }),
    ]);

    stats = {
      posts: postsResult.count || 0,
      galleries: galleriesResult.count || 0,
      media: mediaResult.count || 0,
      forms: formsResult.count || 0,
    };
  } catch (error) {
    // Stats will remain at 0 if there's an error
    // Error is silently handled to prevent page breakage
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your CMS administration panel
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Posts"
          value={stats.posts}
          icon={FileText}
          description="Total blog posts"
        />
        <StatsCard
          title="Galleries"
          value={stats.galleries}
          icon={Folder}
          description="Gallery collections"
        />
        <StatsCard
          title="Media"
          value={stats.media}
          icon={Image}
          description="Images and videos"
        />
        <StatsCard
          title="Forms"
          value={stats.forms}
          icon={ClipboardList}
          description="Active forms"
        />
      </div>
    </div>
  );
}
