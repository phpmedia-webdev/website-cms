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
  Folder,
  ClipboardList,
  Inbox,
  Settings,
  Shield,
  LogOut,
  ArrowLeft,
  Users,
  ChevronDown,
  ChevronRight,
  Type,
  Palette,
  Tags,
  Layers,
  ListTree,
  Code,
  Building2,
  Mail,
  ListChecks,
  KeyRound,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { canAccessFeature } from "@/lib/admin/route-features";

const SIDEBAR_SETTINGS_OPEN = "sidebar-settings-open";

interface SidebarProps {
  isSuperadmin?: boolean;
  /** Effective feature slugs for current user; "all" = show everything. */
  effectiveFeatureSlugs?: string[] | "all";
}

const mediaSubNav: { name: string; href: string; icon: typeof Image; featureSlug: string }[] = [
  { name: "Library", href: "/admin/media", icon: Image, featureSlug: "media" },
  { name: "Galleries", href: "/admin/galleries", icon: Folder, featureSlug: "galleries" },
];

const SIDEBAR_MEDIA_OPEN = "sidebar-media-open";

const SIDEBAR_CRM_OPEN = "sidebar-crm-open";

const crmSubNav: { name: string; href: string; icon: typeof Users; featureSlug: string }[] = [
  { name: "Contacts", href: "/admin/crm/contacts", icon: Users, featureSlug: "contacts" },
  { name: "Forms", href: "/admin/crm/forms", icon: ClipboardList, featureSlug: "forms" },
  { name: "Form submissions", href: "/admin/crm/forms/submissions", icon: Inbox, featureSlug: "forms" },
  { name: "Marketing", href: "/admin/crm/marketing", icon: Mail, featureSlug: "marketing" },
  { name: "Lists", href: "/admin/crm/lists", icon: ListChecks, featureSlug: "marketing" },
  { name: "Memberships", href: "/admin/crm/memberships", icon: Folder, featureSlug: "memberships" },
  { name: "Code Generator", href: "/admin/crm/memberships/code-generator", icon: KeyRound, featureSlug: "code_generator" },
];

const settingsSubNav = [
  { name: "Profile", href: "/admin/settings/profile", icon: User },
  { name: "General", href: "/admin/settings/general", icon: Settings },
  { name: "Fonts", href: "/admin/settings/fonts", icon: Type },
  { name: "Colors", href: "/admin/settings/colors", icon: Palette },
  { name: "Taxonomy", href: "/admin/settings/taxonomy", icon: Tags },
  { name: "Content Types", href: "/admin/settings/content-types", icon: Layers },
  { name: "Content Fields", href: "/admin/settings/content-fields", icon: ListTree },
  { name: "CRM", href: "/admin/settings/crm", icon: Users },
  { name: "Security", href: "/admin/settings/security", icon: Shield },
];

const SIDEBAR_SUPER_OPEN = "sidebar-super-open";

const superadminSubNav = [
  { name: "Dashboard", href: "/admin/super", icon: Shield },
  { name: "Tenant Sites", href: "/admin/super/tenant-sites", icon: Building2 },
  { name: "Tenant Users", href: "/admin/super/tenant-users", icon: Users },
  { name: "Roles", href: "/admin/super/roles", icon: ShieldCheck },
  { name: "Code Library", href: "/admin/super/code-library", icon: Code },
];

export function Sidebar({ isSuperadmin = false, effectiveFeatureSlugs = "all" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseClient();
  const isSettings = pathname === "/admin/settings" || pathname?.startsWith("/admin/settings/");
  const isCrm = pathname === "/admin/crm" || pathname?.startsWith("/admin/crm/");
  const isMedia = pathname === "/admin/media" || pathname?.startsWith("/admin/media/") || pathname === "/admin/galleries" || pathname?.startsWith("/admin/galleries/");
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
    canAccessFeature(effectiveFeatureSlugs, "galleries");
  const showContent = canAccessFeature(effectiveFeatureSlugs, "content");
  const showSettings = canAccessFeature(effectiveFeatureSlugs, "settings");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
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

  // Pathname-driven sidebar: Dashboard collapses all; only one section open at a time
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDashboard = pathname === "/admin/dashboard";
    try {
      if (isDashboard) {
        setCrmOpen(false);
        setMediaOpen(false);
        setSettingsOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        return;
      }
      if (isCrm) {
        setCrmOpen(true);
        setMediaOpen(false);
        setSettingsOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "true");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        return;
      }
      if (isMedia) {
        setCrmOpen(false);
        setMediaOpen(true);
        setSettingsOpen(false);
        setSuperOpen(false);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "true");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        return;
      }
      if (isSettings) {
        setCrmOpen(false);
        setMediaOpen(false);
        setSuperOpen(false);
        setSettingsOpen(true);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "true");
        return;
      }
      if (isSuper) {
        setCrmOpen(false);
        setMediaOpen(false);
        setSettingsOpen(false);
        setSuperOpen(true);
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "true");
        return;
      }
      // Content, etc.: collapse all
      setCrmOpen(false);
      setMediaOpen(false);
      setSettingsOpen(false);
      setSuperOpen(false);
      localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
      localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
      localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
      localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
    } catch {
      if (isCrm) setCrmOpen(true);
      if (isMedia) setMediaOpen(true);
      if (isSettings) setSettingsOpen(true);
      if (isSuper) setSuperOpen(true);
    }
  }, [pathname, isCrm, isMedia, isSettings, isSuper]);

  const toggleCrm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !crmOpen;
    setCrmOpen(next);
    if (next) {
      setMediaOpen(false);
      setSettingsOpen(false);
      try {
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_CRM_OPEN, next ? "true" : "false");
    } catch { /* ignore */ }
  };

  const toggleMedia = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !mediaOpen;
    setMediaOpen(next);
    if (next) {
      setCrmOpen(false);
      setSettingsOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
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
      setMediaOpen(false);
      setSettingsOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "false");
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
      setMediaOpen(false);
      setSuperOpen(false);
      try {
        localStorage.setItem(SIDEBAR_CRM_OPEN, "false");
        localStorage.setItem(SIDEBAR_MEDIA_OPEN, "false");
        localStorage.setItem(SIDEBAR_SUPER_OPEN, "false");
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(SIDEBAR_SETTINGS_OPEN, next ? "true" : "false");
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
        {/* Dashboard first */}
        {showDashboard && (
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
        )}
        {/* CRM twirldown (right after Dashboard) */}
        {showCrm && (
        <div className="pt-1">
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
              {crmSubNav
                .filter(
                  (sub) =>
                    canAccessFeature(effectiveFeatureSlugs, "crm") ||
                    canAccessFeature(effectiveFeatureSlugs, sub.featureSlug)
                )
                .map((sub) => {
                  const isSubActive =
                    sub.href === "/admin/crm/forms"
                      ? (pathname === "/admin/crm/forms" || (pathname?.startsWith("/admin/crm/forms/") ?? false)) &&
                        !pathname?.startsWith("/admin/crm/forms/submissions")
                      : pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
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
        {/* Media twirldown (Library, Galleries) */}
        {showMedia && (
        <div className="pt-1">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
              isMedia && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]"
            )}
          >
            <Link
              href="/admin/media"
              className={cn(
                "flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2 min-w-0",
                isMedia ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Image className="h-5 w-5 flex-shrink-0" />
              Media
            </Link>
            <button
              type="button"
              onClick={toggleMedia}
              className={cn(
                "p-1 rounded transition-colors",
                isMedia ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              aria-expanded={mediaOpen}
            >
              {mediaOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          {mediaOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
              {mediaSubNav
                .filter(
                  (sub) =>
                    canAccessFeature(effectiveFeatureSlugs, "media") ||
                    canAccessFeature(effectiveFeatureSlugs, sub.featureSlug)
                )
                .map((sub) => {
                  const isSubActive =
                    pathname === sub.href || (pathname?.startsWith(sub.href + "/") ?? false);
                  const SubIcon = sub.icon;
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        isSubActive
                          ? "font-medium border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 pl-[10px] -ml-[2px]"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
        {/* Content */}
        {showContent && (
        <Link
          href="/admin/content"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            (pathname === "/admin/content" || pathname?.startsWith("/admin/content/"))
              ? "border-l-2 border-slate-500 bg-slate-200/40 text-slate-800 font-medium pl-[10px]"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <FileText className="h-5 w-5" />
          Content
        </Link>
        )}

        {/* Settings twirldown */}
        {showSettings && (
        <div className="pt-1">
          <div
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium",
              isSettings && "border-l-2 border-slate-500 bg-slate-200/40 pl-[10px]"
            )}
          >
            <Link
              href="/admin/settings"
              className={cn(
                "flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2",
                isSettings ? "text-slate-800 font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
            <button
              type="button"
              onClick={toggleSettings}
              className={cn(
                "p-1 rounded transition-colors",
                isSettings ? "text-slate-800 hover:bg-slate-200/60" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              aria-expanded={settingsOpen}
            >
              {settingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          {settingsOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
              {settingsSubNav.map((sub) => {
                const isSubActive = pathname === sub.href;
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
