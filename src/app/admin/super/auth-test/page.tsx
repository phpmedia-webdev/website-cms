"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Loader2, Play, Send, List, ChevronDown, ChevronUp } from "lucide-react";

type CheckResult = {
  name: string;
  ok: boolean;
  status?: number;
  detail?: unknown;
  error?: string;
};

type ActivityEntry = {
  id: string;
  timestamp: string;
  label: string;
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
  ok: boolean;
  detail?: unknown;
  error?: string;
};

const LIVE_BASE = "https://auth.phpmedia.com";

function formatTime() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

export default function AuthTestPage() {
  const [health, setHealth] = useState<CheckResult | null>(null);
  const [validateKey, setValidateKey] = useState<CheckResult | null>(null);
  const [validateUser, setValidateUser] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ ok: boolean; status: number; body: unknown; error?: string } | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const pushActivity = useCallback(
    (entry: Omit<ActivityEntry, "id">) => {
      setActivityLog((prev) => [
        ...prev,
        { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` },
      ]);
    },
    []
  );

  const runStatusTests = useCallback(async () => {
    setLoading(true);
    setHealth(null);
    setValidateKey(null);
    setValidateUser(null);

    const runOne = async (
      label: string,
      endpoint: string,
      method: string,
      fetcher: () => Promise<Response>
    ): Promise<{ status: number; ok: boolean; json: Record<string, unknown> }> => {
      const start = Date.now();
      const res = await fetcher();
      const durationMs = Date.now() - start;
      const json = await res.json().catch(() => ({})) as Record<string, unknown>;
      pushActivity({
        timestamp: formatTime(),
        label,
        endpoint,
        method,
        status: res.status,
        durationMs,
        ok: res.ok,
        detail: json,
        error: res.ok ? undefined : (String(json?.message ?? res.statusText)),
      });
      return { status: res.status, ok: res.ok, json };
    };

    try {
      const [healthResult, keyResult, statusResult] = await Promise.all([
        runOne(
          "Health",
          `${LIVE_BASE}/api/external/health`,
          "GET",
          () => fetch("/api/admin/php-auth-health", { cache: "no-store" })
        ),
        runOne(
          "Validate API key",
          `${LIVE_BASE}/api/external/validate-api-key`,
          "POST",
          () => fetch("/api/admin/php-auth-validate-key", { method: "POST", cache: "no-store" })
        ),
        runOne(
          "Validate user",
          `${LIVE_BASE}/api/external/validate-user`,
          "POST",
          () => fetch("/api/admin/php-auth-status", { cache: "no-store" })
        ),
      ]);

      const healthJson = healthResult.json;
      setHealth({
        name: "Health",
        ok: healthResult.ok && (healthJson.success === true || (healthJson.body as { status?: string })?.status === "healthy"),
        status: healthResult.status,
        detail: (healthJson.body ?? healthJson) as CheckResult["detail"],
        error: healthJson.message as string | undefined ?? (healthResult.ok ? undefined : undefined),
      });

      const keyJson = keyResult.json;
      setValidateKey({
        name: "Validate API key",
        ok: keyResult.ok && keyJson.success === true,
        status: keyResult.status,
        detail: (keyJson.body ?? keyJson) as CheckResult["detail"],
        error: keyJson.message as string | undefined ?? (keyResult.ok ? undefined : undefined),
      });

      const statusJson = statusResult.json;
      const vu = statusJson.validateUser;
      setValidateUser({
        name: "Validate user",
        ok: statusResult.ok && (vu as { success?: boolean })?.success === true,
        status: statusResult.status,
        detail: statusResult.ok ? { validateUser: vu, config: statusJson.config } : statusJson,
        error: (statusJson.error as string | undefined) ?? (statusResult.ok ? undefined : undefined),
      });
    } catch (e) {
      setHealth({ name: "Health", ok: false, error: String(e) });
      setValidateKey({ name: "Validate API key", ok: false, error: String(e) });
      setValidateUser({ name: "Validate user", ok: false, error: String(e) });
    } finally {
      setLoading(false);
    }
  }, [pushActivity]);

  useEffect(() => {
    runStatusTests();
  }, [runStatusTests]);

  const handleLookup = async () => {
    const email = lookupEmail.trim();
    if (!email) return;
    setLookupLoading(true);
    setLookupResult(null);
    const start = Date.now();
    try {
      const res = await fetch(`/api/admin/php-auth-user-lookup?${new URLSearchParams({ email }).toString()}`, {
        cache: "no-store",
      });
      const durationMs = Date.now() - start;
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        statusCode?: number;
        durationMs?: number;
        body?: unknown;
        endpoint?: string;
        error?: string;
        message?: string;
      };
      const ok = res.ok && data.success === true;
      const statusCode = data.statusCode ?? res.status;
      const errorText = data.error ?? (ok ? undefined : (data.message ?? res.statusText));
      pushActivity({
        timestamp: formatTime(),
        label: "User lookup (by email)",
        endpoint: data.endpoint ?? `${LIVE_BASE}/api/external/check-user`,
        method: "GET",
        status: statusCode,
        durationMs: data.durationMs ?? durationMs,
        ok,
        detail: data.body ?? data,
        error: errorText,
      });
      setLookupResult({
        ok,
        status: statusCode,
        body: data.body ?? data,
        error: errorText,
      });
    } catch (e) {
      pushActivity({
        timestamp: formatTime(),
        label: "User lookup (by email)",
        endpoint: "(request failed)",
        method: "GET",
        status: 0,
        durationMs: Date.now() - start,
        ok: false,
        error: String(e),
      });
      setLookupResult({ ok: false, status: 0, body: null, error: String(e) });
    } finally {
      setLookupLoading(false);
    }
  };

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
        <code className="rounded bg-muted px-1">docs/reference/validate-user-troubleshooting.md</code> for troubleshooting.{" "}
        Sync payload: <code className="rounded bg-muted px-1">docs/reference/website-cms-sync-user-role-api.md</code>.
      </p>

      <Tabs defaultValue="api-tests" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="api-tests" className="gap-2">
            <Play className="h-4 w-4" />
            API tests
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <List className="h-4 w-4" />
            Activity list
            {activityLog.length > 0 && (
              <span className="ml-1 rounded-full bg-muted-foreground/20 px-1.5 py-0 text-xs">
                {activityLog.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-tests" className="space-y-6 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={runStatusTests}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run status tests
            </Button>
          </div>

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
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() =>
                          setExpandedCards((prev) => ({ ...prev, [r.name]: !prev[r.name] }))
                        }
                        aria-expanded={expandedCards[r.name] ?? false}
                      >
                        <CardHeader className="pb-2 pt-4 px-4">
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
                            <span className="ml-auto shrink-0 text-muted-foreground">
                              {expandedCards[r.name] ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </span>
                          </div>
                        </CardHeader>
                      </button>
                      {expandedCards[r.name] && (
                        <CardContent className="space-y-2 pt-0 px-4 pb-4">
                          {r.error && (
                            <p className="text-sm text-destructive">{r.error}</p>
                          )}
                          {r.detail != null && (
                            <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-48">
                              {JSON.stringify(r.detail, null, 2)}
                            </pre>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  )
              )}
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <h2 className="text-lg font-semibold">Look up user in PHP-Auth</h2>
              <p className="text-sm text-muted-foreground">
                Enter an email to check if that user is in the PHP-Auth user list for this application’s organization. Calls <code>GET /api/external/check-user?email=...</code> (email is normalized to lowercase). Response: <code>exists: true</code> with minimal user info if in your org, or <code>exists: false</code> if not. If you get 404, the endpoint may not be deployed on your auth server; set <code>AUTH_CHECK_USER_PATH</code> to override the path (e.g. <code>api/v1/check-user</code>). See sync-user-role API doc Section 9.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px]">
                  <Label htmlFor="lookup-email">User email</Label>
                  <Input
                    id="lookup-email"
                    type="email"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="mt-1"
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleLookup}
                  disabled={lookupLoading || !lookupEmail.trim()}
                >
                  {lookupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Look up user
                </Button>
              </div>
              {lookupResult && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    {lookupResult.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span>HTTP {lookupResult.status}</span>
                    {lookupResult.error && (
                      <span className="text-destructive">{lookupResult.error}</span>
                    )}
                  </div>
                  <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-64">
                    {JSON.stringify(lookupResult.body, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <h2 className="text-lg font-semibold">Activity list</h2>
              <p className="text-sm text-muted-foreground">
                Each API call and result. Run status tests or look up a user on the API tests tab to add entries.
              </p>
            </CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No entries yet. Run status tests or look up a user on the API tests tab.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium">Time</th>
                        <th className="text-left py-2 pr-4 font-medium">Endpoint</th>
                        <th className="text-left py-2 pr-4 font-medium">Method</th>
                        <th className="text-left py-2 pr-4 font-medium">Status</th>
                        <th className="text-left py-2 pr-4 font-medium">Duration</th>
                        <th className="text-left py-2 font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLog.map((entry) => (
                        <tr key={entry.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 text-muted-foreground font-mono">{entry.timestamp}</td>
                          <td className="py-2 pr-4">
                            <span className="font-medium">{entry.label}</span>
                            <div className="text-xs text-muted-foreground truncate max-w-[280px]" title={entry.endpoint}>
                              {entry.endpoint}
                            </div>
                          </td>
                          <td className="py-2 pr-4">{entry.method}</td>
                          <td className="py-2 pr-4">{entry.status}</td>
                          <td className="py-2 pr-4">{entry.durationMs} ms</td>
                          <td className="py-2">
                            {entry.ok ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive inline" />
                            )}
                            {entry.error && (
                              <span className="text-destructive text-xs ml-1">{entry.error}</span>
                            )}
                            {entry.detail != null && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-xs text-muted-foreground">Response</summary>
                                <pre className="text-xs bg-muted rounded p-2 mt-1 overflow-auto max-h-32">
                                  {JSON.stringify(entry.detail, null, 2)}
                                </pre>
                              </details>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
