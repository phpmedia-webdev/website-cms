"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarMediaPicker } from "@/components/profile/AvatarMediaPicker";
import { ImageIcon } from "lucide-react";

export function NewOrganizationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
    company_domain: "",
    type: "",
    industry: "",
  });
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Organization name is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/crm/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
          company_domain: form.company_domain.trim() || null,
          type: form.type.trim() || null,
          industry: form.industry.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create organization");
        return;
      }
      router.push(`/admin/crm/organizations/${data.id}`);
      router.refresh();
    } catch {
      setError("Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="text-xl font-semibold mb-4">New organization</h1>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="avatar_url"
                type="url"
                value={form.avatar_url}
                onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
                placeholder="https://..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAvatarPickerOpen(true)}
                className="shrink-0"
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                Media Library
              </Button>
            </div>
            <AvatarMediaPicker
              open={avatarPickerOpen}
              onOpenChange={setAvatarPickerOpen}
              onSelect={(url) => setForm((f) => ({ ...f, avatar_url: url }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Organization name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Acme Inc."
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Company email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Company phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_domain">Company domain</Label>
            <Input
              id="company_domain"
              value={form.company_domain}
              onChange={(e) => setForm((f) => ({ ...f, company_domain: e.target.value }))}
              placeholder="example.com"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                placeholder="e.g. Client, Partner"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                placeholder="e.g. Technology, Healthcare"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create organization"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
