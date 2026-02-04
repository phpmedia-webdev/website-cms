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

export function GeneralSettingsContent() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteMode, setSiteMode] = useState<"live" | "coming_soon">("live");
  const [siteModeLocked, setSiteModeLocked] = useState(false);
  const [siteModeLockedReason, setSiteModeLockedReason] = useState("");
  const [comingSoonSnippetId, setComingSoonSnippetId] = useState<string | null>(null);
  const [snippetOptions, setSnippetOptions] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/site-metadata").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/settings/site-mode").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/settings/snippets").then((res) => (res.ok ? res.json() : [])),
    ]).then(([meta, mode, snippets]) => {
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
      fetch("/api/admin/me/context")
        .then((r) => (r.ok ? r.json() : null))
        .then((ctx) => setIsSuperadmin(!!ctx?.isSuperadmin))
        .catch(() => {});
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/site-metadata", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, url }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to save");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

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
            Configure general application settings including site identity and domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Site Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Website"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Site Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your site"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Site URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              type="url"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The true site domain. Used for standalone gallery links, sharing, and canonical URLs.
              Leave blank to use the deployment URL.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
