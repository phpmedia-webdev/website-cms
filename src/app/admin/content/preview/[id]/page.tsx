import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getContentByIdServer } from "@/lib/supabase/content";
import { getButtonStyles, getFormStyles, getDesignSystemConfig } from "@/lib/supabase/settings";
import { PublicContentRenderer } from "@/components/public/content/PublicContentRenderer";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Admin-only preview for any content item (snippet, FAQ, quote, article, etc.) that does not
 * have a public URL. Renders the content body with full shortcode support (galleries, forms,
 * buttons) so editors can see how it will look when embedded.
 */
export default async function ContentPreviewPage({ params }: Props) {
  const { id } = await params;
  const content = await getContentByIdServer(id);
  if (!content) notFound();

  const [buttonStyles, formStyles, config] = await Promise.all([
    getButtonStyles(),
    getFormStyles(),
    getDesignSystemConfig(),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href={`/admin/content/${id}/edit`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to edit
        </Link>
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 mb-6">
          Content preview — this is how the body will look when embedded (e.g. in a snippet, layout, or coming soon). Draft content is shown.
        </div>
        <h1 className="text-2xl font-bold mb-2">{content.title}</h1>
        {content.excerpt && (
          <p className="text-muted-foreground mb-6">{content.excerpt}</p>
        )}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <PublicContentRenderer
            content={content.body}
            buttonStyles={buttonStyles}
            formStyles={formStyles}
            themeColors={config.colors}
          />
        </div>
      </div>
    </main>
  );
}
