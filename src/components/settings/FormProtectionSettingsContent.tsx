"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, ExternalLink, AlertTriangle } from "lucide-react";

const API = "/api/settings/form-protection";

interface FormProtectionState {
  recaptchaEnabled: boolean;
  recaptchaSiteKey: string;
  recaptchaSecretKey: string;
}

/**
 * Form protection settings — reCAPTCHA (Google) per tenant.
 * Secret key is sent only on save; never echoed back in GET.
 * @param embedded — when true, omit the page heading (e.g. when used as a tab in General settings)
 */
export function FormProtectionSettingsContent({ embedded = false }: { embedded?: boolean }) {
  const [state, setState] = useState<FormProtectionState>({
    recaptchaEnabled: false,
    recaptchaSiteKey: "",
    recaptchaSecretKey: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load settings");
      }
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        recaptchaEnabled: Boolean(data.recaptchaEnabled),
        recaptchaSiteKey: data.recaptchaSiteKey ?? "",
        // Secret key is never returned by API; keep existing if user hasn't changed it
        recaptchaSecretKey: prev.recaptchaSecretKey,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recaptchaEnabled: state.recaptchaEnabled,
          recaptchaSiteKey: state.recaptchaSiteKey || undefined,
          recaptchaSecretKey: state.recaptchaSecretKey || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        recaptchaEnabled: Boolean(data.recaptchaEnabled),
        recaptchaSiteKey: data.recaptchaSiteKey ?? "",
        // Clear secret key from state after save so we don't keep it in memory
        recaptchaSecretKey: "",
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [state.recaptchaEnabled, state.recaptchaSiteKey, state.recaptchaSecretKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold">Form protection</h1>
          <p className="text-muted-foreground mt-2">
            Reduce spam and bot submissions on public forms. Configure reCAPTCHA (Google) per tenant. Site key is used in the browser; secret key is used only on the server.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/40 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Do not change these settings — they were set by the super administrator. Changing them could render the captcha inoperative.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>reCAPTCHA (Google)</CardTitle>
          <CardDescription>
            Get keys at{" "}
            <a
              href="https://www.google.com/recaptcha/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Google reCAPTCHA admin
              <ExternalLink className="h-3 w-3" />
            </a>{" "}
            (v2 checkbox or v3 invisible). Site key is public; secret key must be kept private.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="recaptcha-enabled">Enable reCAPTCHA for public forms</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                When enabled, embedded forms will show a reCAPTCHA challenge before submit.
              </p>
            </div>
            <Switch
              id="recaptcha-enabled"
              checked={state.recaptchaEnabled}
              onCheckedChange={(checked) =>
                setState((prev) => ({ ...prev, recaptchaEnabled: checked }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recaptcha-site-key">Site key (public)</Label>
            <Input
              id="recaptcha-site-key"
              type="text"
              value={state.recaptchaSiteKey}
              onChange={(e) =>
                setState((prev) => ({ ...prev, recaptchaSiteKey: e.target.value }))
              }
              placeholder="e.g. 6Lc..."
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recaptcha-secret-key">Secret key (server-only)</Label>
            <Input
              id="recaptcha-secret-key"
              type="password"
              value={state.recaptchaSecretKey}
              onChange={(e) =>
                setState((prev) => ({ ...prev, recaptchaSecretKey: e.target.value }))
              }
              placeholder="Leave blank to keep existing"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Enter a new value only to change it. Not shown after save.
            </p>
          </div>
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
