/** Task follower row with resolved display name (UI / API). */
export interface TaskFollowerWithLabel {
  id: string;
  role: string;
  contact_id: string | null;
  user_id: string | null;
  label: string;
}
