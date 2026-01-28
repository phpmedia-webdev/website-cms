import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { NewListForm } from "./NewListForm";

export default function NewListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/crm/lists">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New list</h1>
          <p className="text-muted-foreground mt-1">Create a marketing list</p>
        </div>
      </div>
      <NewListForm />
    </div>
  );
}
