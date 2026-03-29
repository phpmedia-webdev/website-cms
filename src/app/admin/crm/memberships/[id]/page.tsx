import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMagById, getContactsByMag, getMags } from "@/lib/supabase/crm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAGDetailClient } from "./MAGDetailClient";

export default async function MAGDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const tabRaw = sp.tab;
  const tabParam = Array.isArray(tabRaw) ? tabRaw[0] : tabRaw;
  const initialTab = tabParam === "comments" ? "comments" : "context";

  const [mag, contacts, allMags] = await Promise.all([
    getMagById(id),
    getContactsByMag(id),
    getMags(true),
  ]);

  if (!mag) {
    notFound();
  }

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/crm/memberships" className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Memberships
        </Link>
      </Button>
      <Suspense fallback={<p className="text-sm text-muted-foreground px-1">Loading…</p>}>
        <MAGDetailClient
          mag={mag}
          allMags={allMags}
          initialContacts={contacts}
          initialTab={initialTab}
        />
      </Suspense>
    </div>
  );
}
