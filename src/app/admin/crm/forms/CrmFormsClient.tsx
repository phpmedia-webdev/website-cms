"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrmCustomField, Form } from "@/lib/supabase/crm";
import { Plus, Pencil, Trash2, ListTree, ClipboardList } from "lucide-react";

const CUSTOM_FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "tel", label: "Phone" },
  { value: "checkbox", label: "Checkbox" },
  { value: "textarea", label: "Text area" },
  { value: "select", label: "Select (single)" },
  { value: "multiselect", label: "Select (multiple)" },
];

interface CrmFormsClientProps {
  initialCustomFields: CrmCustomField[];
  initialForms: Form[];
}

export function CrmFormsClient({
  initialCustomFields,
  initialForms,
}: CrmFormsClientProps) {
  const router = useRouter();
  const [customFields, setCustomFields] = useState(initialCustomFields);
  const [forms, setForms] = useState(initialForms);

  // Custom field modal
  const [cfModalOpen, setCfModalOpen] = useState(false);
  const [cfEditing, setCfEditing] = useState<CrmCustomField | null>(null);
  const [cfForm, setCfForm] = useState({ name: "", label: "", type: "text", options: "" });
  const [cfSaving, setCfSaving] = useState(false);
  const [cfError, setCfError] = useState<string | null>(null);

  // Form modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formEditing, setFormEditing] = useState<Form | null>(null);
  const [formForm, setFormForm] = useState({ name: "", slug: "" });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCfAdd = () => {
    setCfEditing(null);
    setCfForm({ name: "", label: "", type: "text", options: "" });
    setCfError(null);
    setCfModalOpen(true);
  };

  const openCfEdit = (field: CrmCustomField) => {
    setCfEditing(field);
    const options = (field.validation_rules?.options as string[] | undefined) || [];
    setCfForm({
      name: field.name,
      label: field.label,
      type: field.type,
      options: options.join("\n"),
    });
    setCfError(null);
    setCfModalOpen(true);
  };

  const saveCustomField = async () => {
    if (!cfForm.name.trim() || !cfForm.label.trim()) {
      setCfError("Name and label are required");
      return;
    }
    const needsOptions = cfForm.type === "select" || cfForm.type === "multiselect";
    if (needsOptions && !cfForm.options.trim()) {
      setCfError("Options are required for select/multiselect fields");
      return;
    }
    setCfSaving(true);
    setCfError(null);
    try {
      const options = needsOptions
        ? cfForm.options
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;
      const validationRules = options ? { options } : {};
      const payload = {
        name: cfForm.name.trim(),
        label: cfForm.label.trim(),
        type: cfForm.type,
        validation_rules: validationRules,
      };
      if (cfEditing) {
        const res = await fetch(`/api/crm/custom-fields/${cfEditing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setCfError(data.error ?? "Failed to update");
          return;
        }
        setCustomFields((prev) =>
          prev.map((f) => (f.id === cfEditing.id ? (data as CrmCustomField) : f))
        );
      } else {
        const res = await fetch("/api/crm/custom-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setCfError(data.error ?? "Failed to create");
          return;
        }
        setCustomFields((prev) => [...prev, data as CrmCustomField]);
      }
      setCfModalOpen(false);
      router.refresh();
    } catch {
      setCfError("Request failed");
    } finally {
      setCfSaving(false);
    }
  };

  const deleteCustomField = async (id: string) => {
    if (!confirm("Delete this custom field? Contact values for this field will be removed.")) return;
    try {
      const res = await fetch(`/api/crm/custom-fields/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to delete");
        return;
      }
      setCustomFields((prev) => prev.filter((f) => f.id !== id));
      router.refresh();
    } catch {
      alert("Request failed");
    }
  };

  const openFormAdd = () => {
    setFormEditing(null);
    setFormForm({ name: "", slug: "" });
    setFormError(null);
    setFormModalOpen(true);
  };

  const openFormEdit = (form: Form) => {
    setFormEditing(form);
    setFormForm({ name: form.name, slug: form.slug });
    setFormError(null);
    setFormModalOpen(true);
  };

  const slugFromName = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const saveForm = async () => {
    if (!formForm.name.trim() || !formForm.slug.trim()) {
      setFormError("Name and slug are required");
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      if (formEditing) {
        const res = await fetch(`/api/crm/forms/${formEditing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formForm.name.trim(),
            slug: formForm.slug.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error ?? "Failed to update");
          return;
        }
        setForms((prev) =>
          prev.map((f) => (f.id === formEditing.id ? (data as Form) : f))
        );
      } else {
        const res = await fetch("/api/crm/forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formForm.name.trim(),
            slug: formForm.slug.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error ?? "Failed to create");
          return;
        }
        setForms((prev) => [...prev, data as Form]);
      }
      setFormModalOpen(false);
      router.refresh();
    } catch {
      setFormError("Request failed");
    } finally {
      setFormSaving(false);
    }
  };

  const deleteForm = async (id: string) => {
    if (!confirm("Delete this form? Contacts linked to it will have form cleared.")) return;
    try {
      const res = await fetch(`/api/crm/forms/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to delete");
        return;
      }
      setForms((prev) => prev.filter((f) => f.id !== id));
      router.refresh();
    } catch {
      alert("Request failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Forms &amp; Fields</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define custom fields for contacts, then register forms that map submissions to CRM.
        </p>
      </div>

      <Tabs defaultValue="fields" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="fields" className="flex items-center gap-2">
            <ListTree className="h-4 w-4" />
            Custom Fields
          </TabsTrigger>
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Forms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCfAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add field
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {customFields.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No custom fields. Add one to show extra fields on contact records.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left font-medium p-3">Name</th>
                        <th className="text-left font-medium p-3">Label</th>
                        <th className="text-left font-medium p-3">Type</th>
                        <th className="text-right font-medium p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customFields.map((f) => (
                        <tr key={f.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{f.name}</td>
                          <td className="p-3">{f.label}</td>
                          <td className="p-3 text-muted-foreground">{f.type}</td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openCfEdit(f)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteCustomField(f.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openFormAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add form
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {forms.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No forms. Add form definitions for developer reference and submission mapping.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left font-medium p-3">Name</th>
                        <th className="text-left font-medium p-3">Slug</th>
                        <th className="text-left font-medium p-3">Created</th>
                        <th className="text-right font-medium p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forms.map((f) => (
                        <tr key={f.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{f.name}</td>
                          <td className="p-3 font-mono text-xs text-muted-foreground">{f.slug}</td>
                          <td className="p-3 text-muted-foreground">
                            {f.created_at
                              ? new Date(f.created_at).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openFormEdit(f)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteForm(f.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </TabsContent>
      </Tabs>

      {/* Custom field modal */}
      <Dialog open={cfModalOpen} onOpenChange={setCfModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cfEditing ? "Edit custom field" : "Add custom field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {cfError && (
              <p className="text-sm text-destructive">{cfError}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="cf-name">Name (API key)</Label>
              <Input
                id="cf-name"
                value={cfForm.name}
                onChange={(e) =>
                  setCfForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="e.g. lead_score"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-label">Label</Label>
              <Input
                id="cf-label"
                value={cfForm.label}
                onChange={(e) =>
                  setCfForm((prev) => ({
                    ...prev,
                    label: e.target.value,
                  }))
                }
                placeholder="e.g. Lead Score"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-type">Type</Label>
              <Select
                value={cfForm.type}
                onValueChange={(v) => setCfForm((prev) => ({ ...prev, type: v }))}
              >
                <SelectTrigger id="cf-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(cfForm.type === "select" || cfForm.type === "multiselect") && (
              <div className="space-y-2">
                <Label htmlFor="cf-options">
                  Options (one per line)
                </Label>
                <textarea
                  id="cf-options"
                  value={cfForm.options}
                  onChange={(e) =>
                    setCfForm((prev) => ({ ...prev, options: e.target.value }))
                  }
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Enter each option on a separate line. These will be shown as {cfForm.type === "select" ? "a dropdown" : "checkboxes"} on contact forms.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCfModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCustomField} disabled={cfSaving}>
              {cfSaving ? "Saving…" : cfEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form modal */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formEditing ? "Edit form" : "Add form"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="form-name">Name</Label>
              <Input
                id="form-name"
                value={formForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormForm((prev) => ({
                    ...prev,
                    name,
                    slug: formEditing ? prev.slug : slugFromName(name) || prev.slug,
                  }));
                }}
                placeholder="e.g. Contact Us"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-slug">Slug</Label>
              <Input
                id="form-slug"
                value={formForm.slug}
                onChange={(e) =>
                  setFormForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="e.g. contact-us"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveForm} disabled={formSaving}>
              {formSaving ? "Saving…" : formEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
