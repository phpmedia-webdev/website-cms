"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function MFASuccessClient({ redirect }: { redirect: string }) {
  const safeRedirect = redirect.startsWith("/") ? redirect : "/admin/dashboard";

  useEffect(() => {
    // Brief delay so browser has applied Set-Cookie from verify redirect before we navigate
    const t = setTimeout(() => {
      window.location.replace(safeRedirect);
    }, 100);
    return () => clearTimeout(t);
  }, [safeRedirect]);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
