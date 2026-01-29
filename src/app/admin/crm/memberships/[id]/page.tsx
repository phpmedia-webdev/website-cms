import { notFound } from "next/navigation";
import Link from "next/link";
import { getMagById, getContactsByMag } from "@/lib/supabase/crm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAGDetailClient } from "./MAGDetailClient";

export default async function MAGDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [mag, contacts] = await Promise.all([
    getMagById(id),
    getContactsByMag(id),
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
      <MAGDetailClient mag={mag} initialContacts={contacts} />
    </div>
  );
}
