"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import type { FormSubmission } from "@/lib/supabase/crm";

type ExportColumn = { key: string; label: string };

type SubmissionWithForm = FormSubmission & { formName: string; formId: string };

type FormOption = { id: string; name: string };

const PRESETS = [
  { value: "all", label: "All dates" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
] as const;

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

interface SubmissionsListClientProps {
  forms: FormOption[];
  submissions: SubmissionWithForm[];
  total: number;
  page: number;
  pageSize: number;
  formId: string;
  preset: string;
  dateFrom: string;
  dateTo: string;
}

function buildSearchParams(updates: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  if (updates.formId !== undefined && updates.formId !== "all") params.set("formId", String(updates.formId));
  if (updates.preset !== undefined) params.set("preset", String(updates.preset));
  if (updates.dateFrom !== undefined && updates.dateFrom) params.set("dateFrom", String(updates.dateFrom));
  if (updates.dateTo !== undefined && updates.dateTo) params.set("dateTo", String(updates.dateTo));
  if (updates.page !== undefined && updates.page !== 1) params.set("page", String(updates.page));
  if (updates.pageSize !== undefined && updates.pageSize !== 25) params.set("pageSize", String(updates.pageSize));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function SubmissionsListClient({
  forms,
  submissions,
  total,
  page,
  pageSize,
  formId,
  preset,
  dateFrom,
  dateTo,
}: SubmissionsListClientProps) {
  const router = useRouter();

  const [customFrom, setCustomFrom] = useState(dateFrom || "");
  const [customTo, setCustomTo] = useState(dateTo || "");

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormId, setExportFormId] = useState(formId === "all" ? "" : formId);
  const [exportColumns, setExportColumns] = useState<ExportColumn[]>([]);
  const [selectedExportKeys, setSelectedExportKeys] = useState<Set<string>>(new Set());
  const [loadingExportFields, setLoadingExportFields] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (preset === "custom") {
      setCustomFrom(dateFrom || "");
      setCustomTo(dateTo || "");
    }
  }, [preset, dateFrom, dateTo]);

  const fetchExportFields = useCallback(async (formIdToFetch: string) => {
    if (!formIdToFetch) {
      setExportColumns([]);
      setSelectedExportKeys(new Set());
      return;
    }
    setLoadingExportFields(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/crm/forms/${formIdToFetch}/export-fields`);
      if (!res.ok) throw new Error("Failed to load fields");
      const { columns } = await res.json();
      setExportColumns(columns ?? []);
      setSelectedExportKeys(new Set((columns ?? []).map((c: ExportColumn) => c.key)));
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Failed to load fields");
      setExportColumns([]);
      setSelectedExportKeys(new Set());
    } finally {
      setLoadingExportFields(false);
    }
  }, []);

  useEffect(() => {
    if (!exportModalOpen) return;
    if (formId !== "all") setExportFormId(formId);
  }, [exportModalOpen, formId]);

  useEffect(() => {
    if (!exportModalOpen) return;
    const effectiveFormId = exportFormId || (formId !== "all" ? formId : "");
    if (effectiveFormId) fetchExportFields(effectiveFormId);
    else {
      setExportColumns([]);
      setSelectedExportKeys(new Set());
    }
  }, [exportModalOpen, exportFormId, formId, fetchExportFields]);

  const toggleExportKey = (key: string) => {
    setSelectedExportKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllExportKeys = () => {
    setSelectedExportKeys(new Set(exportColumns.map((c) => c.key)));
  };

  const deselectAllExportKeys = () => {
    setSelectedExportKeys(new Set());
  };

  const handleExportCsv = async () => {
    const formIdToExport = exportFormId || (formId !== "all" ? formId : null);
    if (!formIdToExport) {
      setExportError("Please select a form to export.");
      return;
    }
    if (selectedExportKeys.size === 0) {
      setExportError("Select at least one field to export.");
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/crm/forms/submissions/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: formIdToExport,
          preset,
          dateFrom: preset === "custom" ? dateFrom : undefined,
          dateTo: preset === "custom" ? dateTo : undefined,
          fields: Array.from(selectedExportKeys),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "submissions.csv";
      a.click();
      URL.revokeObjectURL(url);
      setExportModalOpen(false);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const updateUrl = (updates: Record<string, string | number | undefined>) => {
    const next = {
      formId: updates.formId ?? formId,
      preset: updates.preset ?? preset,
      dateFrom: updates.dateFrom ?? dateFrom,
      dateTo: updates.dateTo ?? dateTo,
      page: updates.page ?? page,
      pageSize: updates.pageSize ?? pageSize,
    };
    const q = buildSearchParams(next);
    router.push(`/admin/crm/forms/submissions${q}`);
  };

  const handleFormChange = (value: string) => {
    updateUrl({ formId: value === "all" ? undefined : value, page: 1 });
  };

  const handlePresetChange = (value: string) => {
    updateUrl({ preset: value, dateFrom: undefined, dateTo: undefined, page: 1 });
    if (value === "custom") {
      setCustomFrom("");
      setCustomTo("");
    }
  };

  const handleCustomRangeApply = () => {
    const from = customFrom.trim();
    const to = customTo.trim();
    if (from && to) {
      updateUrl({ preset: "custom", dateFrom: from, dateTo: to, page: 1 });
    }
  };

  const handlePageSizeChange = (value: string) => {
    const n = parseInt(value, 10);
    if ([25, 50, 100].includes(n)) {
      updateUrl({ pageSize: n, page: 1 });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-sm text-muted-foreground">Form</Label>
          <Select value={formId} onValueChange={handleFormChange}>
            <SelectTrigger className="w-[220px] mt-1">
              <SelectValue placeholder="All forms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All forms</SelectItem>
              {forms.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Date range</Label>
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[180px] mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {preset === "custom" && (
          <>
            <div>
              <Label className="text-sm text-muted-foreground">From</Label>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-[140px] mt-1"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">To</Label>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-[140px] mt-1"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={handleCustomRangeApply}>
              Apply
            </Button>
          </>
        )}

        <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Export form submissions</DialogTitle>
              <DialogDescription>
                Choose a form and the fields to include in the CSV. Export uses the current date range filter.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm text-muted-foreground">Form</Label>
                <Select
                  value={exportFormId || (formId !== "all" ? formId : "none")}
                  onValueChange={(v) => setExportFormId(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select a form" />
                  </SelectTrigger>
                  <SelectContent>
                    {formId === "all" && (
                      <SelectItem value="none">Select a form…</SelectItem>
                    )}
                    {forms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {loadingExportFields && (
                <p className="text-sm text-muted-foreground">Loading fields…</p>
              )}
              {!loadingExportFields && exportColumns.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm text-muted-foreground">Fields to include</Label>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAllExportKeys}>
                        All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAllExportKeys}>
                        None
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-2">
                    {exportColumns.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={selectedExportKeys.has(col.key)}
                          onCheckedChange={() => toggleExportKey(col.key)}
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {exportError && (
                <p className="text-sm text-destructive">{exportError}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExportCsv}
                disabled={loadingExportFields || exporting || selectedExportKeys.size === 0 || (!exportFormId && formId === "all")}
              >
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {submissions.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No submissions in this date range for the selected form.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Form</th>
                  <th className="text-left py-2 pr-4 font-medium">Submitted</th>
                  <th className="text-left py-2 pr-4 font-medium">Contact</th>
                  <th className="text-left py-2 font-medium">Payload</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/crm/forms/${s.formId}/submissions`}
                        className="text-primary hover:underline"
                      >
                        {s.formName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {new Date(s.submitted_at).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      {s.contact_id ? (
                        <Link
                          href={`/admin/crm/contacts/${s.contact_id}`}
                          className="text-primary hover:underline"
                        >
                          View contact
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-w-md">
                        {JSON.stringify(s.payload, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                aria-label="Per page"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>per page</span>
            </div>
            <div className="flex-1 text-center text-sm text-muted-foreground">
              {total} record{total !== 1 ? "s" : ""} in range
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {start}–{end} of {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page <= 1}
                onClick={() => updateUrl({ page: page - 1 })}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page >= totalPages}
                onClick={() => updateUrl({ page: page + 1 })}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
