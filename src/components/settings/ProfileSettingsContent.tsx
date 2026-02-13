"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, KeyRound, ImageIcon } from "lucide-react";
import MFAManagement from "@/components/auth/MFAManagement";
import { AvatarMediaPicker } from "@/components/profile/AvatarMediaPicker";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  validatePassword,
  normalizePassword,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";

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

interface ProfileSettingsContentProps {
  /** When true, Security section (2FA/OTP) is hidden; superadmin uses Superadmin → Security. */
  isSuperadmin?: boolean;
  /** User has access to CRM/contacts/data; show 2FA recommendation when no factors enrolled. */
  hasCrmAccess?: boolean;
  /** User has at least one enrolled TOTP factor. */
  hasEnrolledFactors?: boolean;
}

export function ProfileSettingsContent({
  isSuperadmin = false,
  hasCrmAccess = false,
  hasEnrolledFactors = false,
}: ProfileSettingsContentProps) {
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

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [dismiss2FABanner, setDismiss2FABanner] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    const result = validatePassword(newPassword);
    if (!result.valid) {
      setPasswordError(result.error ?? "Invalid password.");
      return;
    }
    setPasswordSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: currentPassword,
      });
      if (signInError) {
        setPasswordError("Current password is incorrect.");
        setPasswordSaving(false);
        return;
      }
      const normalizedNew = normalizePassword(newPassword);
      const { error: updateError } = await supabase.auth.updateUser({ password: normalizedNew });
      if (updateError) {
        setPasswordError(updateError.message ?? "Failed to update password.");
        setPasswordSaving(false);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
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
            <div className="flex gap-2 items-center">
              <Input
                id="avatar_url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                type="url"
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
                Choose from Media Library
              </Button>
            </div>
            <AvatarMediaPicker
              open={avatarPickerOpen}
              onOpenChange={setAvatarPickerOpen}
              onSelect={(url) => setAvatarUrl(url)}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change password
          </CardTitle>
          <CardDescription>
            Update your password. Use at least {PASSWORD_MIN_LENGTH} characters; avoid common or easily guessed passwords.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="current_password">Current password</Label>
              <Input
                id="current_password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!isSuperadmin && (
        <>
          {hasCrmAccess && !hasEnrolledFactors && !dismiss2FABanner && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <Shield className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Because you have access to contact data, we recommend enabling two-factor authentication.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  You can add an authenticator app in the Security section below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDismiss2FABanner(true)}
                className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 text-sm"
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>
                Two-factor authentication (authenticator app) adds an extra sign-in step. Optional for you; recommended if you have access to contact data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MFAManagement allowRemoveLastFactor={true} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
