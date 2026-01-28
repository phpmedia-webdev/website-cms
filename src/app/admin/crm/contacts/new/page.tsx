import Link from "next/link";
import { NewContactForm } from "./NewContactForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewContactPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/crm/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New contact</h1>
          <p className="text-muted-foreground mt-1">Add a contact to the CRM</p>
        </div>
      </div>
      <NewContactForm />
    </div>
  );
}
