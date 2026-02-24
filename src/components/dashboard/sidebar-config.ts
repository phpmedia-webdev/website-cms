import type { LucideIcon } from "lucide-react";
import {
  Image,
  Folder,
  ClipboardList,
  Inbox,
  Users,
  KeyRound,
  ListChecks,
  Calendar,
  Box,
  Settings,
  Palette,
  Tags,
  Sliders,
  User,
  MessageCircle,
  BookOpen,
  Briefcase,
  Shield,
  ShieldCheck,
  Code,
} from "lucide-react";

/** Session storage keys for sidebar accordion open state. */
export const SIDEBAR_SETTINGS_OPEN = "sidebar-settings-open";
export const SIDEBAR_MEDIA_OPEN = "sidebar-media-open";
export const SIDEBAR_CONTENT_OPEN = "sidebar-content-open";
export const SIDEBAR_CRM_OPEN = "sidebar-crm-open";
export const SIDEBAR_MARKETING_OPEN = "sidebar-marketing-open";
export const SIDEBAR_CALENDAR_OPEN = "sidebar-calendar-open";
export const SIDEBAR_SUPPORT_OPEN = "sidebar-support-open";
export const SIDEBAR_SUPER_OPEN = "sidebar-super-open";

export interface SubNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  featureSlug?: string;
  adminOnly?: boolean;
}

export const mediaSubNav: SubNavItem[] = [
  { name: "Library", href: "/admin/media", icon: Image, featureSlug: "library" },
  { name: "Galleries", href: "/admin/galleries", icon: Folder, featureSlug: "galleries" },
];

export const crmSubNav: SubNavItem[] = [
  { name: "Contacts", href: "/admin/crm/contacts", icon: Users, featureSlug: "contacts" },
  { name: "Forms", href: "/admin/crm/forms", icon: ClipboardList, featureSlug: "forms" },
  { name: "Form Submissions", href: "/admin/crm/forms/submissions", icon: Inbox, featureSlug: "form_submissions" },
  { name: "Memberships", href: "/admin/crm/memberships", icon: Folder, featureSlug: "memberships" },
  { name: "Code Generator", href: "/admin/crm/memberships/code-generator", icon: KeyRound, featureSlug: "code_generator" },
];

export const marketingSubNav: SubNavItem[] = [
  { name: "Lists", href: "/admin/crm/lists", icon: ListChecks },
];

export const calendarSubNav: SubNavItem[] = [
  { name: "Calendar", href: "/admin/events", icon: Calendar },
  { name: "Resources", href: "/admin/events/resources", icon: Box },
];

export const settingsSubNav: SubNavItem[] = [
  { name: "General", href: "/admin/settings/general", icon: Settings, featureSlug: "general" },
  { name: "Style", href: "/admin/settings/style", icon: Palette, featureSlug: "style" },
  { name: "Taxonomy", href: "/admin/settings/taxonomy", icon: Tags, featureSlug: "taxonomy" },
  { name: "Customizer", href: "/admin/settings/customizer", icon: Sliders, featureSlug: "customizer" },
  { name: "Users", href: "/admin/settings/users", icon: Users, featureSlug: "users", adminOnly: true },
  { name: "My Profile", href: "/admin/settings/profile", icon: User },
];

export const supportSubNav: SubNavItem[] = [
  { name: "Quick Support", href: "/admin/support/quick-support", icon: MessageCircle },
  { name: "Knowledge Base", href: "/admin/support/knowledge-base", icon: BookOpen },
  { name: "WorkHub", href: "https://desktop.phpmedia.com/", icon: Briefcase },
];

export const superadminSubNav: SubNavItem[] = [
  { name: "Dashboard", href: "/admin/super", icon: Shield },
  { name: "Tenant Users", href: "/admin/super/tenant-users", icon: Users },
  { name: "Roles", href: "/admin/super/roles", icon: ShieldCheck },
  { name: "Code Library", href: "/admin/super/code-library", icon: Code },
  { name: "Security", href: "/admin/super/security", icon: Shield },
];
