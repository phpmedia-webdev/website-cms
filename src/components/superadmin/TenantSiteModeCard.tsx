"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface TenantSiteModeCardProps {
  siteId: string;
  initialMode?: string;
  initialLocked?: boolean;
  initialLockReason?: string | null;
  initialComingSoonMessage?: string | null;
  initialComingSoonSnippetId?: string | null;
}

export function TenantSiteModeCard({
  siteId,
  initialMode = "live",
  initialLocked = false,
  initialLockReason = "",
  initialComingSoonMessage = "",
  initialComingSoonSnippetId = null,
}: TenantSiteModeCardProps) {
  const [mode, setMode] = useState<"live" | "coming_soon">(
    initialMode === "coming_soon" ? "coming_soon" : "live"
  );
  const [locked, setLocked] = useState(!!initialLocked);
  const [lockReason, setLockReason] = useState(initialLockReason ?? "");
  const [comingSoonSnippetId, setComingSoonSnippetId] = useState<string | null>(
    initialComingSoonSnippetId ?? null
  );
  const [snippetOptions, setSnippetOptions] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMode(initialMode === "coming_soon" ? "coming_soon" : "live");
    setLocked(!!initialLocked);
    setLockReason(initialLockReason ?? "");
    setComingSoonSnippetId(initialComingSoonSnippetId ?? null);
  }, [siteId, initialMode, initialLocked, initialLockReason, initialComingSoonSnippetId]);

  const fetchMode = async () => {
    setLoading(true);
    try {
      const [modeRes, snippetsRes] = await Promise.all([
        fetch(`/api/admin/tenant-sites/${siteId}/site-mode`),
        fetch(`/api/admin/tenant-sites/${siteId}/snippets`),
      ]);
      if (modeRes.ok) {
        const data = await modeRes.json();
        setMode(data.mode === "coming_soon" ? "coming_soon" : "live");
        setLocked(!!data.site_mode_locked);
        setLockReason(data.site_mode_locked_reason ?? "");
        setComingSoonSnippetId(data.coming_soon_snippet_id ?? null);
      }
      if (snippetsRes.ok) {
        const snippets = await snippetsRes.json();
        setSnippetOptions(Array.isArray(snippets) ? snippets : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMode();
  }, [siteId]);

  const handleModeChange = async (newMode: "live" | "coming_soon") => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenant-sites/${siteId}/site-mode`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: newMode,
          coming_soon_snippet_id: comingSoonSnippetId?.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to update site mode");
      }
      const data = await res.json();
      setMode(data.mode === "coming_soon" ? "coming_soon" : "live");
      if (data.coming_soon_snippet_id !== undefined) setComingSoonSnippetId(data.coming_soon_snippet_id ?? null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update site mode");
    } finally {
      setSaving(false);
    }
  };

  const handleLockChange = async (newLocked: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenant-sites/${siteId}/site-mode`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_mode_locked: newLocked,
          site_mode_locked_reason: newLocked ? lockReason : null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to update lock");
      }
      const data = await res.json();
      setLocked(!!data.site_mode_locked);
      setLockReason(data.site_mode_locked_reason ?? "");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update lock");
    } finally {
      setSaving(false);
    }
  };

  const handleComingSoonSnippetChange = async (value: string) => {
    const id = value === "__none__" ? null : value;
    const prev = comingSoonSnippetId;
    setComingSoonSnippetId(id);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenant-sites/${siteId}/site-mode`, {
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
      alert(err instanceof Error ? err.message : "Failed to save snippet");
      setComingSoonSnippetId(prev);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Site mode</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Mode</CardTitle>
        <CardDescription>
          When Coming soon, the public site shows only the Coming soon page. Admin and API stay accessible. Lock prevents tenant admins from changing mode in Settings → General.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Coming soon</span>
            <Switch
              checked={mode === "live"}
              onCheckedChange={(checked) =>
                handleModeChange(checked ? "live" : "coming_soon")
              }
              disabled={saving}
            />
            <span className="text-sm font-medium text-muted-foreground">Live</span>
          </div>
        </div>
        <div>
          <Label htmlFor={`coming-soon-snippet-${siteId}`} className="text-sm font-medium">
            Coming soon message
          </Label>
          <Select
            value={comingSoonSnippetId ?? "__none__"}
            onValueChange={handleComingSoonSnippetChange}
            disabled={saving}
          >
            <SelectTrigger id={`coming-soon-snippet-${siteId}`} className="mt-1 max-w-md">
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
            Snippets from this tenant&apos;s Content library (type: Snippet). Shown on the Coming soon page with formatting, links, images, galleries.
          </p>
        </div>
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`site-mode-lock-${siteId}`}
              checked={locked}
              onCheckedChange={(checked) => handleLockChange(checked === true)}
              disabled={saving}
            />
            <Label
              htmlFor={`site-mode-lock-${siteId}`}
              className="text-sm font-medium"
            >
              Lock site mode (only superadmin can change mode when locked)
            </Label>
          </div>
          {locked && (
            <div>
              <Label
                htmlFor={`lock-reason-${siteId}`}
                className="text-xs text-muted-foreground"
              >
                Optional reason
              </Label>
              <Input
                id={`lock-reason-${siteId}`}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                onBlur={() => locked && handleLockChange(true)}
                placeholder="e.g. Pre-launch lockdown"
                className="mt-1 max-w-md"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
