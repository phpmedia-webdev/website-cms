"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { FeatureGuard } from "@/components/admin/FeatureGuard";
import { VIEW_AS_COOKIE_NAME } from "@/lib/admin/view-as";
import { Button } from "@/components/ui/button";

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
  isSuperadmin: boolean;
  siteName?: string | null;
  role?: string | null;
  /** Effective feature slugs for sidebar and route guards; "all" = superadmin / allow everything. */
  effectiveFeatureSlugs?: string[] | "all";
  /** View as Role + Site is active (superadmin testing). */
  viewAsActive?: boolean;
  viewAsSiteName?: string | null;
  viewAsRole?: string | null;
  /** Show Settings → Users link; only true for tenant admin or superadmin. */
  canManageTeam?: boolean;
}

/**
 * Client component wrapper for admin layout.
 * Renders sidebar (filtered by effective features), header, and route guard (modal when blocked).
 */
export function AdminLayoutWrapper({
  children,
  isSuperadmin,
  siteName = null,
  role = null,
  effectiveFeatureSlugs = [],
  viewAsActive = false,
  viewAsSiteName = null,
  viewAsRole = null,
  canManageTeam = false,
}: AdminLayoutWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login" || pathname?.startsWith("/admin/login");
  const isMfaPage = pathname?.startsWith("/admin/mfa");
  const isAuthFlowPage = isLoginPage || isMfaPage;

  useEffect(() => {
    if (!isAuthFlowPage) {
      document.body.classList.add("admin-theme");
      return () => {
        document.body.classList.remove("admin-theme");
      };
    }
  }, [isAuthFlowPage]);

  function exitViewAs() {
    document.cookie = `${VIEW_AS_COOKIE_NAME}=; path=/; max-age=0`;
    router.refresh();
  }

  if (isAuthFlowPage) {
    const authSiteName = siteName?.trim() || "Admin";
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="shrink-0 border-b bg-muted/40 px-4 py-3 flex items-center justify-center sm:justify-start">
          <span className="font-semibold text-foreground">{authSiteName}</span>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          {children}
        </main>
      </div>
    );
  }

  const displaySite = siteName?.trim() || "Platform";
  const displayRole = role?.trim()
    ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
    : "—";

  // When view-as is active, never treat as "all" — enforce the emulated role's feature set
  const effectiveSlugsForGuard =
    viewAsActive && effectiveFeatureSlugs === "all"
      ? []
      : effectiveFeatureSlugs;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isSuperadmin={isSuperadmin}
        effectiveFeatureSlugs={effectiveSlugsForGuard}
        canManageTeam={canManageTeam}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {viewAsActive && (
          <div className="shrink-0 bg-destructive/90 text-destructive-foreground px-4 py-2 flex items-center justify-between gap-2 text-sm">
            <span>
              Viewing as <strong>{viewAsSiteName ?? "—"}</strong>
              <span aria-hidden> · </span>
              <strong>{viewAsRole ? viewAsRole.charAt(0).toUpperCase() + viewAsRole.slice(1).toLowerCase() : "—"}</strong>
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 h-7 text-destructive-foreground border-destructive-foreground/50 hover:bg-destructive-foreground/10"
              onClick={exitViewAs}
            >
              Exit View As
            </Button>
          </div>
        )}
        <header className="shrink-0 border-b bg-muted/40 px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{displaySite}</span>
          <span aria-hidden>·</span>
          <span>{displayRole}</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">
            <FeatureGuard
              effectiveFeatureSlugs={effectiveSlugsForGuard}
              isSuperadmin={isSuperadmin}
            >
              {children}
            </FeatureGuard>
          </div>
        </main>
      </div>
    </div>
  );
}
