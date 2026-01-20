import { StatsCard } from "@/components/dashboard/StatsCard";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { FileText, FolderImage, Images, FormInput } from "lucide-react";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  // Fetch stats
  const [postsResult, galleriesResult, mediaResult, formsResult] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("galleries").select("id", { count: "exact", head: true }),
    supabase.from("media").select("id", { count: "exact", head: true }),
    supabase.from("forms").select("id", { count: "exact", head: true }),
  ]);

  const stats = {
    posts: postsResult.count || 0,
    galleries: galleriesResult.count || 0,
    media: mediaResult.count || 0,
    forms: formsResult.count || 0,
  };

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
          icon={FolderImage}
          description="Gallery collections"
        />
        <StatsCard
          title="Media"
          value={stats.media}
          icon={Images}
          description="Images and videos"
        />
        <StatsCard
          title="Forms"
          value={stats.forms}
          icon={FormInput}
          description="Active forms"
        />
      </div>
    </div>
  );
}
