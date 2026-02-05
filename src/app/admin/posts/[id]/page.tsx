import { redirect } from "next/navigation";

export default async function EditPostRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/content/${id}/edit`);
}
