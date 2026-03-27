"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CRM_STATUS_SLUG_NEW,
  findCrmContactStatusOption,
  type CrmContactStatusOption,
} from "@/lib/supabase/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactStatusSelectItems } from "@/components/crm/ContactStatusSelectItems";
import { AvatarMediaPicker } from "@/components/profile/AvatarMediaPicker";
import { ImageIcon } from "lucide-react";

export function NewContactForm({
  contactStatuses,
}: {
  contactStatuses: CrmContactStatusOption[];
}) {
  const router = useRouter();
  const defaultStatus =
    findCrmContactStatusOption(contactStatuses, CRM_STATUS_SLUG_NEW)?.slug ??
    contactStatuses[0]?.slug ??
    CRM_STATUS_SLUG_NEW;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    full_name: "",
    avatar_url: "",
    email: "",
    phone: "",
    company: "",
    status: defaultStatus,
  });
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          full_name: form.full_name || null,
          avatar_url: form.avatar_url || null,
          email: form.email || null,
          phone: form.phone || null,
          company: form.company || null,
          status: form.status || defaultStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create contact");
        return;
      }
      router.push(`/admin/crm/contacts/${data.id}`);
      router.refresh();
    } catch (err) {
      setError("Failed to create contact");
    } finally {
      setLoading(false);
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name (optional)</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger
                id="status"
                className="h-9 w-full border-input bg-transparent shadow-sm focus:ring-1 focus:ring-ring"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <ContactStatusSelectItems contactStatuses={contactStatuses} />
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create contact"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/crm/contacts")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
