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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ExternalLink, Smartphone, Loader2, ChevronUp, ChevronDown, Share2, Plus, Trash2, FileText } from "lucide-react";
import type { SocialLinkItem } from "@/lib/share-to-social/settings";
import { SOCIAL_LINK_ICONS } from "@/lib/share-to-social/settings";

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

  const [shareLinks, setShareLinks] = useState<SocialLinkItem[]>([]);
  const [shareDisplayStyle, setShareDisplayStyle] = useState<"horizontal" | "vertical">("horizontal");
  const [shareShowLabels, setShareShowLabels] = useState(true);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareSaved, setShareSaved] = useState(false);

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
      fetch("/api/settings/share-to-social").then((res) => (res.ok ? res.json() : null)),
    ]).then(([meta, mode, snippets, pwa, share]) => {
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
      if (share && typeof share === "object" && Array.isArray(share.links)) {
        setShareLinks(share.links);
        setShareDisplayStyle(share.displayStyle === "vertical" ? "vertical" : "horizontal");
        setShareShowLabels(typeof share.showLabels === "boolean" ? share.showLabels : true);
      } else {
        setShareLinks([]);
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

  const moveShareLink = (index: number, direction: "up" | "down") => {
    const next = [...shareLinks];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setShareLinks(next);
  };

  const updateShareLink = (index: number, field: keyof SocialLinkItem, value: string) => {
    setShareLinks((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addShareLink = () => {
    setShareLinks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? `link-${Date.now()}`,
        name: "",
        icon: "link" as const,
        url: "",
      },
    ]);
  };

  const removeShareLink = (index: number) => {
    setShareLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleShareSave = async () => {
    setShareSaving(true);
    setShareSaved(false);
    try {
      const res = await fetch("/api/settings/share-to-social", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          links: shareLinks,
          displayStyle: shareDisplayStyle,
          showLabels: shareShowLabels,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setShareSaved(true);
      setTimeout(() => setShareSaved(false), 2000);
    } catch (err) {
      console.error("Share settings save error:", err);
      alert(err instanceof Error ? err.message : "Failed to save share settings");
    } finally {
      setShareSaving(false);
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

      <Tabs defaultValue="site" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="pwa">PWA</TabsTrigger>
          <TabsTrigger value="share">Social Share</TabsTrigger>
          <TabsTrigger value="terms">Terms and Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="site" className="space-y-6 mt-6">
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
          <div>
            <label className="text-sm font-medium mb-2 block">RSS feed URL</label>
            <div className="flex gap-2 items-center">
              <Input
                value={url?.trim() ? `${url.replace(/\/$/, "")}/blog/feed.xml` : ""}
                readOnly
                placeholder="—"
                className="bg-muted flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => copyToClipboard(url?.trim() ? `${url.replace(/\/$/, "")}/blog/feed.xml` : "", "rssUrl")}
                disabled={!url?.trim()}
                title="Copy URL"
              >
                {copiedField === "rssUrl" ? (
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
                title="Open RSS feed"
              >
                <a href="/blog/feed.xml" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              RSS 2.0 feed for published blog posts. Use in readers or for syndication.
            </p>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="pwa" className="mt-6">
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
        </TabsContent>

        <TabsContent value="share" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Share to social</CardTitle>
              </div>
              <CardDescription>
                Build a list of social or other links (name, icon, URL). Use the arrows to reorder. Stored as a simple JSON blob in tenant settings. Placement on the page is controlled by the developer in the theme.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Links (order and details)</Label>
                {shareLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 border rounded-md bg-muted/30 px-3">
                    No links yet. Add one below.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {shareLinks.map((link, index) => (
                      <li
                        key={link.id ?? index}
                        className="border rounded-md p-3 bg-muted/30 space-y-3"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col gap-0 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveShareLink(index, "up")}
                              disabled={index === 0}
                              title="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveShareLink(index, "down")}
                              disabled={index === shareLinks.length - 1}
                              title="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex-1 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] items-end">
                            <div>
                              <Label className="text-xs text-muted-foreground">Name</Label>
                              <Input
                                value={link.name}
                                onChange={(e) => updateShareLink(index, "name", e.target.value)}
                                placeholder="e.g. Facebook"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Icon</Label>
                              <Select
                                value={link.icon}
                                onValueChange={(v) => updateShareLink(index, "icon", v)}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SOCIAL_LINK_ICONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">URL</Label>
                              <Input
                                value={link.url}
                                onChange={(e) => updateShareLink(index, "url", e.target.value)}
                                placeholder="https://..."
                                className="mt-1 font-mono text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => link.url?.trim() && window.open(link.url.trim(), "_blank", "noopener,noreferrer")}
                                disabled={!link.url?.trim()}
                                title="Open link in new tab"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-destructive hover:text-destructive"
                                onClick={() => removeShareLink(index)}
                                title="Remove link"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={addShareLink}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add link
                </Button>
              </div>
              <div>
                <Label htmlFor="share-display-style" className="text-sm font-medium mb-2 block">Display style</Label>
                <Select
                  value={shareDisplayStyle}
                  onValueChange={(v) => setShareDisplayStyle(v as "horizontal" | "vertical")}
                >
                  <SelectTrigger id="share-display-style" className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                    <SelectItem value="vertical">Vertical</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Suggestion for theme: horizontal = row of buttons; vertical = stacked (e.g. sidebars).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="share-show-labels"
                  checked={shareShowLabels}
                  onCheckedChange={(v) => setShareShowLabels(!!v)}
                />
                <Label htmlFor="share-show-labels" className="font-normal cursor-pointer">
                  Show labels next to icons
                </Label>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={handleShareSave} disabled={shareSaving}>
                  {shareSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : shareSaved ? (
                    <>
                      <Check className="h-4 w-4 text-green-600 mr-2" />
                      Saved
                    </>
                  ) : (
                    "Save share settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Terms and Policies</CardTitle>
              </div>
              <CardDescription>
                This section is customizable per client. Embed your terms of service and policy content here and link to your provider so customers can log in and manage. For now, use the preview below and the link to open your terms management site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-dashed bg-muted/30 p-6 min-h-[200px]">
                <p className="text-sm font-medium text-muted-foreground mb-2">Preview</p>
                <p className="text-sm text-muted-foreground">
                  Your terms of service and policy content will appear here. This area will show embedded policies and a login option so visitors can access the external site to manage their preferences.
                </p>
              </div>
              <div>
                <Button asChild variant="default">
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage your Site Terms
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Opens your terms and policies management site in a new tab. Configure the URL in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
