"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { pathToFeatureSlug, canAccessFeature } from "@/lib/admin/route-features";

const FEATURE_NOT_ENABLED_MESSAGE =
  "Not included in your plan. Request support or contact your plan administrator to get access.";

const UPGRADE_PATH = "/admin/upgrade";

interface FeatureGuardProps {
  children: React.ReactNode;
  effectiveFeatureSlugs: string[] | "all";
  isSuperadmin: boolean;
}

/**
 * When the current path requires a feature the user doesn't have, show a modal and redirect to upgrade page on OK.
 */
export function FeatureGuard({
  children,
  effectiveFeatureSlugs,
  isSuperadmin,
}: FeatureGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!pathname?.startsWith("/admin")) return;
    if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return;
    if (pathname === UPGRADE_PATH || pathname.startsWith(UPGRADE_PATH + "/")) return;

    const requiredSlug = pathToFeatureSlug(pathname);
    if (requiredSlug === null) return;
    // Superadmin area: middleware already restricts; no feature check.
    if (requiredSlug === "superadmin") return;

    const allowed =
      effectiveFeatureSlugs === "all" || canAccessFeature(effectiveFeatureSlugs, requiredSlug);
    if (!allowed) {
      setBlocked(true);
    } else {
      setBlocked(false);
    }
  }, [pathname, effectiveFeatureSlugs]);

  const handleOk = () => {
    setBlocked(false);
    router.push(UPGRADE_PATH);
  };

  return (
    <>
      {children}
      <Dialog open={blocked} onOpenChange={(open) => !open && handleOk()}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Feature not available</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{FEATURE_NOT_ENABLED_MESSAGE}</p>
          <DialogFooter>
            <Button onClick={handleOk}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
