"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import type { TenantSite } from "@/types/tenant-sites";
import { Code } from "lucide-react";

const ENDPOINTS = [
  "GET /api/posts - List published posts",
  "GET /api/posts/[id] - Get single post",
  "GET /api/galleries - List galleries",
  "GET /api/galleries/[id] - Get gallery with items",
  "GET /api/media/[id] - Get media details",
  "POST /api/forms/[formId]/submit - Submit form",
];

export function TenantSiteSettingsClient({ site }: { site: TenantSite }) {
  const baseUrl = site.deployment_url?.trim() || "";

  return (
    <Tabs defaultValue="api" className="w-full">
      <TabsList>
        <TabsTrigger value="api" className="gap-1.5">
          <Code className="h-4 w-4" />
          API
        </TabsTrigger>
      </TabsList>
      <TabsContent value="api" className="mt-4">
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
                value={baseUrl || "Set deployment URL on the tenant site to see base URL"}
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
