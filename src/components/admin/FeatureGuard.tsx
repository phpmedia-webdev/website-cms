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
  "This feature is not enabled for your account. Contact your plan administrator.";

interface FeatureGuardProps {
  children: React.ReactNode;
  effectiveFeatureSlugs: string[] | "all";
  isSuperadmin: boolean;
}

/**
 * When the current path requires a feature the user doesn't have, show a modal and redirect on OK.
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
    router.push("/admin/dashboard");
  };

  return (
    <>
      {children}
      <Dialog open={blocked} onOpenChange={(open) => !open && handleOk()}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Feature not enabled</DialogTitle>
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
