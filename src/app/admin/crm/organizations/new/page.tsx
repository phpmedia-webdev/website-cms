import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { NewOrganizationForm } from "./NewOrganizationForm";

export default function NewOrganizationPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/admin/crm/organizations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Link>
      <NewOrganizationForm />
    </div>
  );
}
