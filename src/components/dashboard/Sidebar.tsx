"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const superadminNavigation = [
  { name: "Superadmin", href: "/admin/super", icon: Shield },
];

export function Sidebar({ isSuperadmin = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseClient();
  
  // Combine navigation items
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
      <nav className="flex-1 space-y-1 p-4">
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
