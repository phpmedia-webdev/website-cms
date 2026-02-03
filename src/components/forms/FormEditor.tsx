"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/types/content";
import { Save, Plus, Trash2, GripVertical } from "lucide-react";
import { useSlug } from "@/hooks/useSlug";

interface FormEditorProps {
  form?: any;
}

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
];

export function FormEditor({ form }: FormEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(form?.name || "");
  const [slug, setSlug, slugFromTitle] = useSlug(form?.slug || "");
  const [fields, setFields] = useState<FormField[]>(
    (form?.fields as FormField[]) || []
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (name && !slug) {
      slugFromTitle(name);
    }
  }, [name, slug, slugFromTitle]);

  const addField = () => {
    setFields([
      ...fields,
      {
        id: Math.random().toString(36).substring(7),
        type: "text",
        label: "",
        name: "",
        required: false,
      },
    ]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(
      fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleSave = async () => {
    if (!name || !slug) {
      alert("Name and slug are required");
      return;
    }

    if (fields.length === 0) {
      alert("Please add at least one field");
      return;
    }

    // Validate fields
    for (const field of fields) {
      if (!field.label || !field.name) {
        alert("All fields must have a label and name");
        return;
      }
    }

    setSaving(true);
    try {
      const supabase = createClientSupabaseClient();
      const formData = {
        name,
        slug,
        fields,
        settings: form?.settings || null,
      };

      if (form) {
        const { error } = await supabase
          .from("forms")
          .update(formData)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("forms")
          .insert(formData)
          .select()
          .single();
        if (error) throw error;
        router.push(`/admin/forms/${data.id}`);
        return;
      }

      router.push("/admin/forms");
    } catch (error) {
      console.error("Error saving form:", error);
      alert("Failed to save form. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {form ? "Edit Form" : "New Form"}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/forms")}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contact Form"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Slug</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="contact-form"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Form Fields</CardTitle>
                  <CardDescription>
                    Add fields to your form
                  </CardDescription>
                </div>
                <Button onClick={addField} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No fields yet. Click &quot;Add Field&quot; to get started.
                </p>
              ) : (
                fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Label
                              </label>
                              <Input
                                value={field.label}
                                onChange={(e) =>
                                  updateField(field.id, { label: e.target.value })
                                }
                                placeholder="Field Label"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Field Name
                              </label>
                              <Input
                                value={field.name}
                                onChange={(e) =>
                                  updateField(field.id, { name: e.target.value })
                                }
                                placeholder="field_name"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Type
                              </label>
                              <select
                                value={field.type}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    type: e.target.value as FormField["type"],
                                  })
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                {fieldTypes.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.required || false}
                                  onChange={(e) =>
                                    updateField(field.id, {
                                      required: e.target.checked,
                                    })
                                  }
                                  className="rounded"
                                />
                                <span className="text-sm">Required</span>
                              </label>
                            </div>
                          </div>
                          {field.type === "select" && (
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Options (one per line)
                              </label>
                              <textarea
                                value={field.options?.join("\n") || ""}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    options: e.target.value
                                      .split("\n")
                                      .filter((o) => o.trim()),
                                  })
                                }
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                              />
                            </div>
                          )}
                          {field.placeholder !== undefined && (
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Placeholder
                              </label>
                              <Input
                                value={field.placeholder || ""}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    placeholder: e.target.value,
                                  })
                                }
                                placeholder="Enter placeholder text"
                              />
                            </div>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
