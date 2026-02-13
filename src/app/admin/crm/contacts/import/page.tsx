import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ImportContactsClient } from "./ImportContactsClient";

export default function ImportContactsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/crm/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Import contacts</h1>
          <p className="text-muted-foreground mt-1">
            Upload a CSV and map columns to CRM fields
          </p>
        </div>
      </div>
      <ImportContactsClient />
    </div>
  );
}
