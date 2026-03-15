import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationById } from "@/lib/supabase/organizations";
import { getContactsByOrganizationId } from "@/lib/supabase/organizations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, Building2 } from "lucide-react";
import { OrganizationDetailClient } from "./OrganizationDetailClient";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [org, contacts] = await Promise.all([
    getOrganizationById(id),
    getContactsByOrganizationId(id),
  ]);
  if (!org) notFound();

  const displayName = org.name || "Organization";

  return (
    <div className="space-y-4">
      <Link
        href="/admin/crm/organizations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Link>

      <OrganizationDetailClient
        org={org}
        contacts={contacts}
        displayName={displayName}
      />
    </div>
  );
}
