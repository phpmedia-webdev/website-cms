"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { CrmContact } from "@/lib/supabase/crm";
import type { ContactMethodRow, ContactMethodType } from "@/lib/supabase/contact-methods";
import { CRM_STATUS_SLUG_NEW, type CrmContactStatusOption } from "@/lib/supabase/settings";
import { Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AvatarMediaPicker } from "@/components/profile/AvatarMediaPicker";
import { ImageIcon } from "lucide-react";

const DND_OPTIONS = ["none", "email", "phone", "all"] as const;

function getDefaultContactStatusSlug(contactStatuses: CrmContactStatusOption[]): string {
  return (
    contactStatuses.find((s) => s.slug === CRM_STATUS_SLUG_NEW)?.slug ??
    contactStatuses[0]?.slug ??
    CRM_STATUS_SLUG_NEW
  );
}

export function ContactEditForm({
  contact,
  contactStatuses,
  initialOrganizations = [],
  initialContactMethods = [],
}: {
  contact: CrmContact;
  contactStatuses: CrmContactStatusOption[];
  initialOrganizations?: { id: string; name: string }[];
  initialContactMethods?: ContactMethodRow[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>(initialOrganizations);
  const [orgSearch, setOrgSearch] = useState("");
  const [orgSearchResults, setOrgSearchResults] = useState<{ id: string; name: string }[]>([]);
  const [orgSearchOpen, setOrgSearchOpen] = useState(false);
  const [contactMethods, setContactMethods] = useState<ContactMethodRow[]>(initialContactMethods);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: contact.first_name ?? "",
    last_name: contact.last_name ?? "",
    full_name: contact.full_name ?? "",
    avatar_url: contact.avatar_url ?? "",
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
    status: contact.status ?? getDefaultContactStatusSlug(contactStatuses),
    dnd_status: contact.dnd_status ?? "none",
  });

  useEffect(() => {
    setOrganizations(initialOrganizations);
  }, [initialOrganizations]);

  useEffect(() => {
    setContactMethods(initialContactMethods);
  }, [initialContactMethods]);

  useEffect(() => {
    setForm({
      first_name: contact.first_name ?? "",
      last_name: contact.last_name ?? "",
      full_name: contact.full_name ?? "",
      avatar_url: contact.avatar_url ?? "",
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
      status: contact.status ?? getDefaultContactStatusSlug(contactStatuses),
      dnd_status: contact.dnd_status ?? "none",
    });
  }, [contact, contactStatuses]);

  const searchOrgs = useCallback(async (q: string) => {
    if (!q.trim()) {
      setOrgSearchResults([]);
      return;
    }
    const res = await fetch(`/api/crm/organizations?search=${encodeURIComponent(q.trim())}`);
    const data = await res.json();
    if (res.ok && Array.isArray(data.organizations)) {
      setOrgSearchResults(
        data.organizations.map((o: { id: string; name: string }) => ({ id: o.id, name: o.name }))
      );
    } else {
      setOrgSearchResults([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchOrgs(orgSearch), 200);
    return () => clearTimeout(t);
  }, [orgSearch, searchOrgs]);

  const addOrganization = (org: { id: string; name: string }) => {
    if (organizations.some((o) => o.id === org.id)) return;
    setOrganizations((prev) => [...prev, org]);
    setOrgSearch("");
    setOrgSearchResults([]);
    setOrgSearchOpen(false);
  };

  const removeOrganization = (id: string) => {
    setOrganizations((prev) => prev.filter((o) => o.id !== id));
  };

  const primaryContactMethodValue = useCallback(
    (methodType: ContactMethodType): string | null => {
      const ordered = [...contactMethods]
        .filter((method) => method.method_type === methodType)
        .sort((a, b) => {
          if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.created_at.localeCompare(b.created_at);
        });
      return ordered[0]?.value.trim() || null;
    },
    [contactMethods]
  );

  const hasPrimaryPhone = useMemo(
    () => contactMethods.some((method) => method.method_type === "phone" && method.is_primary),
    [contactMethods]
  );
  const hasPrimaryEmail = useMemo(
    () => contactMethods.some((method) => method.method_type === "email" && method.is_primary),
    [contactMethods]
  );

  const setPrimaryForMethod = useCallback((id: string, checked: boolean) => {
    setContactMethods((prev) => {
      const target = prev.find((method) => method.id === id);
      if (!target) return prev;
      return prev.map((method) => {
        if (method.id === id) {
          return { ...method, is_primary: checked };
        }
        if (checked && method.method_type === target.method_type) {
          return { ...method, is_primary: false };
        }
        return method;
      });
    });
  }, []);

  const updateMethod = useCallback(
    (id: string, key: keyof ContactMethodRow, value: string | boolean) => {
      setContactMethods((prev) =>
        prev.map((method) => {
          if (method.id !== id) return method;
          if (key === "method_type") {
            return { ...method, method_type: value as ContactMethodType };
          }
          return { ...method, [key]: value } as ContactMethodRow;
        })
      );
    },
    []
  );

  const addMethod = useCallback(
    (methodType: ContactMethodType) => {
      setContactMethods((prev) => {
        const hasType = prev.some((method) => method.method_type === methodType);
        const now = new Date().toISOString();
        return [
          ...prev,
          {
            id: `draft-${crypto.randomUUID()}`,
            contact_id: contact.id,
            method_type: methodType,
            label: hasType ? "other" : "main",
            value: "",
            normalized_value: "",
            is_primary: !hasType,
            sort_order: prev.length,
            source: null,
            created_at: now,
            updated_at: now,
          },
        ];
      });
    },
    [contact.id]
  );

  const removeMethod = useCallback((id: string) => {
    setContactMethods((prev) => prev.filter((method) => method.id !== id));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const normalizedMethods = contactMethods
        .map((method, index) => ({
          ...method,
          label: method.label.trim() || "main",
          value: method.value.trim(),
          sort_order: Number.isFinite(method.sort_order) ? method.sort_order : index,
        }))
        .filter((method) => method.value.length > 0);
      const primaryEmail = primaryContactMethodValue("email");
      const primaryPhone = primaryContactMethodValue("phone");
      const res = await fetch(`/api/crm/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          full_name: form.full_name || null,
          avatar_url: form.avatar_url || null,
          email: primaryEmail,
          phone: primaryPhone,
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
          status: form.status || getDefaultContactStatusSlug(contactStatuses),
          dnd_status: form.dnd_status === "none" ? null : form.dnd_status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update contact");
        return;
      }
      const orgRes = await fetch(`/api/crm/contacts/${contact.id}/organizations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_ids: organizations.map((o) => o.id) }),
      });
      if (!orgRes.ok) {
        const orgData = await orgRes.json();
        setError(orgData.error ?? "Failed to update organizations");
        return;
      }
      const methodsRes = await fetch(`/api/crm/contacts/${contact.id}/methods`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methods: normalizedMethods }),
      });
      if (!methodsRes.ok) {
        const methodsData = await methodsRes.json();
        setError(methodsData.error ?? "Failed to update contact methods");
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
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Phone & email methods</h2>
                <p className="text-xs text-muted-foreground">
                  Manage multiple labeled phone numbers and email addresses for this contact.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => addMethod("phone")}>
                  Add phone
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addMethod("email")}>
                  Add email
                </Button>
              </div>
            </div>
            {contactMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contact methods yet.</p>
            ) : (
              <div className="space-y-3">
                {contactMethods.map((method) => (
                  <div key={method.id} className="rounded-md border bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {method.method_type}
                        </Badge>
                        {method.is_primary && <Badge variant="outline">Primary</Badge>}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeMethod(method.id)}>
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`method-type-${method.id}`}>Type</Label>
                        <select
                          id={`method-type-${method.id}`}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={method.method_type}
                          onChange={(e) =>
                            updateMethod(method.id, "method_type", e.target.value as ContactMethodType)
                          }
                        >
                          <option value="phone">Phone</option>
                          <option value="email">Email</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`method-label-${method.id}`}>Label</Label>
                        <Input
                          id={`method-label-${method.id}`}
                          value={method.label}
                          onChange={(e) => updateMethod(method.id, "label", e.target.value)}
                          placeholder="work, mobile, personal, main"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor={`method-value-${method.id}`}>Value</Label>
                        <Input
                          id={`method-value-${method.id}`}
                          value={method.value}
                          onChange={(e) => updateMethod(method.id, "value", e.target.value)}
                          placeholder={method.method_type === "phone" ? "(555) 123-4567" : "name@example.com"}
                        />
                      </div>
                      <div className="flex items-center gap-2 pb-2">
                        <Checkbox
                          id={`method-primary-${method.id}`}
                          checked={method.is_primary}
                          onCheckedChange={(checked) => setPrimaryForMethod(method.id, !!checked)}
                        />
                        <Label htmlFor={`method-primary-${method.id}`} className="cursor-pointer">
                          Primary
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(!hasPrimaryPhone || !hasPrimaryEmail) && (
              <p className="text-xs text-muted-foreground">
                Tip: keep one primary phone and one primary email so the contact record stays in sync.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Organization</Label>
            <p className="text-xs text-muted-foreground">First in list is primary on the contact card.</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {organizations.map((org) => (
                <Badge key={org.id} variant="secondary" className="gap-1 pr-1">
                  <span className="truncate max-w-[120px]">{org.name}</span>
                  <button
                    type="button"
                    onClick={() => removeOrganization(org.id)}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    aria-label={`Remove ${org.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="relative">
              <Input
                placeholder="Search organizations..."
                value={orgSearch}
                onChange={(e) => {
                  setOrgSearch(e.target.value);
                  setOrgSearchOpen(true);
                }}
                onFocus={() => orgSearch.trim() && setOrgSearchOpen(true)}
                onBlur={() => setTimeout(() => setOrgSearchOpen(false), 150)}
              />
              {orgSearchOpen && (orgSearchResults.length > 0 || orgSearch.trim()) && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover py-1 shadow-md">
                  {orgSearchResults.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No organizations found.</p>
                  ) : (
                    orgSearchResults.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addOrganization(org);
                        }}
                      >
                        {org.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
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
