"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Images,
  FolderImage,
  FormInput,
  Settings,
  Shield,
} from "lucide-react";

interface SidebarProps {
  isSuperadmin?: boolean;
}

const baseNavigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Posts", href: "/admin/posts", icon: FileText },
  { name: "Galleries", href: "/admin/galleries", icon: FolderImage },
  { name: "Media", href: "/admin/media", icon: Images },
  { name: "Forms", href: "/admin/forms", icon: FormInput },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const superadminNavigation = [
  { name: "Superadmin", href: "/admin/super", icon: Shield },
];

export function Sidebar({ isSuperadmin = false }: SidebarProps) {
  const pathname = usePathname();
  
  // Combine navigation items
  const navigation = isSuperadmin
    ? [...baseNavigation, ...superadminNavigation]
    : baseNavigation;

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">CMS Admin</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
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
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
