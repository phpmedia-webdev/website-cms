"use client";

import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

interface PublicHeaderAuthProps {
  /** Display label for "Welcome, {displayLabel}" (e.g. display_name, email, or "Member") */
  displayLabel: string;
  /** Use button style for nav (default: link style to match existing nav) */
  variant?: "link" | "button";
  /** When false, only show Log Out (e.g. for footer). Default true. */
  showWelcome?: boolean;
}

/**
 * Client component for public header: shows "Welcome, {displayLabel}" and a Log Out control.
 * Sign-out is client-side; after signOut we redirect to home.
 */
export function PublicHeaderAuth({
  displayLabel,
  variant = "link",
  showWelcome = true,
}: PublicHeaderAuthProps) {
  const router = useRouter();

  const handleLogOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      {showWelcome && (
        <span className="text-sm text-muted-foreground">
          Welcome, {displayLabel}
        </span>
      )}
      {variant === "link" ? (
        <button
          type="button"
          onClick={handleLogOut}
          className="text-sm hover:underline bg-transparent border-none cursor-pointer font-inherit p-0"
        >
          Log Out
        </button>
      ) : (
        <button
          type="button"
          onClick={handleLogOut}
          className="text-xs opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer font-inherit p-0"
        >
          Log Out
        </button>
      )}
    </>
  );
}
