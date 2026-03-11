import { getPublishedContentByTypeAndSlug } from "@/lib/supabase/content";
import { getButtonStyles, getFormStyles, getDesignSystemConfig } from "@/lib/supabase/settings";
import { PublicContentRenderer } from "@/components/public/content/PublicContentRenderer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const page = await getPublishedContentByTypeAndSlug("article", "home");
  if (!page) {
    return (
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Welcome</h1>
        <p className="text-lg text-muted-foreground">
          This is the public homepage. Add a published article with slug <code className="rounded bg-muted px-1">home</code> to display it here.
        </p>
      </main>
    );
  }
  const body = page.body ?? undefined;
  const [buttonStyles, formStyles, config] = await Promise.all([getButtonStyles(), getFormStyles(), getDesignSystemConfig()]);
  return (
    <main className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">{page.title}</h1>
      {body ? (
        <div className="space-y-4">
          <PublicContentRenderer content={body} buttonStyles={buttonStyles} formStyles={formStyles} themeColors={config.colors} />
        </div>
      ) : (
        <p className="text-muted-foreground">No body content. (Check that body exists in database.)</p>
      )}
    </main>
  );
}
