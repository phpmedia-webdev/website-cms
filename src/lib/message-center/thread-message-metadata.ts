/**
 * Shared checks for `thread_messages.metadata` (MAG broadcasts, etc.).
 */

export function threadMessageIsAdminBroadcast(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || metadata === null) return false;
  return (metadata as Record<string, unknown>).source === "admin_broadcast";
}
