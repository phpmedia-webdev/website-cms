import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getMagById } from "@/lib/supabase/crm";
import { ArrowLeft } from "lucide-react";
import { BatchExploreClient } from "./BatchExploreClient";

const SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export default async function BatchExplorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: batch, error } = await supabase
    .schema(SCHEMA)
    .from("membership_code_batches")
    .select("id, mag_id, name, use_type, code_plain, max_uses, use_count, num_codes, expires_at, created_at")
    .eq("id", id)
    .single();

  if (error || !batch) notFound();

  const mag = await getMagById(batch.mag_id);
  const magName = mag ? `${mag.name} (${mag.uid})` : batch.mag_id;

  let totalCodes = 0;
  let redeemedCount = 0;
  if (batch.use_type === "single_use") {
    const { count } = await supabase
      .schema(SCHEMA)
      .from("membership_codes")
      .select("*", { count: "exact", head: true })
      .eq("batch_id", id);
    totalCodes = count ?? 0;
    const { count: redeemed } = await supabase
      .schema(SCHEMA)
      .from("membership_codes")
      .select("*", { count: "exact", head: true })
      .eq("batch_id", id)
      .eq("status", "redeemed");
    redeemedCount = redeemed ?? 0;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/crm/memberships/code-generator"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Code Generator
        </Link>
      </div>
      <BatchExploreClient
        batchId={id}
        batchName={batch.name}
        useType={batch.use_type as "single_use" | "multi_use"}
        magName={magName}
        codePlain={batch.code_plain ?? null}
        expiresAt={batch.expires_at ?? null}
        totalCodes={totalCodes}
        redeemedCount={redeemedCount}
        useCount={batch.use_count ?? 0}
        maxUses={batch.max_uses ?? null}
      />
    </div>
  );
}
