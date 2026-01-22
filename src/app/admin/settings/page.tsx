import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Shield, Settings as SettingsIcon } from "lucide-react";
import { DesignSystemSettings } from "@/components/settings/DesignSystemSettings";
import { getDesignSystemConfig } from "@/lib/supabase/settings";

export default async function SettingsPage() {
  // Load current design system config
  const designSystemConfig = await getDesignSystemConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your CMS settings and preferences
        </p>
      </div>

      {/* Design System Settings */}
      <DesignSystemSettings initialConfig={designSystemConfig} />

      {/* Security Settings Card */}
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
              value={process.env.NEXT_PUBLIC_APP_URL || ""}
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
    </div>
  );
}
