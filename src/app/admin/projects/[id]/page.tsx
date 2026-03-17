import { notFound } from "next/navigation";
import { getProjectById, listTasks } from "@/lib/supabase/projects";
import { listOrders } from "@/lib/shop/orders";
import { listInvoices } from "@/lib/shop/invoices";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, tasks, projectOrders, projectInvoices] = await Promise.all([
    getProjectById(id),
    listTasks({ project_id: id }),
    listOrders({ project_id: id, limit: 100 }),
    listInvoices({ project_id: id, limit: 100 }),
  ]);
  if (!project) notFound();

  const projectTotal = projectOrders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <ProjectDetailClient
      project={project}
      initialTasks={tasks}
      initialOrders={projectOrders}
      initialInvoices={projectInvoices}
      projectTotal={projectTotal}
    />
  );
}
