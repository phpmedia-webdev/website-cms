"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Loader2, FileText, Key } from "lucide-react";

type ImportMode = "csv" | "api";

export function WooSyncCard() {
  const router = useRouter();
  const [mode, setMode] = useState<ImportMode>("csv");
  const [loading, setLoading] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importType, setImportType] = useState<"all" | "customers" | "orders">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{
    customers: { created: number; updated: number; errors: unknown[] } | null;
    orders: { created: number; skipped: number; errors: unknown[] } | null;
  } | null>(null);

  const [siteUrl, setSiteUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [apiSync, setApiSync] = useState<"all" | "customers" | "orders">("all");

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) {
      alert("Paste CSV content or choose a file.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ecommerce/woo-sync/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, import_type: importType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          customers: { created: 0, updated: 0, errors: [{ error: data.error ?? "Import failed" }] },
          orders: { created: 0, skipped: 0, errors: [] },
        });
        return;
      }
      setResult({
        customers: data.customers ?? null,
        orders: data.orders ?? null,
      });
      router.refresh();
    } catch (e) {
      setResult({
        customers: {
          created: 0,
          updated: 0,
          errors: [{ error: e instanceof Error ? e.message : "Import failed" }],
        },
        orders: { created: 0, skipped: 0, errors: [] },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApiSync = async () => {
    if (!siteUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()) {
      alert("Store URL, Consumer key, and Consumer secret are required.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ecommerce/woo-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_url: siteUrl.trim(),
          consumer_key: consumerKey.trim(),
          consumer_secret: consumerSecret.trim(),
          sync: apiSync,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          customers: { created: 0, updated: 0, errors: [{ error: data.error ?? "Sync failed" }] },
          orders: { created: 0, skipped: 0, errors: [] },
        });
        return;
      }
      setResult({
        customers: data.customers ?? null,
        orders: data.orders ?? null,
      });
      router.refresh();
    } catch (e) {
      setResult({
        customers: {
          created: 0,
          updated: 0,
          errors: [{ error: e instanceof Error ? e.message : "Sync failed" }],
        },
        orders: { created: 0, skipped: 0, errors: [] },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Import from WooCommerce
          </CardTitle>
          <CardDescription>
            Preferred: paste or upload a WooCommerce export CSV. Or use REST API with store URL and
            keys. Run migration 140 before importing orders.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={mode === "csv" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("csv")}
          >
            <FileText className="h-4 w-4 mr-1" />
            CSV import
          </Button>
          <Button
            variant={mode === "api" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("api")}
          >
            <Key className="h-4 w-4 mr-1" />
            API
          </Button>
        </div>

        {mode === "csv" && (
          <>
            <div className="space-y-2">
              <Label>CSV (paste or choose file)</Label>
              <Textarea
                placeholder="Paste WooCommerce customers or orders export CSV here…"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose CSV file
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <Label className="sr-only">Import</Label>
                <Select
                  value={importType}
                  onValueChange={(v) => setImportType(v as "all" | "customers" | "orders")}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Customers + Orders</SelectItem>
                    <SelectItem value="customers">Customers only</SelectItem>
                    <SelectItem value="orders">Orders only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCsvImport}
                disabled={loading || !csvText.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Import from CSV"
                )}
              </Button>
            </div>
          </>
        )}

        {mode === "api" && (
          <>
            <div className="grid gap-2 max-w-xl">
              <div>
                <Label htmlFor="woo-site-url">Store URL</Label>
                <Input
                  id="woo-site-url"
                  type="url"
                  placeholder="https://yourstore.com"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="woo-consumer-key">Consumer key</Label>
                <Input
                  id="woo-consumer-key"
                  type="text"
                  placeholder="ck_…"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="woo-consumer-secret">Consumer secret</Label>
                <Input
                  id="woo-consumer-secret"
                  type="password"
                  placeholder="cs_…"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label>Sync</Label>
                <Select value={apiSync} onValueChange={(v) => setApiSync(v as "all" | "customers" | "orders")}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Customers + Orders</SelectItem>
                    <SelectItem value="customers">Customers only</SelectItem>
                    <SelectItem value="orders">Orders only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleApiSync}
              disabled={loading || !siteUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing…
                </>
              ) : (
                "Import via API"
              )}
            </Button>
          </>
        )}

        {result && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            {result.customers && (
              <p className="text-foreground">
                Customers: {result.customers.created} created, {result.customers.updated} updated.
                {result.customers.errors.length > 0 &&
                  ` ${result.customers.errors.length} error(s).`}
              </p>
            )}
            {result.orders && (
              <p className="text-foreground">
                Orders: {result.orders.created} created, {result.orders.skipped} skipped (already in
                app).{result.orders.errors.length > 0 && ` ${result.orders.errors.length} error(s).`}
              </p>
            )}
            {(result.customers?.errors?.length || result.orders?.errors?.length) ? (
              <p className="text-destructive text-xs mt-1">
                {[
                  ...(result.customers?.errors ?? []),
                  ...(result.orders?.errors ?? []),
                ]
                  .map((e) => (e as { error?: string }).error ?? String(e))
                  .slice(0, 3)
                  .join("; ")}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
