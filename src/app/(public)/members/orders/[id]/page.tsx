import { MembersOrderDetailClient } from "./MembersOrderDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Step 16: Member order detail — view order and status in account section.
 */
export default async function MembersOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <MembersOrderDetailClient orderId={id} />
    </main>
  );
}
