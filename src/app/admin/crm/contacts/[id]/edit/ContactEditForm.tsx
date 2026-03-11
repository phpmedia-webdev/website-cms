"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CrmContact } from "@/lib/supabase/crm";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DND_OPTIONS = ["none", "email", "phone", "all"] as const;

export function ContactEditForm({
  contact,
  contactStatuses,
}: {
  contact: CrmContact;
  contactStatuses: CrmContactStatusOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: contact.first_name ?? "",
    last_name: contact.last_name ?? "",
    full_name: contact.full_name ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    company: contact.company ?? "",
    address: contact.address ?? "",
    city: contact.city ?? "",
    state: contact.state ?? "",
    postal_code: contact.postal_code ?? "",
    country: contact.country ?? "",
    shipping_address: contact.shipping_address ?? "",
    shipping_city: contact.shipping_city ?? "",
    shipping_state: contact.shipping_state ?? "",
    shipping_postal_code: contact.shipping_postal_code ?? "",
    shipping_country: contact.shipping_country ?? "",
    message: contact.message ?? "",
    status: contact.status ?? (contactStatuses[0]?.slug ?? "new"),
    dnd_status: contact.dnd_status ?? "none",
  });

  useEffect(() => {
    setForm({
      first_name: contact.first_name ?? "",
      last_name: contact.last_name ?? "",
      full_name: contact.full_name ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      company: contact.company ?? "",
      address: contact.address ?? "",
      city: contact.city ?? "",
      state: contact.state ?? "",
      postal_code: contact.postal_code ?? "",
      country: contact.country ?? "",
      shipping_address: contact.shipping_address ?? "",
      shipping_city: contact.shipping_city ?? "",
      shipping_state: contact.shipping_state ?? "",
      shipping_postal_code: contact.shipping_postal_code ?? "",
      shipping_country: contact.shipping_country ?? "",
      message: contact.message ?? "",
      status: contact.status ?? (contactStatuses[0]?.slug ?? "new"),
      dnd_status: contact.dnd_status ?? "none",
    });
  }, [contact, contactStatuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          full_name: form.full_name || null,
          email: form.email || null,
          phone: form.phone || null,
          company: form.company || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          postal_code: form.postal_code || null,
          country: form.country || null,
          shipping_address: form.shipping_address || null,
          shipping_city: form.shipping_city || null,
          shipping_state: form.shipping_state || null,
          shipping_postal_code: form.shipping_postal_code || null,
          shipping_country: form.shipping_country || null,
          message: form.message.trim() ? form.message.trim() : null,
          status: form.status || "new",
          dnd_status: form.dnd_status === "none" ? null : form.dnd_status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update contact");
        return;
      }
      router.push(`/admin/crm/contacts/${contact.id}`);
      router.refresh();
    } catch (err) {
      setError("Failed to update contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          {error && <p className="text-sm text-destructive">{error}</p>}
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
            <Label htmlFor="full_name">Full name</Label>
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
          <p className="text-xs font-medium text-foreground mt-2">Billing address</p>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal code</Label>
              <Input
                id="postal_code"
                value={form.postal_code}
                onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  shipping_address: f.address,
                  shipping_city: f.city,
                  shipping_state: f.state,
                  shipping_postal_code: f.postal_code,
                  shipping_country: f.country,
                }))
              }
            >
              <Copy className="h-3.5 w-3.5" />
              Copy to shipping
            </Button>
          </div>
          <p className="text-xs font-medium text-foreground mt-3">Shipping address (if different)</p>
          <div className="space-y-2">
            <Label htmlFor="shipping_address">Address</Label>
            <Input
              id="shipping_address"
              value={form.shipping_address}
              onChange={(e) => setForm((f) => ({ ...f, shipping_address: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="shipping_city">City</Label>
              <Input
                id="shipping_city"
                value={form.shipping_city}
                onChange={(e) => setForm((f) => ({ ...f, shipping_city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_state">State</Label>
              <Input
                id="shipping_state"
                value={form.shipping_state}
                onChange={(e) => setForm((f) => ({ ...f, shipping_state: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_postal_code">Postal code</Label>
              <Input
                id="shipping_postal_code"
                value={form.shipping_postal_code}
                onChange={(e) => setForm((f) => ({ ...f, shipping_postal_code: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shipping_country">Country</Label>
            <Input
              id="shipping_country"
              value={form.shipping_country}
              onChange={(e) => setForm((f) => ({ ...f, shipping_country: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="message">Message</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-foreground/80"
                onClick={() => setForm((f) => ({ ...f, message: "" }))}
              >
                Clear all
              </Button>
            </div>
            <textarea
              id="message"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Form submission or quick notes…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {contactStatuses.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dnd_status">Do not contact</Label>
              <select
                id="dnd_status"
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.dnd_status}
                onChange={(e) => setForm((f) => ({ ...f, dnd_status: e.target.value }))}
              >
                {DND_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/crm/contacts/${contact.id}`)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
