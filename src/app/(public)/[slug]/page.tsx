import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedContentByTypeAndSlug, getContentByTypeAndSlug } from "@/lib/supabase/content";
import { getButtonStyles, getFormStyles, getDesignSystemConfig, getSiteUrl } from "@/lib/supabase/settings";
import { PublicContentRenderer } from "@/components/public/content/PublicContentRenderer";
import { ShareIntentLinks } from "@/components/blog/ShareIntentLinks";
import { checkContentAccess } from "@/lib/auth/content-access";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole, isSuperadminFromRole } from "@/lib/auth/resolve-role";

interface Props {
  params: Promise<{ slug: string }>;
}

/** True if current user can preview draft pages (admin/superadmin). */
async function canPreviewDraft(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const role = await getRoleForCurrentUser();
  return role !== null && (isSuperadminFromRole(role) || isAdminRole(role));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let page = await getPublishedContentByTypeAndSlug("article", slug);
  if (!page) {
    const anyPage = await getContentByTypeAndSlug("article", slug);
    if (!anyPage || anyPage.status === "published") return { title: "Page Not Found" };
    if (!(await canPreviewDraft())) return { title: "Page Not Found" };
    page = anyPage;
  }
  return { title: page.title };
}

export default async function DynamicPageRoute({ params }: Props) {
  const { slug } = await params;
  let page = await getPublishedContentByTypeAndSlug("article", slug);
  if (!page) {
    const anyPage = await getContentByTypeAndSlug("article", slug);
    if (!anyPage) notFound();
    if (anyPage.status !== "published") {
      const allowed = await canPreviewDraft();
      if (!allowed) notFound();
      page = anyPage;
    } else {
      page = anyPage;
    }
  }
  const isDraft = page.status !== "published";

  const access = await checkContentAccess({
    access_level: (page.access_level as "public" | "members" | "mag") ?? "public",
    required_mag_id: page.required_mag_id ?? null,
    visibility_mode: (page.visibility_mode as "hidden" | "message") ?? "hidden",
    restricted_message: page.restricted_message ?? null,
  });

  if (!access.hasAccess) {
    const returnPath = `/${slug}`;
    const { createServerSupabaseClientSSR } = await import("@/lib/supabase/client");
    const supabase = await createServerSupabaseClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
    }
    return (
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-6">{page.title}</h1>
        <div className="rounded-lg border bg-muted/50 p-6 text-muted-foreground">
          {access.visibilityMode === "message" && access.restrictedMessage
            ? access.restrictedMessage
            : "You don't have access to this page."}
        </div>
      </main>
    );
  }

  const [buttonStyles, formStyles, config, siteUrl] = await Promise.all([
    getButtonStyles(),
    getFormStyles(),
    getDesignSystemConfig(),
    getSiteUrl(),
  ]);
  const canonicalUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}/${encodeURIComponent(page.slug)}` : "";

  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      {isDraft && (
        <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          Draft preview — not visible to the public. Publish the page to make it live.
        </div>
      )}
      <h1 className="text-4xl font-bold mb-6">{page.title}</h1>
      <PublicContentRenderer content={page.body} buttonStyles={buttonStyles} formStyles={formStyles} themeColors={config.colors} />
      {canonicalUrl && (
        <div className="mt-8 pt-6 border-t">
          <ShareIntentLinks url={canonicalUrl} title={page.title} label="Share this page" />
        </div>
      )}
    </main>
  );
}
