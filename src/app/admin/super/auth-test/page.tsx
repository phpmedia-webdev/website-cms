"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type CheckResult = {
  name: string;
  ok: boolean;
  status?: number;
  detail?: unknown;
  error?: string;
};

const LIVE_BASE = "https://auth.phpmedia.com";

export default function AuthTestPage() {
  const [health, setHealth] = useState<CheckResult | null>(null);
  const [validateKey, setValidateKey] = useState<CheckResult | null>(null);
  const [validateUser, setValidateUser] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setHealth(null);
      setValidateKey(null);
      setValidateUser(null);

      try {
        const [healthRes, keyRes, statusRes] = await Promise.all([
          fetch("/api/admin/php-auth-health", { cache: "no-store" }),
          fetch("/api/admin/php-auth-validate-key", { method: "POST", cache: "no-store" }),
          fetch("/api/admin/php-auth-status", { cache: "no-store" }),
        ]);

        if (cancelled) return;

        const healthJson = await healthRes.json().catch(() => ({}));
        setHealth({
          name: "Health",
          ok: healthRes.ok && (healthJson.success === true || healthJson.body?.status === "healthy"),
          status: healthRes.status,
          detail: healthJson.body ?? healthJson,
          error: healthJson.message ?? (healthRes.ok ? undefined : healthRes.statusText),
        });

        const keyJson = await keyRes.json().catch(() => ({}));
        setValidateKey({
          name: "Validate API key",
          ok: keyRes.ok && keyJson.success === true,
          status: keyRes.status,
          detail: keyJson.body ?? keyJson,
          error: keyJson.message ?? (keyRes.ok ? undefined : keyRes.statusText),
        });

        const statusJson = await statusRes.json().catch(() => ({}));
        const vu = statusJson.validateUser;
        setValidateUser({
          name: "Validate user",
          ok: statusRes.ok && vu?.success === true,
          status: statusRes.status,
          detail: statusRes.ok ? { validateUser: vu, config: statusJson.config } : statusJson,
          error: statusJson.error ?? (statusRes.ok ? undefined : statusRes.statusText),
        });
      } catch (e) {
        if (!cancelled) {
          setHealth({ name: "Health", ok: false, error: String(e) });
          setValidateKey({ name: "Validate API key", ok: false, error: String(e) });
          setValidateUser({ name: "Validate user", ok: false, error: String(e) });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">PHP-Auth connectivity</h1>
        <p className="text-muted-foreground mt-2">
          Test endpoints against the live PHP-Auth app ({LIVE_BASE}). Uses your current session and env (AUTH_BASE_URL, AUTH_API_KEY).
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        See <code className="rounded bg-muted px-1">docs/reference/website-cms-validate-user-api.md</code> for the API summary and{" "}
        <code className="rounded bg-muted px-1">docs/reference/validate-user-troubleshooting.md</code> for troubleshooting.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Running health, validate-api-key, and validate-user…</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1">
          {[health, validateKey, validateUser].map(
            (r) =>
              r && (
                <Card key={r.name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      {r.ok ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive shrink-0" />
                      )}
                      <span className="font-semibold">{r.name}</span>
                      {r.status != null && (
                        <span className="text-muted-foreground text-sm">HTTP {r.status}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {r.error && (
                      <p className="text-sm text-destructive">{r.error}</p>
                    )}
                    {r.detail != null && (
                      <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-48">
                        {JSON.stringify(r.detail, null, 2)}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              )
          )}
        </div>
      )}
    </div>
  );
}
