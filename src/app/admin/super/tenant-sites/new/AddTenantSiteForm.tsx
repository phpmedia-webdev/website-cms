"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function schemaNameFromSlug(slug: string): string {
  if (!slug) return "";
  const base = slug.replace(/-/g, "_").replace(/[^a-z0-9_]/g, "");
  return base ? `client_${base}` : "";
}

export function AddTenantSiteForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [schemaName, setSchemaName] = useState("");
  const [deploymentUrl, setDeploymentUrl] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [siteMode, setSiteMode] = useState("coming_soon");
  const [notes, setNotes] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    const s = slugFromName(value);
    if (slug === slugFromName(name) || !slug) {
      setSlug(s);
      setSchemaName(schemaNameFromSlug(s));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    if (schemaName === schemaNameFromSlug(slug) || !schemaName) {
      setSchemaName(schemaNameFromSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          schema_name: schemaName.trim(),
          deployment_url: deploymentUrl.trim() || null,
          description: description.trim() || null,
          status,
          site_mode: siteMode,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create tenant site");
      }
      router.push(`/admin/super/tenant-sites/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create tenant site");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Corp"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => setSchemaName(schemaNameFromSlug(slug))}
              placeholder="acme-corp"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schema_name">Schema name *</Label>
            <Input
              id="schema_name"
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              placeholder="client_acme_corp"
              required
            />
            <p className="text-xs text-muted-foreground">
              Must match the Supabase schema for this deployment (e.g. client_xxx).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deployment_url">Deployment URL</Label>
            <Input
              id="deployment_url"
              type="url"
              value={deploymentUrl}
              onChange={(e) => setDeploymentUrl(e.target.value)}
              placeholder="https://acme.example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>

          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Site mode</Label>
              <Select value={siteMode} onValueChange={setSiteMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coming_soon">Coming soon</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create tenant site"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/super/tenant-sites")}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
