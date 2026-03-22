/**
 * Stable composite keys for Directory participant pickers (team_member / crm_contact).
 * Use everywhere assignments store source_type + source_id so pickers stay consistent.
 */

export type DirectoryParticipantSourceType = "team_member" | "crm_contact";

export function toDirectoryParticipantCompositeId(
  sourceType: DirectoryParticipantSourceType,
  sourceId: string
): string {
  return `${sourceType}:${sourceId}`;
}

export function parseDirectoryParticipantCompositeId(
  compositeId: string
): { source_type: DirectoryParticipantSourceType; source_id: string } | null {
  if (compositeId.startsWith("team_member:")) {
    return { source_type: "team_member", source_id: compositeId.slice("team_member:".length) };
  }
  if (compositeId.startsWith("crm_contact:")) {
    return { source_type: "crm_contact", source_id: compositeId.slice("crm_contact:".length) };
  }
  return null;
}
