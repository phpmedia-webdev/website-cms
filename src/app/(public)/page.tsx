import { getPublishedContentByTypeAndSlug } from "@/lib/supabase/content";
import { RichTextDisplay } from "@/components/editor/RichTextDisplay";

export default async function HomePage() {
  const page = await getPublishedContentByTypeAndSlug("page", "/");
  if (!page) {
    return (
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Welcome</h1>
        <p className="text-lg text-muted-foreground">
          This is the public homepage. Add a published page with slug <code className="rounded bg-muted px-1">/</code> to display it here.
        </p>
      </main>
    );
  }
  return (
    <main className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">{page.title}</h1>
      <RichTextDisplay content={page.body} />
    </main>
  );
}
