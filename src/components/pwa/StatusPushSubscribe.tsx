"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";

/** Decode URL-safe base64 VAPID public key to Uint8Array for pushManager.subscribe. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function StatusPushSubscribe() {
  const [status, setStatus] = useState<"idle" | "loading" | "subscribed" | "unsupported" | "denied" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      setMessage("Push not supported in this browser.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus("denied");
        setMessage("Notifications were denied.");
        return;
      }

      const res = await fetch("/api/settings/pwa/vapid-public");
      const data = await res.json();
      if (!res.ok || !data?.publicKey) {
        setStatus("error");
        setMessage("Could not get push configuration.");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
      });

      const json = sub.toJSON();
      const body = {
        endpoint: json.endpoint,
        keys: json.keys,
      };

      const postRes = await fetch("/api/settings/pwa/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!postRes.ok) {
        setStatus("error");
        setMessage("Failed to save subscription.");
        return;
      }

      setStatus("subscribed");
      setMessage("Push notifications enabled.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      setStatus("subscribed");
      setMessage("Push notifications enabled.");
    }
  }, []);

  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Push is not supported in this browser.
      </p>
    );
  }

  if (status === "subscribed") {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Bell className="h-4 w-4 text-green-600" />
        {message}
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <BellOff className="h-4 w-4" />
        {message}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={subscribe}
        disabled={status === "loading"}
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Enabling…
          </>
        ) : (
          <>
            <Bell className="h-4 w-4 mr-2" />
            Enable push notifications
          </>
        )}
      </Button>
      {message && status === "error" && (
        <p className="text-sm text-destructive">{message}</p>
      )}
    </div>
  );
}
