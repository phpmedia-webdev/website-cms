"use client";

import { useEffect, useState } from "react";

const SCRIPT_ID = "contactus-jssdk";

interface OmnichatConfig {
  widgetId: string;
  apiKey: string;
  moduleConfigUrl: string;
}

/**
 * Original Anychat admin embed: set window.anw and inject the script.
 * No modifications; widget behaves as on anychat.one.
 */
export function AnychatAdminEmbed() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/crm/omnichat/config");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorMessage(data.error || data.hint || "Failed to load OmniChat config");
          setStatus("error");
          return;
        }
        const config: OmnichatConfig = await res.json();
        if (cancelled) return;

        (window as unknown as { anw?: Record<string, unknown> }).anw = {
          ...(window as unknown as { anw?: Record<string, unknown> }).anw,
          mainButton: true,
          widgetID: config.widgetId,
          apiKey: config.apiKey,
          showNewMessagePopup: true,
          moduleConfigUrl: config.moduleConfigUrl,
        };

        if (document.getElementById(SCRIPT_ID)) {
          setStatus("ready");
          return;
        }

        const js = document.createElement("script");
        js.id = SCRIPT_ID;
        js.src = `https://api.anychat.one/widget/${config.widgetId}/admin-livechat-js?r=${encodeURIComponent(window.location.href)}`;
        const fjs = document.getElementsByTagName("script")[0];
        fjs?.parentNode?.insertBefore(js, fjs);

        setStatus("ready");
      } catch {
        if (!cancelled) {
          setErrorMessage("Failed to load OmniChat config");
          setStatus("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      const el = document.getElementById(SCRIPT_ID);
      el?.remove();
    };
  }, []);

  if (status === "loading") {
    return <p className="text-muted-foreground text-sm">Loading OmniChat…</p>;
  }

  if (status === "error") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4 text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-200">OmniChat unavailable</p>
        <p className="mt-1 text-amber-700 dark:text-amber-300">{errorMessage}</p>
      </div>
    );
  }

  return null;
}
