"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Phone, Building2, Users, Trash2 } from "lucide-react";
import type { OrganizationRow } from "@/lib/supabase/organizations";

interface OrgDetailClientProps {
  org: OrganizationRow;
  contacts: { id: string; full_name: string | null; email: string | null }[];
  displayName: string;
}

export function OrganizationDetailClient({
  org,
  contacts: initialContacts,
  displayName,
}: OrgDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: org.name,
    email: org.email ?? "",
    phone: org.phone ?? "",
    type: org.type ?? "",
    industry: org.industry ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState(initialContacts);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/organizations/${org.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          type: form.type.trim() || null,
          industry: form.industry.trim() || null,
        }),
      });
      if (res.ok) {
        setEditing(false);
        const data = await res.json();
        setForm({
          name: data.name,
          email: data.email ?? "",
          phone: data.phone ?? "",
          type: data.type ?? "",
          industry: data.industry ?? "",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/crm/organizations/${org.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/crm/organizations");
        router.refresh();
      }
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-row items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
              ) : (
                <h1 className="text-xl font-bold truncate">{displayName}</h1>
              )}
            </div>
            <div className="shrink-0">
              {editing ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>

          {editing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-email">Email</Label>
                <Input
                  id="org-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-phone">Phone</Label>
                <Input
                  id="org-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-type">Type</Label>
                <Input
                  id="org-type"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-industry">Industry</Label>
                <Input
                  id="org-industry"
                  value={form.industry}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {org.email ? (
                    <a href={`mailto:${org.email}`} className="text-primary hover:underline">
                      {org.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{org.phone ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{org.type ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Industry:</span>
                  <span>{org.industry ?? "—"}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Users className="h-4 w-4" />
            Related contacts
          </h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No contacts linked to this organization.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-9 px-4 text-left font-medium">Name</th>
                    <th className="h-9 px-4 text-left font-medium">Email</th>
                    <th className="h-9 w-20 px-4 text-left font-medium">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{c.full_name ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">
                        {c.email ? (
                          <a href={`mailto:${c.email}`} className="text-primary hover:underline text-xs">
                            {c.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                          <Link href={`/admin/crm/contacts/${c.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete organization</DialogTitle>
            <DialogDescription>
              Delete “{displayName}”? This will remove the organization from all linked contacts. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
