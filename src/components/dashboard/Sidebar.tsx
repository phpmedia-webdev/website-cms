"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  FileText,
  Image,
  Settings,
  Shield,
  LogOut,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Type,
  Building2,
  Mail,
  LifeBuoy,
  MessageCircle,
  Calendar,
  ShoppingBag,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { canAccessFeature } from "@/lib/admin/route-features";
import {
  SIDEBAR_SETTINGS_OPEN,
  SIDEBAR_MEDIA_OPEN,
  SIDEBAR_CONTENT_OPEN,
  SIDEBAR_CRM_OPEN,
  SIDEBAR_MARKETING_OPEN,
  SIDEBAR_CALENDAR_OPEN,
  SIDEBAR_SUPPORT_OPEN,
  SIDEBAR_SUPER_OPEN,
  SIDEBAR_ECOM_OPEN,
  SIDEBAR_PROJECTS_OPEN,
  mediaSubNav,
  crmSubNav,
  marketingSubNav,
  calendarSubNav,
  ecommerceSubNav,
  projectsSubNav,
  settingsSubNav,
  supportSubNav,
  superadminSubNav,
} from "./sidebar-config";

const UPGRADE_PATH = "/admin/upgrade";

interface SidebarProps {
  isSuperadmin?: boolean;
  /** Effective feature slugs for current user; "all" = show everything. */
  effectiveFeatureSlugs?: string[] | "all";
  /** Role-only feature slugs (Phase F). When set, hide items not in role; ghost items in role but not in effective. */
  roleFeatureSlugs?: string[] | "all";
  /** When set and user is superadmin, sidebar uses this for link vs ghost display only (gate state); guards unchanged. */
  sidebarDisplayFeatureSlugs?: string[] | null;
  /** If true, show Settings → Users link. Only admins (tenant admin or superadmin) can manage team. */
  canManageTeam?: boolean;
  /** Slugs hidden from sidebar (Display OFF). Sections with these slugs are omitted entirely. */
  hiddenFeatureSlugs?: string[] | null;
}

export function Sidebar({ isSuperadmin = false, effectiveFeatureSlugs = "all", roleFeatureSlugs = "all", sidebarDisplayFeatureSlugs = null, canManageTeam = false, hiddenFeatureSlugs = null }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseClient();

  /** For sidebar display only: superadmin sees gate state (ghost when gate off); others use effective. */
  const displayEffectiveSlugs: string[] | "all" =
    isSuperadmin && Array.isArray(sidebarDisplayFeatureSlugs) ? sidebarDisplayFeatureSlugs : effectiveFeatureSlugs;
  /** When true, ghosted items are display-only: show as ghost but Superadmin can still open (Link); no upgrade redirect. */
  const isDisplayOnlyGhost = isSuperadmin && Array.isArray(sidebarDisplayFeatureSlugs);

  /** Phase F: in role = allowed by role (ignore tenant). When roleFeatureSlugs === "all", always true. */
  const hasRoleAccess = (slug: string) =>
    roleFeatureSlugs === "all" || canAccessFeature(roleFeatureSlugs, slug);
  /** In display list (tenant gate when view-as/superadmin, else effective). Drives what appears in nav. */
  const hasEffectiveAccess = (slug: string) =>
    displayEffectiveSlugs === "all" || canAccessFeature(displayEffectiveSlugs, slug);
  /** Real effective = tenant ∩ role (guard). Used so sub-items show ghosted when in display but not in effective. */
  const hasRealEffectiveAccess = (slug: string) =>
    effectiveFeatureSlugs === "all" || canAccessFeature(effectiveFeatureSlugs, slug);
  /** Hidden slugs (Display OFF): omit these sections from sidebar entirely. */
  const hiddenSet = new Set(hiddenFeatureSlugs ?? []);
  const isSettings = pathname === "/admin/settings" || pathname?.startsWith("/admin/settings/");
  const isSupport = pathname === "/admin/support" || pathname?.startsWith("/admin/support/");
  const isCrm =
    (pathname === "/admin/crm" || pathname?.startsWith("/admin/crm/")) &&
    !pathname?.startsWith("/admin/crm/omnichat") &&
    !pathname?.startsWith("/admin/crm/marketing") &&
    pathname !== "/admin/crm/lists" &&
    !pathname?.startsWith("/admin/crm/lists/");
  const isMarketing =
    pathname === "/admin/crm/marketing" ||
    pathname === "/admin/crm/lists" ||
    pathname?.startsWith("/admin/crm/lists/") ||
    pathname === "/admin/crm/templates" ||
    pathname?.startsWith("/admin/crm/templates/") ||
    pathname === "/admin/crm/memberships/code-generator" ||
    pathname?.startsWith("/admin/crm/memberships/code-generator/") ||
    pathname === "/admin/crm/reviews" ||
    pathname?.startsWith("/admin/crm/reviews/");
  const isEvents = pathname === "/admin/events" || pathname?.startsWith("/admin/events/");
  const isMedia = pathname === "/admin/media" || pathname?.startsWith("/admin/media/") || pathname === "/admin/galleries" || pathname?.startsWith("/admin/galleries/");
  const isContent = pathname === "/admin/content" || pathname?.startsWith("/admin/content/");
  const isEcommerce = pathname === "/admin/ecommerce" || pathname?.startsWith("/admin/ecommerce/");
  const isProjects = pathname === "/admin/projects" || pathname?.startsWith("/admin/projects/");
  const isSuper = pathname === "/admin/super" || pathname?.startsWith("/admin/super/");

  const showDashboard =
    !hiddenSet.has("dashboard") &&
    (displayEffectiveSlugs === "all" ||
      (Array.isArray(displayEffectiveSlugs) &&
        (displayEffectiveSlugs.length === 0 || displayEffectiveSlugs.includes("dashboard")))) &&
    (roleFeatureSlugs === "all" || hasRoleAccess("dashboard"));
  const showCrmByRole =
    hasRoleAccess("crm") ||
    hasRoleAccess("contacts") ||
    hasRoleAccess("forms") ||
    hasRoleAccess("marketing") ||
    hasRoleAccess("memberships");
  const showCrmEffective =
    canAccessFeature(displayEffectiveSlugs, "crm") ||
    canAccessFeature(displayEffectiveSlugs, "contacts") ||
    canAccessFeature(displayEffectiveSlugs, "forms") ||
    canAccessFeature(displayEffectiveSlugs, "marketing") ||
    canAccessFeature(displayEffectiveSlugs, "memberships");
  const showCrm = (showCrmEffective || (isDisplayOnlyGhost && showCrmByRole)) && (roleFeatureSlugs === "all" || showCrmByRole);
  const showMediaByRole = hasRoleAccess("media") || hasRoleAccess("library") || hasRoleAccess("galleries");
  const showMediaEffective =
    canAccessFeature(displayEffectiveSlugs, "media") ||
    canAccessFeature(displayEffectiveSlugs, "library") ||
    canAccessFeature(displayEffectiveSlugs, "galleries");
  const showMedia = !hiddenSet.has("media") && (showMediaEffective || (isDisplayOnlyGhost && showMediaByRole)) && (roleFeatureSlugs === "all" || showMediaByRole);
  const showContent =
    !hiddenSet.has("content") &&
    canAccessFeature(displayEffectiveSlugs, "content") && (roleFeatureSlugs === "all" || hasRoleAccess("content"));
  const showEcommerce = showContent;
  const showProjectsByRole = hasRoleAccess("projects");
  const showProjectsEffective = canAccessFeature(displayEffectiveSlugs, "projects");
  const showProjects = !hiddenSet.has("projects") && (showProjectsEffective || (isDisplayOnlyGhost && showProjectsByRole)) && (roleFeatureSlugs === "all" || showProjectsByRole);
  const showMarketingByRole = hasRoleAccess("marketing") || hasRoleAccess("lists") || hasRoleAccess("templates") || hasRoleAccess("code_generator") || hasRoleAccess("reviews");
  const showMarketingEffective = canAccessFeature(displayEffectiveSlugs, "marketing") || canAccessFeature(displayEffectiveSlugs, "templates") || canAccessFeature(displayEffectiveSlugs, "code_generator") || canAccessFeature(displayEffectiveSlugs, "reviews");
  const showMarketing = (showMarketingEffective || (isDisplayOnlyGhost && showMarketingByRole)) && (roleFeatureSlugs === "all" || showMarketingByRole);
  const showCalendarByRole =
    hasRoleAccess("content") ||
    hasRoleAccess("calendar") ||
    hasRoleAccess("events") ||
    hasRoleAccess("resources");
  const showCalendarEffective =
    canAccessFeature(displayEffectiveSlugs, "content") ||
    canAccessFeature(displayEffectiveSlugs, "calendar") ||
    canAccessFeature(displayEffectiveSlugs, "events") ||
    canAccessFeature(displayEffectiveSlugs, "resources");
  const showCalendar = !hiddenSet.has("calendar") && (showCalendarEffective || (isDisplayOnlyGhost && showCalendarByRole)) && (roleFeatureSlugs === "all" || showCalendarByRole);
  const showSettings =
    !hiddenSet.has("settings") &&
    canAccessFeature(effectiveFeatureSlugs, "settings") && (roleFeatureSlugs === "all" || hasRoleAccess("settings"));
  const showSupportByRole =
    hasRoleAccess("support") ||
    hasRoleAccess("quick_support") ||
    hasRoleAccess("knowledge_base") ||
    hasRoleAccess("workhub");
  const showSupportEffective =
    canAccessFeature(displayEffectiveSlugs, "support") ||
    canAccessFeature(displayEffectiveSlugs, "quick_support") ||
    canAccessFeature(displayEffectiveSlugs, "knowledge_base") ||
    canAccessFeature(displayEffectiveSlugs, "workhub");
  const showSupport = !hiddenSet.has("support") && (showSupportEffective || (isDisplayOnlyGhost && showSupportByRole)) && (roleFeatureSlugs === "all" || showSupportByRole);
  const showOmniChat =
    canAccessFeature(displayEffectiveSlugs, "omnichat") && (roleFeatureSlugs === "all" || hasRoleAccess("crm") || hasRoleAccess("omnichat"));

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [ecomOpen, setEcomOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [superOpen, setSuperOpen] = useState(false);
  const [newContactsCount, setNewContactsCount] = useState(0);

  const fetchNewContactsCount = async () => {
    try {
      const res = await fetch("/api/crm/contacts/new-count");
      if (res.ok) {
        const { count } = await res.json();
        setNewContactsCount(typeof count === "number" ? count : 0);
      } else {
        setNewContactsCount(0);
      }
    } catch {
      setNewContactsCount(0);
    }
  };

  // Load badge count on mount and whenever the user navigates within admin (auth is ready then).
  useEffect(() => {
    if (pathname?.startsWith("/admin")) {
      fetchNewContactsCount();
    }
  }, [pathname]);

  // Refresh when the user returns to the tab (e.g. after updating a contact elsewhere).
  useEffect(() => {
    const onFocus = () => fetchNewContactsCount();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Refresh badge when CRM data changes (bulk action, import, etc.) without leaving the page.
  useEffect(() => {
    const onCrmDataChanged = () => fetchNewContactsCount();
    window.addEventListener("crm-data-changed", onCrmDataChanged);
    return () => window.removeEventListener("crm-data-changed", onCrmDataChanged);
  }, []);

  // Pathname-driven sidebar: Dashboard collapses all; only one section open at a time
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDashboard = pathname === "/admin/dashboard";
    try {
      if (isDashboard) {
        setCrmOpen(false);
        setMarketingOpen(false);
        setCalendarOpen(false);
        setMediaOpen(false);
        setEcomOpen(false);
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        return;
      }
      if (isCrm && !isMarketing) {
        setCrmOpen(true);
        setMarketingOpen(false);
        setCalendarOpen(false);
        setMediaOpen(false);
        setEcomOpen(false);
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "true");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        return;
      }
      if (isMarketing) {
        setCrmOpen(false);
        setMarketingOpen(true);
        setCalendarOpen(false);
        setMediaOpen(false);
        setEcomOpen(false);
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "true");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        return;
      }
      if (isEvents) {
        setCrmOpen(false);
        setMarketingOpen(false);
        setCalendarOpen(true);
        setMediaOpen(false);
        setEcomOpen(false);
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "true");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        return;
      }
      if (isMedia) {
        setCrmOpen(false);
        setMarketingOpen(false);
        setCalendarOpen(false);
        setMediaOpen(true);
        setEcomOpen(false);
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "true");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        return;
      }
      if (isEcommerce) {
        setCrmOpen(false);
        setMarketingOpen(false);
        setCalendarOpen(false);
        setMediaOpen(false);
        setEcomOpen(true);
        setProjectsOpen(false);
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "true");
        localStorage.setItem(SIDEBAR_PROJECTS_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        return;
      }
      if (isProjects) {
        setCrmOpen(false);
        setMarketingOpen(false);
        setCalendarOpen(false);
        setMediaOpen(false);
        setEcomOpen(false);
        setProjectsOpen(true);
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_PROJECTS_OPEN, "true");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        return;
      }
      if (isSettings) {
        setCrmOpen(false);
        setMarketingOpen(false);
        setCalendarOpen(false);
        setMediaOpen(false);
        setEcomOpen(false);
        setProjectsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        setSettingsOpen(true);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_PROJECTS_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "true");
        return;
      }
      if (isSupport) {
        setCrmOpen(false);
        setMarketingOpen(false);
        setCalendarOpen(false);
        setMediaOpen(false);
        setEcomOpen(false);
        setSettingsOpen(false);
        setSupportOpen(true);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "true");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        return;
      }
      if (isSuper) {
        setCrmOpen(false);
        setMarketingOpen(false);
        setCalendarOpen(false);
        setMediaOpen(false);
        setEcomOpen(false);
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(true);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "true");
        return;
      }
      // Other routes: collapse all
      setCrmOpen(false);
      setMarketingOpen(false);
      setCalendarOpen(false);
      setMediaOpen(false);
      setEcomOpen(false);
      setSettingsOpen(false);
      setSupportOpen(false);
      setSuperOpen(false);
      localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
      localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
      localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
      localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
      localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
      localStorage.setItem(SIDEBAR_PROJECTS_OPEN, "false");
      localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
      localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
      localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
      localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
    } catch {
      if (isCrm && !isMarketing) setCrmOpen(true);
      if (isMarketing) setMarketingOpen(true);
      if (isEvents) setCalendarOpen(true);
      if (isMedia) setMediaOpen(true);
      if (isEcommerce) setEcomOpen(true);
      if (isProjects) setProjectsOpen(true);
      if (isSettings) setSettingsOpen(true);
      if (isSupport) setSupportOpen(true);
      if (isSuper) setSuperOpen(true);
    }
  }, [pathname, isCrm, isMarketing, isEvents, isMedia, isEcommerce, isProjects, isSettings, isSupport, isSuper]);

  const toggleCrm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !crmOpen;
    setCrmOpen(next);
    if (next) {
      setMarketingOpen(false);
      setCalendarOpen(false);
        setMediaOpen(false);
        setEcomOpen(false);
        setSettingsOpen(false);
        setSupportOpen(false);
        try {
          localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
          localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
          localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
          localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
          localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
          localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_CRM_OPEN, next ? "true" : "false");
    } catch { /* ignore */ }
  };

  const toggleMarketing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !marketingOpen;
    setMarketingOpen(next);
    if (next) {
      setCrmOpen(false);
      setCalendarOpen(false);
      setMediaOpen(false);
      setEcomOpen(false);
      setSettingsOpen(false);
      setSupportOpen(false);
      setSuperOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_MARKETING_OPEN, next ? "true" : "false");
    } catch { /* ignore */ }
  };

  const toggleCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !calendarOpen;
    setCalendarOpen(next);
    if (next) {
      setCrmOpen(false);
      setMarketingOpen(false);
      setMediaOpen(false);
      setEcomOpen(false);
      setSettingsOpen(false);
      setSupportOpen(false);
      setSuperOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_CALENDAR_OPEN, next ? "true" : "false");
    } catch { /* ignore */ }
  };

  const toggleMedia = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !mediaOpen;
    setMediaOpen(next);
    if (next) {
      setCrmOpen(false);
      setMarketingOpen(false);
      setCalendarOpen(false);
      setEcomOpen(false);
      setSettingsOpen(false);
      setSupportOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_MEDIA_OPEN, next ? "true" : "false");
    } catch { /* ignore */ }
  };

  const toggleEcom = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !ecomOpen;
    setEcomOpen(next);
    if (next) {
      setCrmOpen(false);
      setMarketingOpen(false);
      setCalendarOpen(false);
      setMediaOpen(false);
      setProjectsOpen(false);
      setSettingsOpen(false);
      setSupportOpen(false);
      setSuperOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_PROJECTS_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_ECOM_OPEN, next ? "true" : "false");
    } catch { /* ignore */ }
  };

  const toggleProjects = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !projectsOpen;
    setProjectsOpen(next);
    if (next) {
      setCrmOpen(false);
      setMarketingOpen(false);
      setCalendarOpen(false);
      setMediaOpen(false);
      setEcomOpen(false);
      setSettingsOpen(false);
      setSupportOpen(false);
      setSuperOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_PROJECTS_OPEN, next ? "true" : "false");
    } catch { /* ignore */ }
  };

  const toggleSuper = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !superOpen;
    setSuperOpen(next);
    if (next) {
      setCrmOpen(false);
      setMarketingOpen(false);
      setCalendarOpen(false);
      setMediaOpen(false);
      setEcomOpen(false);
      setProjectsOpen(false);
      setSettingsOpen(false);
      setSupportOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_PROJECTS_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_SUPER_OPEN, next ? "true" : "false");
    } catch { /* ignore */ }
  };

  const toggleSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !settingsOpen;
    setSettingsOpen(next);
    if (next) {
      setCrmOpen(false);
      setMarketingOpen(false);
      setCalendarOpen(false);
      setMediaOpen(false);
      setEcomOpen(false);
      setProjectsOpen(false);
      setSupportOpen(false);
      setSuperOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_PROJECTS_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_SETTINGS_OPEN, next ? "true" : "false");
    } catch { /* ignore */ }
  };

  const toggleSupport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !supportOpen;
    setSupportOpen(next);
    if (next) {
      setCrmOpen(false);
      setMarketingOpen(false);
      setCalendarOpen(false);
      setMediaOpen(false);
      setEcomOpen(false);
      setProjectsOpen(false);
      setSettingsOpen(false);
      setSuperOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_ECOM_OPEN, "false");
        localStorage.setItem(SIDEBAR_PROJECTS_OPEN, "false");
        localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_SUPPORT_OPEN, next ? "true" : "false");
    } catch { /* ignore */ }
  };

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error);
        return;
      }

      // Redirect to login page
      window.location.href = "/admin/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="flex h-full w-64 flex-col border-r sidebar-container" style={{
      backgroundColor: 'hsl(220, 13%, 85%)', // Medium grey for sidebar (#D1D5DB)
      borderColor: 'hsl(220, 13%, 80%)', // Slightly darker border
    }}>
      {/* Header with back button */}
      <div className="flex h-16 items-center border-b px-6" style={{
        borderColor: 'hsl(220, 13%, 80%)',
      }}>
        <h1 className="text-xl font-bold flex-1 text-foreground">CMS Admin</h1>
      </div>
      <div className="border-b px-4 py-2" style={{
        borderColor: 'hsl(220, 13%, 80%)',
      }}>
        <button
          onClick={() => {
            // Get the last visited public page from localStorage
            const lastPublicPage = localStorage.getItem("lastPublicPage");
            const path = lastPublicPage?.split("?")[0] ?? "";
            // Never go back to login page (would redirect to admin anyway)
            const isLoginPage = path === "/login" || path === "/login/";
            const target = lastPublicPage && !isLoginPage ? lastPublicPage : "/";
            router.push(target);
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Website
        </button>
      </div>
      <nav className="flex-1 flex flex-col min-h-0 p-4">
        <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
        {/* Dashboard: Phase F — hide when not in role; ghost (→ upgrade) when in role but not effective */}
        {hasRoleAccess("dashboard") &&
          (hasEffectiveAccess("dashboard") ? (
            <Link
              href="/admin/dashboard"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === "/admin/dashboard"
                  ? "border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px]"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </Link>
          ) : isDisplayOnlyGhost ? (
            <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Gated for this site (you have access as superadmin)">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => router.push(UPGRADE_PATH)}
              className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left"
              title="Not included in your plan. Request support."
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </button>
          ))}
        {/* OmniChat: gated by omnichat slug — link when effective, ghost when in role but not effective; page access guarded by route */}
        {(hasRoleAccess("crm") || hasRoleAccess("omnichat")) &&
          (hasEffectiveAccess("omnichat") ? (
            <Link
              href="/admin/crm/omnichat"
              className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <MessageCircle className="h-5 w-5" />
              OmniChat
            </Link>
          ) : isDisplayOnlyGhost ? (
            <Link href="/admin/crm/omnichat" className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Gated for this site (you have access as superadmin)">
              <MessageCircle className="h-5 w-5" />
              OmniChat
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => router.push(UPGRADE_PATH)}
              className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left"
              title="Not included in your plan. Request support."
            >
              <MessageCircle className="h-5 w-5" />
              OmniChat
            </button>
          ))}
        {/* CRM twirldown: Phase F — hide section when no role access; ghost header/subs when in role but not effective */}
        <div className="pt-1">
          {showCrm && (
          <>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                isCrm && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]"
              )}
            >
              {hasEffectiveAccess("crm") || crmSubNav.some((s) => s.featureSlug && hasEffectiveAccess(s.featureSlug)) ? (
                <Link
                  href="/admin/crm/contacts"
                  className={cn(
                    "flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2 min-w-0",
                    isCrm ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Building2 className="h-5 w-5 flex-shrink-0" />
                  CRM
                </Link>
              ) : isDisplayOnlyGhost ? (
                <Link href="/admin/crm/contacts" className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 min-w-0 text-left text-muted-foreground opacity-50 hover:opacity-70" title="Gated for this site (you have access as superadmin)">
                  <Building2 className="h-5 w-5 flex-shrink-0" />
                  CRM
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(UPGRADE_PATH)}
                  className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 min-w-0 text-left text-muted-foreground opacity-50 hover:opacity-70"
                  title="Not included in your plan. Request support."
                >
                  <Building2 className="h-5 w-5 flex-shrink-0" />
                  CRM
                </button>
              )}
              {newContactsCount > 0 && (
                <span
                  className="flex-shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-medium text-white"
                  title={`${newContactsCount} contact(s) with status New`}
                >
                  {newContactsCount > 99 ? "99+" : newContactsCount}
                </span>
              )}
              <button
                type="button"
                onClick={toggleCrm}
                className={cn(
                  "p-1 rounded transition-colors",
                  isCrm ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-expanded={crmOpen}
              >
                {crmOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {crmOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {crmSubNav
                  .filter((sub) => {
                    const subSlug = sub.featureSlug ?? "crm";
                    return !hiddenSet.has(subSlug) && hasRoleAccess(subSlug);
                  })
                  .map((sub) => {
                    const subSlug = sub.featureSlug ?? "crm";
                    const hasSubEffective = hasRealEffectiveAccess(subSlug);
                    const hasSubInDisplay = hasEffectiveAccess(subSlug);
                    const isSubActive =
                      sub.href === "/admin/crm/forms"
                        ? (pathname === "/admin/crm/forms" || (pathname?.startsWith("/admin/crm/forms/") ?? false)) &&
                          !pathname?.startsWith("/admin/crm/forms/submissions")
                        : pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                    const SubIcon = sub.icon;
                    return hasSubEffective ? (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    ) : hasSubInDisplay ? (
                      <Link key={sub.href} href={sub.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-40 hover:opacity-60 w-full text-left" title="Gated for this site (you have access as superadmin)">
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    ) : (
                      <button
                        key={sub.href}
                        type="button"
                        onClick={() => router.push(UPGRADE_PATH)}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 hover:opacity-70 w-full text-left"
                        title="Not included in your plan. Request support."
                      >
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </button>
                    );
                  })}
              </div>
            )}
          </>
          )}
          {!showCrm && showCrmByRole && (
          isDisplayOnlyGhost ? (
            <Link href="/admin/crm/contacts" className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Gated for this site (you have access as superadmin)">
              <Building2 className="h-5 w-5 flex-shrink-0" />
              CRM
            </Link>
          ) : (
          <button
            type="button"
            onClick={() => router.push(UPGRADE_PATH)}
            className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left"
            title="Not included in your plan. Request support."
          >
            <Building2 className="h-5 w-5 flex-shrink-0" />
            CRM
          </button>
          )
          )}
        </div>
        {/* Marketing twirldown: Phase F — hide when no role; ghost when in role but not effective */}
        <div className="pt-1">
          {showMarketing ? (
          <>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                isMarketing && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]"
              )}
            >
              {hasEffectiveAccess("marketing") || hasEffectiveAccess("lists") || hasEffectiveAccess("templates") || hasEffectiveAccess("code_generator") || hasEffectiveAccess("reviews") ? (
                <Link
                  href="/admin/crm/marketing"
                  className={cn(
                    "flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2 min-w-0",
                    isMarketing ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Mail className="h-5 w-5 flex-shrink-0" />
                  Marketing
                </Link>
              ) : isDisplayOnlyGhost ? (
                <Link href="/admin/crm/marketing" className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 min-w-0 text-left text-muted-foreground opacity-50 hover:opacity-70" title="Gated for this site (you have access as superadmin)">
                  <Mail className="h-5 w-5 flex-shrink-0" />
                  Marketing
                </Link>
              ) : (
                <button type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 min-w-0 text-left text-muted-foreground opacity-50 hover:opacity-70" title="Not included in your plan. Request support.">
                  <Mail className="h-5 w-5 flex-shrink-0" />
                  Marketing
                </button>
              )}
              <button type="button" onClick={toggleMarketing} className={cn("p-1 rounded transition-colors", isMarketing ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")} aria-expanded={marketingOpen}>
                {marketingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {marketingOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {marketingSubNav
                  .filter((sub) => {
                    const subSlug = sub.featureSlug ?? "marketing";
                    return !hiddenSet.has(subSlug) && hasRoleAccess(subSlug);
                  })
                  .map((sub) => {
                    const subSlug = sub.featureSlug ?? "marketing";
                    const hasSubEffective = hasRealEffectiveAccess(subSlug);
                    const hasSubInDisplay = hasEffectiveAccess(subSlug);
                    const isSubActive = pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                    const SubIcon = sub.icon;
                    return hasSubEffective ? (
                      <Link key={sub.href} href={sub.href} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    ) : hasSubInDisplay ? (
                      <Link key={sub.href} href={sub.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-40 hover:opacity-60 w-full text-left" title="Gated for this site (you have access as superadmin)">
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    ) : (
                      <button key={sub.href} type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Not included in your plan. Request support.">
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </button>
                    );
                  })}
              </div>
            )}
          </>
          ) : showMarketingByRole ? (
          isDisplayOnlyGhost ? (
            <Link href="/admin/crm/marketing" className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Gated for this site (you have access as superadmin)">
              <Mail className="h-5 w-5 flex-shrink-0" />
              Marketing
            </Link>
          ) : (
          <button type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Not included in your plan. Request support.">
            <Mail className="h-5 w-5 flex-shrink-0" />
            Marketing
          </button>
          )
          ) : null}
        </div>
        {/* Calendar twirldown: Phase F — hide when no role; ghost when in role but not effective */}
        <div className="pt-1">
          {showCalendar ? (
          <>
            <div className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium", isEvents && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]")}>
              {hasEffectiveAccess("calendar") || calendarSubNav.some((s) => s.featureSlug && hasEffectiveAccess(s.featureSlug)) ? (
                <Link href="/admin/events" className={cn("flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2 min-w-0", isEvents ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                  <Calendar className="h-5 w-5 flex-shrink-0" />
                  Calendar
                </Link>
              ) : isDisplayOnlyGhost ? (
                <Link href="/admin/events" className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 min-w-0 text-left text-muted-foreground opacity-50 hover:opacity-70" title="Gated for this site (you have access as superadmin)">
                  <Calendar className="h-5 w-5 flex-shrink-0" />
                  Calendar
                </Link>
              ) : (
                <button type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 min-w-0 text-left text-muted-foreground opacity-50 hover:opacity-70" title="Not included in your plan. Request support.">
                  <Calendar className="h-5 w-5 flex-shrink-0" />
                  Calendar
                </button>
              )}
              <button type="button" onClick={toggleCalendar} className={cn("p-1 rounded transition-colors", isEvents ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")} aria-expanded={calendarOpen}>
                {calendarOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {calendarOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {calendarSubNav
                  .filter((sub) => {
                    const subSlug = sub.featureSlug ?? "calendar";
                    return !hiddenSet.has(subSlug) && hasRoleAccess(subSlug);
                  })
                  .map((sub) => {
                    const subSlug = sub.featureSlug ?? "calendar";
                    const hasSubEffective = hasRealEffectiveAccess(subSlug);
                    const hasSubInDisplay = hasEffectiveAccess(subSlug);
                    const isSubActive = pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                    const SubIcon = sub.icon;
                    return hasSubEffective ? (
                      <Link key={sub.href} href={sub.href} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    ) : hasSubInDisplay ? (
                      <Link key={sub.href} href={sub.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-40 hover:opacity-60 w-full text-left" title="Gated for this site (you have access as superadmin)">
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    ) : (
                      <button key={sub.href} type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Not included in your plan. Request support.">
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </button>
                    );
                  })}
              </div>
            )}
          </>
          ) : showCalendarByRole ? (
          isDisplayOnlyGhost ? (
            <Link href="/admin/events" className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Gated for this site (you have access as superadmin)">
              <Calendar className="h-5 w-5 flex-shrink-0" />
              Calendar
            </Link>
          ) : (
          <button type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Not included in your plan. Request support.">
            <Calendar className="h-5 w-5 flex-shrink-0" />
            Calendar
          </button>
          )
          ) : null}
        </div>
        {/* Media twirldown: Phase F — hide when no role; ghost when in role but not effective */}
        <div className="pt-1">
          {showMedia ? (
          <>
            <div className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium", isMedia && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]")}>
              {hasEffectiveAccess("media") || mediaSubNav.some((s) => s.featureSlug && hasEffectiveAccess(s.featureSlug)) ? (
                <Link href="/admin/media" className={cn("flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2 min-w-0", isMedia ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                  <Image className="h-5 w-5 flex-shrink-0" />
                  Media
                </Link>
              ) : isDisplayOnlyGhost ? (
                <Link href="/admin/media" className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 min-w-0 text-left text-muted-foreground opacity-50 hover:opacity-70" title="Gated for this site (you have access as superadmin)">
                  <Image className="h-5 w-5 flex-shrink-0" />
                  Media
                </Link>
              ) : (
                <button type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 min-w-0 text-left text-muted-foreground opacity-50 hover:opacity-70" title="Not included in your plan. Request support.">
                  <Image className="h-5 w-5 flex-shrink-0" />
                  Media
                </button>
              )}
              <button type="button" onClick={toggleMedia} className={cn("p-1 rounded transition-colors", isMedia ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")} aria-expanded={mediaOpen}>
                {mediaOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {mediaOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {mediaSubNav
                  .filter((sub) => {
                    const subSlug = sub.featureSlug ?? "media";
                    return !hiddenSet.has(subSlug) && hasRoleAccess(subSlug);
                  })
                  .map((sub) => {
                    const subSlug = sub.featureSlug ?? "media";
                    const hasSubEffective = hasRealEffectiveAccess(subSlug);
                    const hasSubInDisplay = hasEffectiveAccess(subSlug);
                    const isSubActive = pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                    const SubIcon = sub.icon;
                    return hasSubEffective ? (
                      <Link key={sub.href} href={sub.href} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    ) : hasSubInDisplay ? (
                      <Link key={sub.href} href={sub.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-40 hover:opacity-60 w-full text-left" title="Gated for this site (you have access as superadmin)">
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    ) : (
                      <button key={sub.href} type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Not included in your plan. Request support.">
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </button>
                    );
                  })}
              </div>
            )}
          </>
          ) : showMediaByRole ? (
          isDisplayOnlyGhost ? (
            <Link href="/admin/media" className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Gated for this site (you have access as superadmin)">
              <Image className="h-5 w-5 flex-shrink-0" />
              Media
            </Link>
          ) : (
          <button type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Not included in your plan. Request support.">
            <Image className="h-5 w-5 flex-shrink-0" />
            Media
          </button>
          )
          ) : null}
        </div>
        {/* Content: Phase F — hide when not in role; ghost when in role but not effective */}
        {hasRoleAccess("content") &&
          (hasEffectiveAccess("content") ? (
            <Link
              href="/admin/content"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                isContent
                  ? "border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px]"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <FileText className="h-5 w-5" />
              Content
            </Link>
          ) : isDisplayOnlyGhost ? (
            <Link href="/admin/content" className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Gated for this site (you have access as superadmin)">
              <FileText className="h-5 w-5" />
              Content
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => router.push(UPGRADE_PATH)}
              className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left"
              title="Not included in your plan. Request support."
            >
              <FileText className="h-5 w-5" />
              Content
            </button>
          ))}
        {/* Ecommerce twirldown: Products, Orders (Phase 09). Gated by content access. */}
        <div className="pt-1">
          {showEcommerce && (
          <>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                isEcommerce && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]"
              )}
            >
              <Link
                href="/admin/ecommerce/products"
                className={cn(
                  "flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2 min-w-0",
                  isEcommerce ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <ShoppingBag className="h-5 w-5 flex-shrink-0" />
                Ecommerce
              </Link>
              <button
                type="button"
                onClick={toggleEcom}
                className={cn(
                  "p-1 rounded transition-colors",
                  isEcommerce ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-expanded={ecomOpen}
              >
                {ecomOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {ecomOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {ecommerceSubNav.map((sub) => {
                  const isSubActive = pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                  const SubIcon = sub.icon;
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <SubIcon className="h-4 w-4" />
                      {sub.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </>
          )}
        </div>
        {/* Projects: Phase 19. Gated by feature slug "projects". */}
        <div className="pt-1">
          {showProjects && (
          <>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                isProjects && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]"
              )}
            >
              <Link
                href="/admin/projects"
                className={cn(
                  "flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2 min-w-0",
                  isProjects ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <FolderKanban className="h-5 w-5 flex-shrink-0" />
                Projects
              </Link>
              <button
                type="button"
                onClick={toggleProjects}
                className={cn(
                  "p-1 rounded transition-colors",
                  isProjects ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-expanded={projectsOpen}
              >
                {projectsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {projectsOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {projectsSubNav
                  .filter((sub) => !("featureSlug" in sub && sub.featureSlug) || hasRoleAccess("projects") || (sub.featureSlug && hasRoleAccess(sub.featureSlug)))
                  .map((sub) => {
                    const isSubActive = pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                    const SubIcon = sub.icon;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    );
                  })}
              </div>
            )}
          </>
          )}
        </div>
        {/* Settings twirldown: Phase F — hide when no role; ghost when in role but not effective */}
        <div className="pt-1">
          {showSettings ? (
          <>
            <div className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium", isSettings && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]")}>
              {hasEffectiveAccess("settings") || settingsSubNav.some((s) => s.featureSlug && hasEffectiveAccess(s.featureSlug)) ? (
                <Link href="/admin/settings" className={cn("flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2", isSettings ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
              ) : isDisplayOnlyGhost ? (
                <Link href="/admin/settings" className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 text-left text-muted-foreground opacity-50 hover:opacity-70" title="Gated for this site (you have access as superadmin)">
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
              ) : (
                <button type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 text-left text-muted-foreground opacity-50 hover:opacity-70" title="Not included in your plan. Request support.">
                  <Settings className="h-5 w-5" />
                  Settings
                </button>
              )}
              <button type="button" onClick={toggleSettings} className={cn("p-1 rounded transition-colors", isSettings ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")} aria-expanded={settingsOpen}>
                {settingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {settingsOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {settingsSubNav
                  .filter((sub) => !("adminOnly" in sub && sub.adminOnly) || canManageTeam)
                  .filter((sub) => !hiddenSet.has(sub.featureSlug ?? "settings"))
                  .filter((sub) => !("featureSlug" in sub && sub.featureSlug) || hasRoleAccess("settings") || (sub.featureSlug && hasRoleAccess(sub.featureSlug)))
                  .map((sub) => {
                    const isSubActive = pathname === sub.href;
                    const SubIcon = sub.icon;
                    const alwaysVisible = !("featureSlug" in sub && sub.featureSlug);
                    const subSlug = sub.featureSlug ?? "settings";
                    if (alwaysVisible) {
                      return (
                        <Link key={sub.href} href={sub.href} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                          <SubIcon className="h-4 w-4" />
                          {sub.name}
                        </Link>
                      );
                    }
                    const hasSubEffective = hasRealEffectiveAccess(subSlug);
                    const hasSubInDisplay = hasEffectiveAccess(subSlug);
                    return hasSubEffective ? (
                      <Link key={sub.href} href={sub.href} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    ) : hasSubInDisplay ? (
                      <Link key={sub.href} href={sub.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-40 hover:opacity-60 w-full text-left" title="Gated for this site (you have access as superadmin)">
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    ) : (
                      <button key={sub.href} type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Not included in your plan. Request support.">
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </button>
                    );
                  })}
              </div>
            )}
          </>
          ) : (roleFeatureSlugs === "all" || hasRoleAccess("settings")) ? (
          isDisplayOnlyGhost ? (
            <Link href="/admin/settings" className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Gated for this site (you have access as superadmin)">
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          ) : (
          <button type="button" onClick={() => router.push(UPGRADE_PATH)} className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Not included in your plan. Request support.">
            <Settings className="h-5 w-5" />
            Settings
          </button>
          )
          ) : null}
        </div>

        {/* Support twirldown: Phase F — hide when no role; ghost when in role but not effective; one-to-one gate per child */}
        <div className="pt-1">
          {showSupport ? (
          <>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                isSupport && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]"
              )}
            >
              {hasEffectiveAccess("support") || supportSubNav.some((s) => s.featureSlug && hasEffectiveAccess(s.featureSlug)) ? (
                <Link
                  href="/admin/support"
                  className={cn(
                    "flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2",
                    isSupport ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <LifeBuoy className="h-5 w-5" />
                  Support
                </Link>
              ) : isDisplayOnlyGhost ? (
                <Link href="/admin/support" className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 text-left text-muted-foreground opacity-50 hover:opacity-70" title="Gated for this site (you have access as superadmin)">
                  <LifeBuoy className="h-5 w-5" />
                  Support
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(UPGRADE_PATH)}
                  className="flex flex-1 items-center gap-3 rounded-md py-1 -my-1 px-2 -mx-2 text-left text-muted-foreground opacity-50 hover:opacity-70"
                  title="Not included in your plan. Request support."
                >
                  <LifeBuoy className="h-5 w-5" />
                  Support
                </button>
              )}
              <button
                type="button"
                onClick={toggleSupport}
                className={cn(
                  "p-1 rounded transition-colors",
                  isSupport ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-expanded={supportOpen}
              >
                {supportOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {supportOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {supportSubNav
                  .filter((sub) => {
                    const subSlug = sub.featureSlug ?? "support";
                    return !hiddenSet.has(subSlug) && hasRoleAccess(subSlug);
                  })
                  .map((sub) => {
                    const subSlug = sub.featureSlug ?? "support";
                    const hasSubEffective = hasRealEffectiveAccess(subSlug);
                    const hasSubInDisplay = hasEffectiveAccess(subSlug);
                    const isSubActive = !sub.href.startsWith("http") && pathname === sub.href;
                    const SubIcon = sub.icon;
                    const isExternal = sub.href.startsWith("http");
                    const linkClass = cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    );
                    if (!hasSubEffective) {
                      if (hasSubInDisplay) {
                        if (isExternal) {
                          return (
                            <a key={sub.href} href={sub.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-40 hover:opacity-60 w-full text-left" title="Gated for this site (you have access as superadmin)">
                              <SubIcon className="h-4 w-4" />
                              {sub.name}
                            </a>
                          );
                        }
                        return (
                          <Link key={sub.href} href={sub.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-40 hover:opacity-60 w-full text-left" title="Gated for this site (you have access as superadmin)">
                            <SubIcon className="h-4 w-4" />
                            {sub.name}
                          </Link>
                        );
                      }
                      return (
                        <button
                          key={sub.href}
                          type="button"
                          onClick={() => router.push(UPGRADE_PATH)}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 hover:opacity-70 w-full text-left"
                          title="Not included in your plan. Request support."
                        >
                          <SubIcon className="h-4 w-4" />
                          {sub.name}
                        </button>
                      );
                    }
                    if (isExternal) {
                      return (
                        <a
                          key={sub.href}
                          href={sub.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClass}
                        >
                          <SubIcon className="h-4 w-4" />
                          {sub.name}
                        </a>
                      );
                    }
                    return (
                      <Link key={sub.href} href={sub.href} className={linkClass}>
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    );
                  })}
              </div>
            )}
          </>
          ) : showSupportByRole ? (
            isDisplayOnlyGhost ? (
              <Link href="/admin/support" className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left" title="Gated for this site (you have access as superadmin)">
                <LifeBuoy className="h-5 w-5" />
                Support
              </Link>
            ) : (
            <button
              type="button"
              onClick={() => router.push(UPGRADE_PATH)}
              className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 hover:opacity-70 w-full text-left"
              title="Not included in your plan. Request support."
            >
              <LifeBuoy className="h-5 w-5" />
              Support
            </button>
            )
          ) : null}
        </div>
        </div>
        {/* Superadmin twirldown: Dashboard, Code snippets, Roles, Clients */}
        {isSuperadmin && !hiddenSet.has("superadmin") && (
          <div className="pt-1 mt-2 border-t border-border" style={{ borderColor: 'hsl(220, 13%, 80%)' }}>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                isSuper && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]"
              )}
            >
              <Link
                href="/admin/super"
                className={cn(
                  "flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2 min-w-0",
                  isSuper ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Shield className="h-5 w-5 flex-shrink-0" />
                Superadmin
              </Link>
              <button
                type="button"
                onClick={toggleSuper}
                className={cn(
                  "p-1 rounded transition-colors",
                  isSuper ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-expanded={superOpen}
              >
                {superOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {superOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {superadminSubNav.map((sub) => {
                  const isSubActive = pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                  const SubIcon = sub.icon;
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <SubIcon className="h-4 w-4" />
                      {sub.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>
      <div className="border-t p-4" style={{
        borderColor: 'hsl(220, 13%, 80%)',
      }}>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
