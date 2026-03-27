import type { MessageCenterStreamFilter } from "@/lib/message-center/admin-stream";

/** Admin dashboard Message Center filter dropdown (value matches `getAdminMessageCenterStream` filter). */
export const MESSAGE_CENTER_ADMIN_FILTER_OPTIONS: {
  value: MessageCenterStreamFilter;
  label: string;
}[] = [
  { value: "all", label: "View all" },
  { value: "conversations", label: "Messages" },
  { value: "comments", label: "Comments" },
  { value: "notes", label: "Notes" },
  { value: "requires_moderation", label: "Requires moderation" },
  { value: "notifications", label: "Notifications" },
  { value: "notification_timeline", label: "Activities" },
  { value: "order", label: "Transactions" },
];
