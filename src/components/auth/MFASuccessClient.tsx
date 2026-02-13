"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { applyMfaUpgrade } from "@/app/admin/mfa/success/actions";
import { Loader2 } from "lucide-react";

export default function MFASuccessClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  const redirectTo = searchParams.get("redirect") || "/admin/dashboard";
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/admin/dashboard";

  useEffect(() => {
    let mounted = true;

    async function run() {
      const result = await applyMfaUpgrade();
      if (!mounted) return;

      if (result.ok) {
        setStatus("ok");
        window.location.replace(safeRedirect);
      } else {
        setStatus("error");
        const params = new URLSearchParams({ error: result.error || "invalid", redirect: safeRedirect });
        window.location.replace(`/admin/mfa/challenge?${params}`);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [safeRedirect]);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">
        {status === "loading" && "Completing sign-in..."}
        {status === "ok" && "Redirecting..."}
        {status === "error" && "Something went wrong. Redirecting..."}
      </p>
    </div>
  );
}
