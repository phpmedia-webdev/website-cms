"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Workflow, Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const LIST_API = "/api/settings/workflows";
const ACTION_TYPES_API = "/api/settings/workflows/action-types";

interface WorkflowRow {
  id: string;
  signup_code: string | null;
  action_type: string;
  sort_order: number;
  config: Record<string, unknown> | null;
  redirect_path: string | null;
}

interface FormState {
  signup_code: string;
  action_type: string;
  sort_order: number;
  configJson: string;
  redirect_path: string;
}

const emptyForm: FormState = {
  signup_code: "",
  action_type: "ensure_crm",
  sort_order: 0,
  configJson: "",
  redirect_path: "",
};

function rowToForm(row: WorkflowRow): FormState {
  return {
    signup_code: row.signup_code ?? "",
    action_type: row.action_type,
    sort_order: row.sort_order,
    configJson:
      row.config != null
        ? JSON.stringify(row.config, null, 2)
        : "",
    redirect_path: row.redirect_path ?? "",
  };
}

export function WorkflowsSettingsContent() {
  const [rows, setRows] = useState<WorkflowRow[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, typesRes] = await Promise.all([
        fetch(LIST_API),
        fetch(ACTION_TYPES_API),
      ]);
      if (!listRes.ok) {
        const d = await listRes.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load workflows");
      }
      if (!typesRes.ok) {
        const d = await typesRes.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load action types");
      }
      const listData = await listRes.json();
      const typesData = await typesRes.json();
      setRows(listData.rows ?? []);
      setActionTypes(typesData.actionTypes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
      setActionTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setForm(emptyForm);
    setFormError(null);
    setAddOpen(true);
  };

  const openEdit = (row: WorkflowRow) => {
    setForm(rowToForm(row));
    setFormError(null);
    setEditId(row.id);
  };

  const closeModals = () => {
    setAddOpen(false);
    setEditId(null);
    setFormError(null);
    setDeleteId(null);
  };

  const parseConfig = (
    json: string
  ): Record<string, unknown> | null | undefined => {
    const trimmed = json.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === "object" && parsed !== null ? parsed : null;
    } catch {
      return undefined;
    }
  };

  const saveAdd = async () => {
    setFormError(null);
    const config = parseConfig(form.configJson);
    if (form.configJson.trim() && config === undefined) {
      setFormError("Config must be valid JSON or empty.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(LIST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signup_code: form.signup_code.trim() || null,
          action_type: form.action_type,
          sort_order: form.sort_order,
          config: config,
          redirect_path: form.redirect_path.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setRows((prev) => [...prev, data.row]);
      closeModals();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    setFormError(null);
    const config = parseConfig(form.configJson);
    if (form.configJson.trim() && config === undefined) {
      setFormError("Config must be valid JSON or empty.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${LIST_API}/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signup_code: form.signup_code.trim() || null,
          action_type: form.action_type,
          sort_order: form.sort_order,
          config: config,
          redirect_path: form.redirect_path.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      setRows((prev) =>
        prev.map((r) => (r.id === editId ? data.row : r))
      );
      closeModals();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string) => setDeleteId(id);

  const doDelete = async () => {
    if (!deleteId) return;
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch(`${LIST_API}/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete");
      }
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      closeModals();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workflows</h1>
        <p className="text-muted-foreground mt-2">
          Manage signup pipeline actions: which steps run when a user signs up, by signup code (or default). Actions run in sort order. Leave code blank for default behavior.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Signup code actions</CardTitle>
            </div>
            <Button onClick={openAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add action
            </Button>
          </div>
          <CardDescription>
            Rows define what runs after signup. Use a signup code to run code-specific actions (e.g. add to membership); use default (empty code) for signups without a code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No workflow actions yet. Add one to run steps after member signup.
            </p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium px-4 py-3">Code</th>
                    <th className="text-left font-medium px-4 py-3">Action</th>
                    <th className="text-left font-medium px-4 py-3 w-20">Order</th>
                    <th className="text-left font-medium px-4 py-3">Redirect</th>
                    <th className="text-right font-medium px-4 py-3 w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">
                        {row.signup_code ?? (
                          <span className="text-muted-foreground">Default</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{row.action_type}</td>
                      <td className="px-4 py-3">{row.sort_order}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.redirect_path ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive"
                          onClick={() => confirmDelete(row.id)}
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

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => !open && closeModals()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add workflow action</DialogTitle>
          </DialogHeader>
          <WorkflowForm
            form={form}
            setForm={setForm}
            actionTypes={actionTypes}
            formError={formError}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAdd} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => !open && closeModals()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit workflow action</DialogTitle>
          </DialogHeader>
          <WorkflowForm
            form={form}
            setForm={setForm}
            actionTypes={actionTypes}
            formError={formError}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeModals}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && closeModals()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete action?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action will be removed from the signup pipeline. This cannot be undone.
          </p>
          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeModals}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={doDelete} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkflowForm({
  form,
  setForm,
  actionTypes,
  formError,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  actionTypes: string[];
  formError: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="wf-signup_code">Signup code (optional)</Label>
        <Input
          id="wf-signup_code"
          placeholder="e.g. PROMO1 — leave blank for default"
          value={form.signup_code}
          onChange={(e) => setForm((f) => ({ ...f, signup_code: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="wf-action_type">Action type</Label>
        <Select
          value={form.action_type}
          onValueChange={(v) => setForm((f) => ({ ...f, action_type: v }))}
        >
          <SelectTrigger id="wf-action_type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {actionTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="wf-sort_order">Sort order</Label>
        <Input
          id="wf-sort_order"
          type="number"
          min={0}
          value={form.sort_order}
          onChange={(e) =>
            setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))
          }
        />
      </div>
      <div>
        <Label htmlFor="wf-config">Config (JSON, optional)</Label>
        <textarea
          id="wf-config"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="{}"
          value={form.configJson}
          onChange={(e) => setForm((f) => ({ ...f, configJson: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="wf-redirect_path">Redirect path (optional)</Label>
        <Input
          id="wf-redirect_path"
          placeholder="e.g. /members/dashboard"
          value={form.redirect_path}
          onChange={(e) => setForm((f) => ({ ...f, redirect_path: e.target.value }))}
        />
      </div>
      {formError && (
        <p className="text-sm text-destructive">{formError}</p>
      )}
    </div>
  );
}
