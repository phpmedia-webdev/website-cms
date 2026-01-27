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
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SIDEBAR_SETTINGS_OPEN = "sidebar-settings-open";

interface SidebarProps {
  isSuperadmin?: boolean;
}

const baseNavigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Contacts", href: "/admin/contacts", icon: Users },
  { name: "Forms", href: "/admin/forms", icon: ClipboardList },
  { name: "Media", href: "/admin/media", icon: Image },
  { name: "Galleries", href: "/admin/galleries", icon: Folder },
  { name: "Content", href: "/admin/content", icon: FileText },
];

const settingsSubNav = [
  { name: "General", href: "/admin/settings/general", icon: Settings },
  { name: "Fonts", href: "/admin/settings/fonts", icon: Type },
  { name: "Colors", href: "/admin/settings/colors", icon: Palette },
  { name: "Taxonomy", href: "/admin/settings/taxonomy", icon: Tags },
  { name: "Content Types", href: "/admin/settings/content-types", icon: Layers },
  { name: "Content Fields", href: "/admin/settings/content-fields", icon: ListTree },
  { name: "Security", href: "/admin/settings/security", icon: Shield },
  { name: "API", href: "/admin/settings/api", icon: Code },
];

const superadminNavigation = [
  { name: "Superadmin", href: "/admin/super", icon: Shield },
];

export function Sidebar({ isSuperadmin = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseClient();
  const isSettings = pathname === "/admin/settings" || pathname?.startsWith("/admin/settings/");

  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (isSettings) {
        setSettingsOpen(true);
        localStorage.setItem(SIDEBAR_SETTINGS_OPEN, "true");
        return;
      }
      const stored = localStorage.getItem(SIDEBAR_SETTINGS_OPEN);
      setSettingsOpen(stored === "true");
    } catch {
      if (isSettings) setSettingsOpen(true);
    }
  }, [isSettings]);

  const toggleSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !settingsOpen;
    setSettingsOpen(next);
    try {
      localStorage.setItem(SIDEBAR_SETTINGS_OPEN, next ? "true" : "false");
    } catch { /* ignore */ }
  };

  const navigation = isSuperadmin
    ? [...baseNavigation, ...superadminNavigation]
    : baseNavigation;

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
            if (lastPublicPage) {
              router.push(lastPublicPage);
            } else {
              // Fallback to homepage if no public page stored
              router.push("/");
            }
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Website
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const IconComponent = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {IconComponent ? <IconComponent className="h-5 w-5" /> : null}
              {item.name}
            </Link>
          );
        })}

        {/* Settings twirldown */}
        <div className="pt-1">
          <div
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium",
              isSettings && "bg-primary text-primary-foreground"
            )}
          >
            <Link
              href="/admin/settings"
              className={cn(
                "flex flex-1 items-center gap-3 transition-colors rounded-md py-1 -my-1 px-2 -mx-2",
                isSettings ? "text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                isSettings ? "text-primary-foreground hover:bg-primary/80" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                      isSubActive ? "font-medium bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
