"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Copy, Check, ExternalLink, Smartphone, Loader2 } from "lucide-react";

export function GeneralSettingsContent() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [siteMode, setSiteMode] = useState<"live" | "coming_soon">("live");
  const [siteModeLocked, setSiteModeLocked] = useState(false);
  const [siteModeLockedReason, setSiteModeLockedReason] = useState("");
  const [comingSoonSnippetId, setComingSoonSnippetId] = useState<string | null>(null);
  const [snippetOptions, setSnippetOptions] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [pwaName, setPwaName] = useState("");
  const [pwaShortName, setPwaShortName] = useState("");
  const [pwaThemeColor, setPwaThemeColor] = useState("#0f172a");
  const [pwaBackgroundColor, setPwaBackgroundColor] = useState("#ffffff");
  const [pwaIconValue, setPwaIconValue] = useState("");
  const [pwaSaving, setPwaSaving] = useState(false);
  const [pwaSaved, setPwaSaved] = useState(false);

  const copyToClipboard = async (value: string, field: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value.trim());
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/site-metadata").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/settings/site-mode").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/settings/snippets").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/settings/pwa").then((res) => (res.ok ? res.json() : null)),
    ]).then(([meta, mode, snippets, pwa]) => {
      if (meta) {
        setName(meta.name ?? "");
        setDescription(meta.description ?? "");
        setUrl(meta.url ?? "");
      }
      if (mode) {
        setSiteMode(mode.mode === "coming_soon" ? "coming_soon" : "live");
        setSiteModeLocked(!!mode.site_mode_locked);
        setSiteModeLockedReason(mode.site_mode_locked_reason ?? "");
        setComingSoonSnippetId(mode.coming_soon_snippet_id ?? null);
      }
      setSnippetOptions(Array.isArray(snippets) ? snippets : []);
      if (pwa && typeof pwa === "object") {
        setPwaName(pwa.name ?? "Site Status");
        setPwaShortName(pwa.short_name ?? "Status");
        setPwaThemeColor(pwa.theme_color ?? "#0f172a");
        setPwaBackgroundColor(pwa.background_color ?? "#ffffff");
        setPwaIconValue(pwa.icon_url?.trim() ?? pwa.icon_media_id?.trim() ?? "");
      }
      fetch("/api/admin/me/context")
        .then((r) => (r.ok ? r.json() : null))
        .then((ctx) => setIsSuperadmin(!!ctx?.isSuperadmin))
        .catch(() => {});
      setLoading(false);
    });
  }, []);

  const handleSiteModeChange = async (mode: "live" | "coming_soon") => {
    if (siteModeLocked && !isSuperadmin) return;
    setSavingMode(true);
    try {
      const res = await fetch("/api/settings/site-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          coming_soon_snippet_id: comingSoonSnippetId?.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to update site mode");
      }
      const data = await res.json();
      setSiteMode(data.mode === "coming_soon" ? "coming_soon" : "live");
      if (data.coming_soon_snippet_id !== undefined) setComingSoonSnippetId(data.coming_soon_snippet_id ?? null);
    } catch (err) {
      console.error("Site mode error:", err);
      alert(err instanceof Error ? err.message : "Failed to update site mode");
    } finally {
      setSavingMode(false);
    }
  };

  const handleLockChange = async (locked: boolean, reason?: string) => {
    if (!isSuperadmin) return;
    setSavingMode(true);
    try {
      const res = await fetch("/api/settings/site-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_mode_locked: locked,
          site_mode_locked_reason: locked ? (reason ?? siteModeLockedReason) : null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to update lock");
      }
      const data = await res.json();
      setSiteModeLocked(!!data.site_mode_locked);
      setSiteModeLockedReason(data.site_mode_locked_reason ?? "");
    } catch (err) {
      console.error("Lock error:", err);
      alert(err instanceof Error ? err.message : "Failed to update lock");
    } finally {
      setSavingMode(false);
    }
  };

  const handlePwaSave = async () => {
    setPwaSaving(true);
    setPwaSaved(false);
    try {
      const isUrl = /^https?:\/\//i.test(pwaIconValue.trim());
      const body: Record<string, string> = {
        name: pwaName.trim() || "Site Status",
        short_name: pwaShortName.trim() || "Status",
        theme_color: pwaThemeColor.trim() || "#0f172a",
        background_color: pwaBackgroundColor.trim() || "#ffffff",
      };
      if (pwaIconValue.trim()) {
        if (isUrl) {
          body.icon_url = pwaIconValue.trim();
          body.icon_media_id = "";
        } else {
          body.icon_media_id = pwaIconValue.trim();
          body.icon_url = "";
        }
      } else {
        body.icon_url = "";
        body.icon_media_id = "";
      }
      const res = await fetch("/api/settings/pwa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setPwaSaved(true);
      setTimeout(() => setPwaSaved(false), 2000);
    } catch (err) {
      console.error("PWA save error:", err);
      alert(err instanceof Error ? err.message : "Failed to save PWA settings");
    } finally {
      setPwaSaving(false);
    }
  };

  const handleComingSoonSnippetChange = async (value: string) => {
    const id = value === "__none__" ? null : value;
    const prev = comingSoonSnippetId;
    setComingSoonSnippetId(id);
    setSavingMode(true);
    try {
      const res = await fetch("/api/settings/site-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coming_soon_snippet_id: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save coming soon snippet");
      }
      setComingSoonSnippetId(data.coming_soon_snippet_id ?? null);
    } catch (err) {
      console.error("Coming soon snippet error:", err);
      alert(err instanceof Error ? err.message : "Failed to save snippet");
      setComingSoonSnippetId(prev);
    } finally {
      setSavingMode(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">General Settings</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">General Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure general application settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Site Mode</CardTitle>
          <CardDescription>
            When set to Coming soon, the public site shows only the Coming soon page. Admin and API remain accessible so you can log in and switch back.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Coming soon</span>
              <Switch
                checked={siteMode === "live"}
                onCheckedChange={(checked) =>
                  handleSiteModeChange(checked ? "live" : "coming_soon")
                }
                disabled={(siteModeLocked && !isSuperadmin) || savingMode}
              />
              <span className="text-sm font-medium text-muted-foreground">Live</span>
            </div>
            {siteModeLocked && !isSuperadmin && (
              <span className="text-sm text-muted-foreground">
                Site mode is locked by superadmin.
              </span>
            )}
          </div>
          <div>
            <Label htmlFor="coming-soon-snippet" className="text-sm font-medium">
              Coming soon message
            </Label>
            <Select
              value={comingSoonSnippetId ?? "__none__"}
              onValueChange={handleComingSoonSnippetChange}
              disabled={savingMode}
            >
              <SelectTrigger id="coming-soon-snippet" className="mt-1 max-w-md">
                <SelectValue placeholder="Choose a snippet (or None)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {snippetOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title || s.slug || s.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Create snippets in Content → Content library (content type: Snippet). Shown on the Coming soon page with formatting, links, images, and galleries.
            </p>
          </div>
          {isSuperadmin && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="site-mode-lock"
                  checked={siteModeLocked}
                  onCheckedChange={(checked) =>
                    handleLockChange(checked === true)
                  }
                  disabled={savingMode}
                />
                <Label htmlFor="site-mode-lock" className="text-sm font-medium">
                  Lock site mode (only superadmin can change mode when locked)
                </Label>
              </div>
              {siteModeLocked && (
                <div>
                  <Label htmlFor="lock-reason" className="text-xs text-muted-foreground">
                    Optional reason (for your records)
                  </Label>
                  <Input
                    id="lock-reason"
                    value={siteModeLockedReason}
                    onChange={(e) => setSiteModeLockedReason(e.target.value)}
                    onBlur={() =>
                      siteModeLocked && handleLockChange(true)
                    }
                    placeholder="e.g. Pre-launch lockdown"
                    className="mt-1 max-w-md"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Site identity and domain. Set by superadmin in Site Settings; shown here for reference. Use the copy icon to copy a value.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Site Name</label>
            <div className="flex gap-2 items-center">
              <Input
                value={name}
                readOnly
                placeholder="—"
                className="bg-muted flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => copyToClipboard(name, "name")}
                disabled={!name?.trim()}
                title="Copy"
              >
                {copiedField === "name" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Site Description</label>
            <div className="flex gap-2 items-center">
              <Input
                value={description}
                readOnly
                placeholder="—"
                className="bg-muted flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => copyToClipboard(description, "description")}
                disabled={!description?.trim()}
                title="Copy"
              >
                {copiedField === "description" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Site URL</label>
            <div className="flex gap-2 items-center">
              <Input
                value={url}
                readOnly
                placeholder="—"
                className="bg-muted flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => copyToClipboard(url, "url")}
                disabled={!url?.trim()}
                title="Copy"
              >
                {copiedField === "url" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Site domain (set in Superadmin → Site Settings). Used for API base URL, gallery links, and canonical URLs.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <CardTitle>PWA / Status App Install</CardTitle>
          </div>
          <CardDescription>
            Customize the app name, colors, and icon shown when users add the app to their home screen. Icon can be a media ID from the Media library or a full image URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pwa-name">PWA App name</Label>
              <Input
                id="pwa-name"
                value={pwaName}
                onChange={(e) => setPwaName(e.target.value)}
                placeholder="Site Status"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pwa-short-name">Short name (home screen)</Label>
              <Input
                id="pwa-short-name"
                value={pwaShortName}
                onChange={(e) => setPwaShortName(e.target.value)}
                placeholder="Status"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pwa-theme">Theme color</Label>
              <div className="flex gap-2 items-center mt-1">
                <input
                  type="color"
                  id="pwa-theme"
                  value={pwaThemeColor}
                  onChange={(e) => setPwaThemeColor(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border bg-muted"
                />
                <Input
                  value={pwaThemeColor}
                  onChange={(e) => setPwaThemeColor(e.target.value)}
                  placeholder="#0f172a"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pwa-bg">Background color</Label>
              <div className="flex gap-2 items-center mt-1">
                <input
                  type="color"
                  id="pwa-bg"
                  value={pwaBackgroundColor}
                  onChange={(e) => setPwaBackgroundColor(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border bg-muted"
                />
                <Input
                  value={pwaBackgroundColor}
                  onChange={(e) => setPwaBackgroundColor(e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="pwa-icon">Icon (media ID or image URL)</Label>
            <Input
              id="pwa-icon"
              value={pwaIconValue}
              onChange={(e) => setPwaIconValue(e.target.value)}
              placeholder="Media ID from Media library or https://..."
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use a media ID from{" "}
              <Link href="/admin/media" className="underline" target="_blank" rel="noopener noreferrer">
                Media library
              </Link>{" "}
              (open an image and copy its ID) or enter a full image URL. Recommended: 512×512 PNG for install icon. Same image is used for the PWA and can serve as favicon.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">PWA / Status URL</label>
            <div className="flex gap-2 items-center">
              <Input
                value={url?.trim() ? `${url.replace(/\/$/, "")}/status` : ""}
                readOnly
                placeholder="—"
                className="bg-muted flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => copyToClipboard(url?.trim() ? `${url.replace(/\/$/, "")}/status` : "", "statusUrl")}
                disabled={!url?.trim()}
                title="Copy URL"
              >
                {copiedField === "statusUrl" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                asChild
                title="Open Status page"
              >
                <a href="/status" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Admin status dashboard and PWA. Open in a new tab or add to home screen for quick access.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePwaSave} disabled={pwaSaving}>
              {pwaSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : pwaSaved ? (
                <>
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Saved
                </>
              ) : (
                "Save PWA settings"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
