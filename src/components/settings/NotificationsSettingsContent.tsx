"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Mail, Bell, ListChecks, Loader2, ExternalLink, Smartphone } from "lucide-react";
import { SmtpConfigForm } from "@/components/settings/SmtpConfigForm";
import {
  NOTIFICATION_ACTION_KEYS,
  NOTIFICATION_ACTION_LABELS,
  type NotificationActionKey,
  type NotificationPreferences,
} from "@/lib/notifications/actions";

const PREFERENCES_API = "/api/settings/notifications/preferences";

type PreferencesState = Record<NotificationActionKey, { email: boolean; pwa: boolean }>;

/**
 * Notifications settings page — hub for email (SMTP), push (PWA), and per-action toggles.
 */
export function NotificationsSettingsContent() {
  const [preferences, setPreferences] = useState<PreferencesState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(PREFERENCES_API);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load preferences");
      }
      const data = await res.json();
      setPreferences(data.preferences ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateAction = useCallback(
    (key: NotificationActionKey, field: "email" | "pwa", value: boolean) => {
      if (!preferences) return;
      setPreferences((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        next[key] = { ...next[key], [field]: value };
        return next;
      });
    },
    [preferences]
  );

  const save = useCallback(async () => {
    if (!preferences) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(PREFERENCES_API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [preferences]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Configure how the site sends notifications: email (SMTP) and push (PWA). Choose which actions trigger Email and/or PWA.
        </p>
      </div>

      {/* Actions list: checkboxes for Email / PWA per action */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Notification actions</CardTitle>
          </div>
          <CardDescription>
            Turn on Email and/or PWA for each action. When an action occurs, notifications are sent according to these settings (once SMTP and PWA are configured).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : preferences ? (
            <>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left font-medium px-4 py-3">Action</th>
                      <th className="text-right font-medium px-4 py-3 w-24">Email</th>
                      <th className="text-right font-medium px-4 py-3 w-24">PWA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {NOTIFICATION_ACTION_KEYS.map((key) => (
                      <tr key={key} className="border-b last:border-b-0">
                        <td className="px-4 py-3">{NOTIFICATION_ACTION_LABELS[key]}</td>
                        <td className="px-4 py-3 text-right">
                          <Checkbox
                            checked={preferences[key]?.email ?? false}
                            onCheckedChange={(checked) =>
                              updateAction(key, "email", checked === true)
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Checkbox
                            checked={preferences[key]?.pwa ?? false}
                            onCheckedChange={(checked) =>
                              updateAction(key, "pwa", checked === true)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <Button onClick={save} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    "Save preferences"
                  )}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Email / SMTP</CardTitle>
          </div>
          <CardDescription>
            Set up SMTP so the app can send email notifications (e.g. new signup, form submission). Host, port, username, password, and from address are configured here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SmtpConfigForm idPrefix="notif-smtp" saveLabel="Save SMTP settings" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Push / PWA</CardTitle>
          </div>
          <CardDescription>
            Enable push notifications for admins (e.g. new contacts, form submissions). Open the Status page to subscribe to notifications and add the app to your home screen for alerts when the app is in the background.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/status" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Status page
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Opens the admin status dashboard in a new tab. From there you can add to home screen and (when available) enable push.
            </span>
          </div>
          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground">Add to home screen:</strong> Open the Status page, then use your browser&apos;s menu (e.g. &quot;Add to Home Screen&quot; on iOS, &quot;Install app&quot; or &quot;Add to Home screen&quot; in Chrome) to install the PWA for quick access and push notifications.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
