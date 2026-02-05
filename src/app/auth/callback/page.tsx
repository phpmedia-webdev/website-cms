"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";

/**
 * Auth callback for email confirmation (and other redirects from Supabase).
 * Handles two flows:
 * 1. Default: Supabase redirects here with session in hash (#access_token=...&refresh_token=...).
 * 2. Query params: token_hash and type (if email template points here); we redirect to API route to verify.
 */
export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = getSupabaseClient();
    const next = searchParams.get("next") || "/login";

    // Flow 1: tokens in hash (default Supabase redirect after email confirm)
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(() => {
            setStatus("success");
            window.location.replace(next);
          })
          .catch((err) => {
            console.error("Auth callback setSession:", err);
            setStatus("error");
            setMessage(err?.message || "Could not complete sign in.");
          });
        return;
      }
    }

    // Flow 2: token_hash and type in query (custom email template)
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    if (tokenHash && type) {
      const url = `/api/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&next=${encodeURIComponent(next)}`;
      window.location.replace(url);
      return;
    }

    // No hash and no token_hash: already confirmed or invalid link
    setStatus("error");
    setMessage("Invalid or expired confirmation link. Please try signing in or request a new confirmation email.");
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Confirming your email…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">{message}</p>
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-muted-foreground">Redirecting…</p>
    </div>
  );
}
