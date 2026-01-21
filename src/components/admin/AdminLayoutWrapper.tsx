"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
  isSuperadmin: boolean;
}

/**
 * Client component wrapper for admin layout.
 * Uses usePathname() hook to conditionally render sidebar.
 * This is the proper Next.js way to access pathname in a layout.
 */
export function AdminLayoutWrapper({
  children,
  isSuperadmin,
}: AdminLayoutWrapperProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login" || pathname.startsWith("/admin/login");

  // Don't show sidebar on login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show sidebar for all other admin pages
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isSuperadmin={isSuperadmin} />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
