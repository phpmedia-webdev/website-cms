"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TenantSite } from "@/types/tenant-sites";
import { Settings, Shield, Code, Mail } from "lucide-react";
import { TenantSiteModeCard } from "@/components/superadmin/TenantSiteModeCard";
import {
  TenantFeaturesManager,
  type TenantFeatureItem,
} from "@/components/superadmin/TenantFeaturesManager";
import { SmtpConfigForm } from "@/components/settings/SmtpConfigForm";

const ENDPOINTS = [
  "GET /api/posts - List published posts",
  "GET /api/posts/[id] - Get single post",
  "GET /api/galleries - List galleries",
  "GET /api/galleries/[id] - Get gallery with items",
  "GET /api/media/[id] - Get media details",
  "POST /api/forms/[formId]/submit - Submit form",
];

interface SiteSettingsTabsClientProps {
  site: TenantSite;
  initialMetadata: { name?: string; description?: string; url?: string };
  featuresForGating: TenantFeatureItem[];
  initialEnabledSlugs: string[];
}

export function SiteSettingsTabsClient({
  site,
  initialMetadata,
  featuresForGating,
  initialEnabledSlugs,
}: SiteSettingsTabsClientProps) {
  const [name, setName] = useState(initialMetadata.name ?? site.name ?? "");
  const [description, setDescription] = useState(
    initialMetadata.description ?? site.description ?? ""
  );
  const [url, setUrl] = useState(
    initialMetadata.url ?? site.deployment_url ?? ""
  );
  const [saving, setSaving] = useState(false);

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          deployment_url: url.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
    } catch (err) {
      console.error("Save general:", err);
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const baseUrl = site.deployment_url?.trim() || "";

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-md">
        <TabsTrigger value="general" className="gap-1.5">
          <Settings className="h-4 w-4" />
          General
        </TabsTrigger>
        <TabsTrigger value="gating" className="gap-1.5">
          <Shield className="h-4 w-4" />
          Gating
        </TabsTrigger>
        <TabsTrigger value="api" className="gap-1.5">
          <Code className="h-4 w-4" />
          API
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-4 space-y-4">
        <TenantSiteModeCard
          siteId={site.id}
          initialMode={site.site_mode}
          initialLocked={site.site_mode_locked}
          initialLockReason={site.site_mode_locked_reason}
          initialComingSoonMessage={site.coming_soon_message}
          initialComingSoonSnippetId={site.coming_soon_snippet_id}
          compact
        />
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg">General Settings</CardTitle>
            <CardDescription className="mt-0.5">
              Site identity and domain. These values are synced with the tenant site and shown in Admin Settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Site Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Website"
                className="h-9"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Site Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your site"
                className="h-9"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Site URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                type="url"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                The site domain. Used for API base URL, standalone gallery links, and canonical URLs.
              </p>
            </div>
            <Button onClick={handleSaveGeneral} disabled={saving} size="sm">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Email / SMTP</CardTitle>
            </div>
            <CardDescription className="mt-0.5">
              Set up SMTP for this site so the app can send email notifications. You can configure this here initially; the tenant admin can change it later from Admin → Settings → Notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <SmtpConfigForm idPrefix="super-smtp" saveLabel="Save SMTP settings" />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="gating" className="mt-6">
        <TenantFeaturesManager
          tenantId={site.id}
          features={featuresForGating}
          initialEnabledSlugs={initialEnabledSlugs}
        />
      </TabsContent>

      <TabsContent value="api" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              API base URL and endpoints for this tenant site. Use when integrating from a client or external app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">API Base URL</label>
              <Input
                value={baseUrl || "Set Site URL in General tab to see base URL"}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use this URL to access the API from the client website or external integrations.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Available Endpoints</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {ENDPOINTS.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
