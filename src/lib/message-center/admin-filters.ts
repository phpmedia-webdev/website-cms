import type { MessageCenterStreamFilter } from "@/lib/message-center/admin-stream";

/** Admin dashboard Message Center filter dropdown (value matches `getAdminMessageCenterStream` filter). */
export const MESSAGE_CENTER_ADMIN_FILTER_OPTIONS: {
  value: MessageCenterStreamFilter;
  label: string;
}[] = [
  { value: "all", label: "View all" },
  { value: "conversations", label: "Messages (threads only)" },
  { value: "notifications", label: "Notifications only" },
  { value: "notification_timeline", label: "Contact timeline" },
  { value: "blog_comment", label: "Blog comments" },
  { value: "form_submission", label: "Form submissions" },
  { value: "contact_added", label: "Contact added" },
  { value: "mag_assignment", label: "MAG assignment" },
  { value: "marketing_list", label: "Marketing list" },
  { value: "order", label: "Transactions" },
  { value: "support", label: "Support threads" },
  { value: "task_ticket", label: "Task threads" },
  { value: "mag_group", label: "MAG threads" },
];
