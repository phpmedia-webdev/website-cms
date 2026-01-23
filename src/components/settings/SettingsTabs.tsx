"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Shield, Settings as SettingsIcon, Type, Palette, Code } from "lucide-react";
import { FontsSettings } from "@/components/settings/FontsSettings";
import { ColorsSettings } from "@/components/settings/ColorsSettings";
import { updateDesignSystemConfig } from "@/lib/supabase/settings";
import type { DesignSystemConfig } from "@/types/design-system";

interface SettingsTabsProps {
  initialConfig: DesignSystemConfig;
}

export function SettingsTabs({ initialConfig }: SettingsTabsProps) {
  const [config, setConfig] = useState<DesignSystemConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const success = await updateDesignSystemConfig(config);

      if (!success) {
        throw new Error("Failed to save settings");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Reload page to apply changes
      window.location.reload();
    } catch (error) {
      console.error("Error saving design system settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tabs defaultValue="fonts" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="fonts" className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          Fonts
        </TabsTrigger>
        <TabsTrigger value="colors" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Colors
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Security
        </TabsTrigger>
        <TabsTrigger value="general" className="flex items-center gap-2">
          <SettingsIcon className="h-4 w-4" />
          General
        </TabsTrigger>
        <TabsTrigger value="api" className="flex items-center gap-2">
          <Code className="h-4 w-4" />
          API
        </TabsTrigger>
      </TabsList>

      <TabsContent value="fonts" className="mt-6">
        <FontsSettings
          config={config}
          onConfigChange={setConfig}
          onSave={handleSave}
          saving={saving}
          saved={saved}
        />
      </TabsContent>

      <TabsContent value="colors" className="mt-6">
        <ColorsSettings
          config={config}
          onConfigChange={setConfig}
          onSave={handleSave}
          saving={saving}
          saved={saved}
        />
      </TabsContent>

      <TabsContent value="security" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Manage your account security and two-factor authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/settings/security">
              <Button variant="outline" className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Manage Two-Factor Authentication
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-2">
              Enroll authenticators, manage enrolled factors, and clean up unverified attempts
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="general" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure general application settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Site Name
              </label>
              <Input placeholder="My Website" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Site URL
              </label>
              <Input placeholder="https://example.com" type="url" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="api" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              API endpoints for your client website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                API Base URL
              </label>
              <Input
                value={typeof window !== "undefined" ? window.location.origin : ""}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use this URL to access the API from your client website
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Available Endpoints</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• GET /api/posts - List published posts</li>
                <li>• GET /api/posts/[id] - Get single post</li>
                <li>• GET /api/galleries - List galleries</li>
                <li>• GET /api/galleries/[id] - Get gallery with items</li>
                <li>• GET /api/media/[id] - Get media details</li>
                <li>• POST /api/forms/[formId]/submit - Submit form</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
