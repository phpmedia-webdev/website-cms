"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const REDIRECT_DELAY_SEC = 3;

export default function MFASuccessClient({ redirect }: { redirect: string }) {
  const safeRedirect = redirect.startsWith("/") ? redirect : "/admin/dashboard";
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SEC);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          window.location.replace(safeRedirect);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [safeRedirect]);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <CheckCircle2 className="h-16 w-16 text-green-600" />
      <h2 className="text-xl font-semibold">Success!</h2>
      <p className="text-muted-foreground">
        Two-factor authentication complete. Redirecting to admin in {countdown} second{countdown !== 1 ? "s" : ""}…
      </p>
    </div>
  );
}
