"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ProfileData {
  email: string;
  profile: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    title: string | null;
    company: string | null;
    bio: string | null;
    phone: string | null;
    custom_fields: Record<string, string>;
  };
}

export function ProfileSettingsContent() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ProfileData | null) => {
        if (data) {
          setEmail(data.email ?? "");
          const p = data.profile;
          setDisplayName(p.display_name ?? "");
          setAvatarUrl(p.avatar_url ?? "");
          setTitle(p.title ?? "");
          setCompany(p.company ?? "");
          setBio(p.bio ?? "");
          setPhone(p.phone ?? "");
          setCustomFields(
            Object.entries(p.custom_fields ?? {}).map(([key, value]) => ({ key, value }))
          );
          if (Object.keys(p.custom_fields ?? {}).length === 0) {
            setCustomFields([{ key: "", value: "" }]);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const custom_fields: Record<string, string> = {};
      for (const { key, value } of customFields) {
        if (key.trim()) custom_fields[key.trim()] = value;
      }
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName || null,
          avatar_url: avatarUrl || null,
          title: title || null,
          company: company || null,
          bio: bio || null,
          phone: phone || null,
          custom_fields,
        }),
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

  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  };

  const updateCustomField = (index: number, field: "key" | "value", value: string) => {
    setCustomFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Your profile is shared across sites. Edit your display name, contact info, and custom fields.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Core fields and optional custom fields (e.g. LinkedIn URL, Digicard slug).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} readOnly disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
          </div>
          <div>
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input
              id="avatar_url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Job title"
            />
          </div>
          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short bio"
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Custom fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                Add field
              </Button>
            </div>
            <div className="space-y-2">
              {customFields.map((row, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Key (e.g. linkedin_url)"
                    value={row.key}
                    onChange={(e) => updateCustomField(index, "key", e.target.value)}
                    className="flex-1 max-w-[180px]"
                  />
                  <Input
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => updateCustomField(index, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomField(index)}
                    aria-label="Remove field"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
