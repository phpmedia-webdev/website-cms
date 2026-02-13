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
  mediaSubNav,
  crmSubNav,
  marketingSubNav,
  calendarSubNav,
  settingsSubNav,
  supportSubNav,
  superadminSubNav,
} from "./sidebar-config";

interface SidebarProps {
  isSuperadmin?: boolean;
  /** Effective feature slugs for current user; "all" = show everything. */
  effectiveFeatureSlugs?: string[] | "all";
  /** If true, show Settings → Users link. Only admins (tenant admin or superadmin) can manage team. */
  canManageTeam?: boolean;
}

export function Sidebar({ isSuperadmin = false, effectiveFeatureSlugs = "all", canManageTeam = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseClient();
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
    pathname?.startsWith("/admin/crm/lists/");
  const isEvents = pathname === "/admin/events" || pathname?.startsWith("/admin/events/");
  const isMedia = pathname === "/admin/media" || pathname?.startsWith("/admin/media/") || pathname === "/admin/galleries" || pathname?.startsWith("/admin/galleries/");
  const isContent = pathname === "/admin/content" || pathname?.startsWith("/admin/content/");
  const isSuper = pathname === "/admin/super" || pathname?.startsWith("/admin/super/");

  const showDashboard =
    effectiveFeatureSlugs === "all" ||
    (Array.isArray(effectiveFeatureSlugs) &&
      (effectiveFeatureSlugs.length === 0 || effectiveFeatureSlugs.includes("dashboard")));
  const showCrm =
    canAccessFeature(effectiveFeatureSlugs, "crm") ||
    canAccessFeature(effectiveFeatureSlugs, "contacts") ||
    canAccessFeature(effectiveFeatureSlugs, "forms") ||
    canAccessFeature(effectiveFeatureSlugs, "marketing") ||
    canAccessFeature(effectiveFeatureSlugs, "memberships") ||
    canAccessFeature(effectiveFeatureSlugs, "code_generator");
  const showMedia =
    canAccessFeature(effectiveFeatureSlugs, "media") ||
    canAccessFeature(effectiveFeatureSlugs, "library") ||
    canAccessFeature(effectiveFeatureSlugs, "galleries");
  const showContent = canAccessFeature(effectiveFeatureSlugs, "content");
  const showMarketing = canAccessFeature(effectiveFeatureSlugs, "marketing");
  const showCalendar =
    canAccessFeature(effectiveFeatureSlugs, "content") ||
    canAccessFeature(effectiveFeatureSlugs, "calendar") ||
    canAccessFeature(effectiveFeatureSlugs, "events") ||
    canAccessFeature(effectiveFeatureSlugs, "resources");
  const showSettings = canAccessFeature(effectiveFeatureSlugs, "settings");
  const showOmniChat = canAccessFeature(effectiveFeatureSlugs, "crm");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
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
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "true");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "true");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "true");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "true");
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
        setSupportOpen(false);
        setSuperOpen(false);
        setSettingsOpen(true);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
        setSettingsOpen(false);
        setSupportOpen(true);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
        setSettingsOpen(false);
        setSupportOpen(false);
        setSuperOpen(true);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
      setSettingsOpen(false);
      setSupportOpen(false);
      setSuperOpen(false);
      localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
      localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
      localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
      localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
      localStorage.setItem(SIDEBAR_CONTENT_OPEN, "false");
      localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
      localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
      localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
    } catch {
      if (isCrm && !isMarketing) setCrmOpen(true);
      if (isMarketing) setMarketingOpen(true);
      if (isEvents) setCalendarOpen(true);
      if (isMedia) setMediaOpen(true);
      if (isSettings) setSettingsOpen(true);
      if (isSupport) setSupportOpen(true);
      if (isSuper) setSuperOpen(true);
    }
  }, [pathname, isCrm, isMarketing, isEvents, isMedia, isSettings, isSupport, isSuper]);

  const toggleCrm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !crmOpen;
    setCrmOpen(next);
    if (next) {
      setMarketingOpen(false);
      setCalendarOpen(false);
      setMediaOpen(false);
      setSettingsOpen(false);
      setSupportOpen(false);
      try {
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
      setSettingsOpen(false);
      setSupportOpen(false);
      setSuperOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
      setSettingsOpen(false);
      setSupportOpen(false);
      setSuperOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
      setSettingsOpen(false);
      setSupportOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPPORT_OPEN, "false");
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_MEDIA_OPEN, next ? "true" : "false");
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
      setSettingsOpen(false);
      setSupportOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
      setSupportOpen(false);
      setSuperOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
      setSettingsOpen(false);
      setSuperOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MARKETING_OPEN, "false");
        localStorage.setItem(SIDEBAR_CALENDAR_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
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
        {/* Dashboard: always visible; ghosted (greyed, non-clickable) when no access */}
        {showDashboard ? (
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
        ) : (
        <span
          className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
          title="Upgrade your plan to access"
        >
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </span>
        )}
        {/* OmniChat: always visible; ghosted when no access */}
        {showOmniChat ? (
        <Link
          href="https://chat.phpmedia.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <MessageCircle className="h-5 w-5" />
          OmniChat
        </Link>
        ) : (
        <span
          className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
          title="Upgrade your plan to access"
        >
          <MessageCircle className="h-5 w-5" />
          OmniChat
        </span>
        )}
        {/* CRM twirldown: always visible; ghosted when no access */}
        <div className="pt-1">
          {showCrm ? (
          <>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                isCrm && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]"
              )}
            >
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
                {crmSubNav.map((sub) => {
                  const hasSubAccess = canAccessFeature(effectiveFeatureSlugs, "crm") || (sub.featureSlug ? canAccessFeature(effectiveFeatureSlugs, sub.featureSlug) : false);
                  const isSubActive =
                    sub.href === "/admin/crm/forms"
                      ? (pathname === "/admin/crm/forms" || (pathname?.startsWith("/admin/crm/forms/") ?? false)) &&
                        !pathname?.startsWith("/admin/crm/forms/submissions")
                      : pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                  const SubIcon = sub.icon;
                  return hasSubAccess ? (
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
                  ) : (
                    <span key={sub.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                      <SubIcon className="h-4 w-4" />
                      {sub.name}
                    </span>
                  );
                })}
              </div>
            )}
          </>
          ) : (
          <span
            className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
            title="Upgrade your plan to access"
          >
            <Building2 className="h-5 w-5 flex-shrink-0" />
            CRM
          </span>
          )}
        </div>
        {/* Marketing twirldown: always visible; ghosted when no access */}
        <div className="pt-1">
          {showMarketing ? (
          <>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                isMarketing && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]"
              )}
            >
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
              <button
                type="button"
                onClick={toggleMarketing}
                className={cn(
                  "p-1 rounded transition-colors",
                  isMarketing ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-expanded={marketingOpen}
              >
                {marketingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {marketingOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {marketingSubNav.map((sub) => {
                  const hasSubAccess = canAccessFeature(effectiveFeatureSlugs, "marketing") || canAccessFeature(effectiveFeatureSlugs, "lists");
                  const isSubActive = pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                  const SubIcon = sub.icon;
                  return hasSubAccess ? (
                    <Link key={sub.href} href={sub.href} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                      <SubIcon className="h-4 w-4" />
                      {sub.name}
                    </Link>
                  ) : (
                    <span key={sub.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                      <SubIcon className="h-4 w-4" />
                      {sub.name}
                    </span>
                  );
                })}
              </div>
            )}
          </>
          ) : (
          <span className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed" title="Upgrade your plan to access">
            <Mail className="h-5 w-5 flex-shrink-0" />
            Marketing
          </span>
          )}
        </div>
        {/* Calendar twirldown: always visible; ghosted when no access */}
        <div className="pt-1">
          {showCalendar ? (
          <>
            <div className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium", isEvents && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]")}>
              <Link href="/admin/events" className={cn("flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2 min-w-0", isEvents ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                <Calendar className="h-5 w-5 flex-shrink-0" />
                Calendar
              </Link>
              <button type="button" onClick={toggleCalendar} className={cn("p-1 rounded transition-colors", isEvents ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")} aria-expanded={calendarOpen}>
                {calendarOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {calendarOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {calendarSubNav.map((sub) => {
                  const slug = sub.href === "/admin/events" ? "events" : "resources";
                  const hasSubAccess = canAccessFeature(effectiveFeatureSlugs, "calendar") || canAccessFeature(effectiveFeatureSlugs, slug);
                  const isSubActive = pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                  const SubIcon = sub.icon;
                  return hasSubAccess ? (
                    <Link key={sub.href} href={sub.href} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                      <SubIcon className="h-4 w-4" />
                      {sub.name}
                    </Link>
                  ) : (
                    <span key={sub.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                      <SubIcon className="h-4 w-4" />
                      {sub.name}
                    </span>
                  );
                })}
              </div>
            )}
          </>
          ) : (
          <span className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed" title="Upgrade your plan to access">
            <Calendar className="h-5 w-5 flex-shrink-0" />
            Calendar
          </span>
          )}
        </div>
        {/* Media twirldown: always visible; ghosted when no access */}
        <div className="pt-1">
          {showMedia ? (
          <>
            <div className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium", isMedia && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]")}>
              <Link href="/admin/media" className={cn("flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2 min-w-0", isMedia ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                <Image className="h-5 w-5 flex-shrink-0" />
                Media
              </Link>
              <button type="button" onClick={toggleMedia} className={cn("p-1 rounded transition-colors", isMedia ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")} aria-expanded={mediaOpen}>
                {mediaOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {mediaOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {mediaSubNav.map((sub) => {
                  const hasSubAccess = canAccessFeature(effectiveFeatureSlugs, "media") || canAccessFeature(effectiveFeatureSlugs, "library") || (sub.featureSlug ? canAccessFeature(effectiveFeatureSlugs, sub.featureSlug) : false);
                  const isSubActive = pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                  const SubIcon = sub.icon;
                  return hasSubAccess ? (
                    <Link key={sub.href} href={sub.href} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                      <SubIcon className="h-4 w-4" />
                      {sub.name}
                    </Link>
                  ) : (
                    <span key={sub.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                      <SubIcon className="h-4 w-4" />
                      {sub.name}
                    </span>
                  );
                })}
              </div>
            )}
          </>
          ) : (
          <span className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed" title="Upgrade your plan to access">
            <Image className="h-5 w-5 flex-shrink-0" />
            Media
          </span>
          )}
        </div>
        {/* Content: always visible; ghosted when no access */}
        {showContent ? (
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
        ) : (
        <span
          className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
          title="Upgrade your plan to access"
        >
          <FileText className="h-5 w-5" />
          Content
        </span>
        )}
        {/* Settings twirldown: always visible; ghosted when no access */}
        <div className="pt-1">
          {showSettings ? (
          <>
            <div className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium", isSettings && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]")}>
              <Link href="/admin/settings" className={cn("flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2", isSettings ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                <Settings className="h-5 w-5" />
                Settings
              </Link>
              <button type="button" onClick={toggleSettings} className={cn("p-1 rounded transition-colors", isSettings ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")} aria-expanded={settingsOpen}>
                {settingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {settingsOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {settingsSubNav
                  .filter((sub) => !("adminOnly" in sub && sub.adminOnly) || canManageTeam)
                  .map((sub) => {
                    const isSubActive = pathname === sub.href;
                    const SubIcon = sub.icon;
                    const alwaysVisible = !("featureSlug" in sub && sub.featureSlug);
                    const hasAccess = alwaysVisible || canAccessFeature(effectiveFeatureSlugs, "settings") || (sub.featureSlug && canAccessFeature(effectiveFeatureSlugs, sub.featureSlug));
                    if (alwaysVisible) {
                      return (
                        <Link key={sub.href} href={sub.href} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                          <SubIcon className="h-4 w-4" />
                          {sub.name}
                        </Link>
                      );
                    }
                    return hasAccess ? (
                      <Link key={sub.href} href={sub.href} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    ) : (
                      <span key={sub.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                        <SubIcon className="h-4 w-4" />
                        {sub.name}
                      </span>
                    );
                  })}
              </div>
            )}
          </>
          ) : (
          <span className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed" title="Upgrade your plan to access">
            <Settings className="h-5 w-5" />
            Settings
          </span>
          )}
        </div>

        {/* Support twirldown (Quick Support, Knowledge Base) */}
        <div className="pt-1">
          <div
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium",
              isSupport && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]"
            )}
          >
            <Link
              href="/admin/support/quick-support"
              className={cn(
                "flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2",
                isSupport ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <LifeBuoy className="h-5 w-5" />
              Support
            </Link>
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
              {supportSubNav.map((sub) => {
                const isSubActive = !sub.href.startsWith("http") && pathname === sub.href;
                const SubIcon = sub.icon;
                const isExternal = sub.href.startsWith("http");
                const linkClass = cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  isSubActive ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                );
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
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={linkClass}
                  >
                    <SubIcon className="h-4 w-4" />
                    {sub.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        </div>
        {/* Superadmin twirldown: Dashboard, Code snippets, Roles, Clients */}
        {isSuperadmin && (
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
