/**
 * Client helpers for /api/tasks/[id]/resources (admin).
 * Draft rows match event_resources / task_resources shape; applied via PUT on task save.
 */

export interface TaskResourceAssignmentDto {
  resource_id: string;
  bundle_instance_id: string | null;
  name: string;
  resource_type: string;
}

/** Draft row for task resources (applied when the task edit form is saved). */
export type TaskResourceAssignmentDraft = {
  resource_id: string;
  bundle_instance_id: string | null;
  /** Bundle definition id when this row came from a bundle apply; UI label only (stripped by PUT). */
  source_bundle_id?: string | null;
};

export async function fetchTaskResources(
  taskId: string
): Promise<TaskResourceAssignmentDto[]> {
  const res = await fetch(`/api/tasks/${taskId}/resources`, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as {
    data?: TaskResourceAssignmentDto[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error ?? `Failed to load resources (${res.status})`);
  }
  return json.data ?? [];
}

export async function addTaskResource(
  taskId: string,
  body: { resource_id: string; bundle_instance_id?: string | null }
): Promise<void> {
  const res = await fetch(`/api/tasks/${taskId}/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `Failed to add resource (${res.status})`);
  }
}

export async function removeTaskResource(
  taskId: string,
  body: { resource_id: string } | { bundle_instance_id: string }
): Promise<void> {
  const res = await fetch(`/api/tasks/${taskId}/resources`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `Failed to remove resource (${res.status})`);
  }
}

export async function replaceTaskResourceAssignments(
  taskId: string,
  assignments: TaskResourceAssignmentDraft[]
): Promise<void> {
  const res = await fetch(`/api/tasks/${taskId}/resources`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignments }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `Failed to save resource assignments (${res.status})`);
  }
}
