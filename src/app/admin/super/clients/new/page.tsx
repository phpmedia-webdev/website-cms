import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { AddClientForm } from "./AddClientForm";

/**
 * Superadmin: add new client/tenant.
 */
export default async function NewClientPage() {
  const user = await getCurrentUser();
  if (!user || !isSuperadmin(user)) redirect("/admin/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/super/clients"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Clients
        </Link>
        <h1 className="text-3xl font-bold mt-2">Add client</h1>
        <p className="text-muted-foreground mt-1">
          Register a new tenant/site. Schema name must match the Supabase schema for this deployment.
        </p>
      </div>

      <AddClientForm />
    </div>
  );
}
