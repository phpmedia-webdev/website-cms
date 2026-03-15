import { notFound } from "next/navigation";
import { getInvoiceWithLines } from "@/lib/shop/invoices";
import { getClientSchema } from "@/lib/supabase/schema";
import { InvoiceDetailClient } from "./InvoiceDetailClient";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const schema = getClientSchema();
  const invoice = await getInvoiceWithLines(id, schema);
  if (!invoice) notFound();
  return <InvoiceDetailClient invoiceId={id} initialInvoice={invoice} />;
}
