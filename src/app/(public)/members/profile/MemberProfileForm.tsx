"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageIcon } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AvatarMediaPicker } from "@/components/profile/AvatarMediaPicker";

/**
 * Member profile form: display name (username) and avatar URL.
 * Updates Supabase Auth user_metadata so header and CRM show the right info.
 * This is the member's own profile (not the Team/admin profile).
 */
export function MemberProfileForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        setLoading(false);
        return;
      }
      const meta = user.user_metadata as { display_name?: string; avatar_url?: string } | undefined;
      setDisplayName(meta?.display_name ?? "");
      setAvatarUrl(meta?.avatar_url ?? "");
      setEmail(user.email ?? "");
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        },
      });
      if (error) throw error;
      setMessage({ type: "success", text: "Profile updated." });
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Update your display name and avatar. These appear in the header and member areas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-display-name">Display name</Label>
            <Input
              id="member-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-avatar-url">Avatar URL</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="member-avatar-url"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
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
            <p className="text-xs text-muted-foreground">
              Paste a link or choose an image from the media library.
            </p>
          </div>
          {message && (
            <p
              className={
                message.type === "success"
                  ? "text-sm text-green-600 dark:text-green-400"
                  : "text-sm text-destructive"
              }
            >
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
