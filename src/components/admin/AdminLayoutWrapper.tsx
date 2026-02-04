"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
  isSuperadmin: boolean;
  siteName?: string | null;
  role?: string | null;
}

/**
 * Client component wrapper for admin layout.
 * Renders sidebar and a header bar showing current site name and role.
 */
export function AdminLayoutWrapper({
  children,
  isSuperadmin,
  siteName = null,
  role = null,
}: AdminLayoutWrapperProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login" || pathname?.startsWith("/admin/login");

  useEffect(() => {
    if (!isLoginPage) {
      document.body.classList.add("admin-theme");
      return () => {
        document.body.classList.remove("admin-theme");
      };
    }
  }, [isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const displaySite = siteName?.trim() || "Platform";
  const displayRole = role?.trim()
    ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
    : "—";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isSuperadmin={isSuperadmin} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="shrink-0 border-b bg-muted/40 px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{displaySite}</span>
          <span aria-hidden>·</span>
          <span>{displayRole}</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
