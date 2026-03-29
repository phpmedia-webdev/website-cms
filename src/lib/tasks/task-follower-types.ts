/** Task follower row with resolved display name (UI / API). */
export interface TaskFollowerWithLabel {
  id: string;
  role: string;
  contact_id: string | null;
  user_id: string | null;
  label: string;
  /** From CRM first+last or profile custom fields (+ email); never from marketing display label. */
  avatar_initials?: string;
}

/** Linked CRM contact on a task (`tasks.contact_id`): label is display name; initials from structured name. */
export type TaskLinkedContactSummary = {
  id: string;
  label: string;
  avatar_initials?: string;
};
