"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { OrderImportField } from "@/lib/shop/import-orders-csv";

const ORDER_FIELDS: { key: OrderImportField; label: string; required?: boolean }[] = [
  { key: "customer_email", label: "Customer email", required: true },
  { key: "total", label: "Total", required: true },
  { key: "currency", label: "Currency" },
  { key: "order_date", label: "Order date" },
  { key: "status", label: "Status" },
  { key: "order_number", label: "Order number (idempotency)" },
  { key: "line_description", label: "Line description" },
  { key: "line_amount", label: "Line amount" },
];

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let cell = "";
      while (i < line.length) {
        if (line[i] === '"') {
          i++;
          if (line[i] === '"') {
            cell += '"';
            i++;
          } else break;
        } else {
          cell += line[i];
          i++;
        }
      }
      out.push(cell);
      if (line[i] === ",") i++;
    } else {
      let cell = "";
      while (i < line.length && line[i] !== ",") {
        cell += line[i];
        i++;
      }
      out.push(cell.trim());
      if (line[i] === ",") i++;
    }
  }
  return out;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  return lines.map(parseCSVLine);
}

export function ImportOrdersClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [csvPaste, setCsvPaste] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped?: number;
    total: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const headers = rows.length > 0 ? rows[0] : [];
  const dataRows = rows.length > 1 ? rows.slice(1) : [];

  const applyCsv = useCallback((text: string) => {
    setRows(parseCSV(text));
    setMapping({});
    setResult(null);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      setCsvPaste("");
      const reader = new FileReader();
      reader.onload = () => applyCsv(String(reader.result ?? ""));
      reader.readAsText(f, "UTF-8");
    },
    [applyCsv]
  );

  const setMappingField = (fieldKey: string, columnIndex: number) => {
    if (columnIndex < 0) {
      const next = { ...mapping };
      delete next[fieldKey];
      setMapping(next);
    } else {
      setMapping((prev) => ({ ...prev, [fieldKey]: columnIndex }));
    }
  };

  const handleImport = async () => {
    if (dataRows.length === 0) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/ecommerce/import-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: dataRows, mapping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult({
        created: data.created,
        skipped: data.skipped,
        total: data.total,
        errors: data.errors ?? [],
      });
      router.refresh();
    } catch (err) {
      setResult({
        created: 0,
        total: dataRows.length,
        errors: [{ row: 0, message: err instanceof Error ? err.message : "Import failed" }],
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. CSV source</CardTitle>
          <CardDescription>
            Upload a file or paste CSV. First row = column headers. Works with any source (WooCommerce, Shopify, manual).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:text-primary-foreground file:font-medium"
            />
            {file && (
              <span className="text-sm text-muted-foreground">
                {file.name} ({dataRows.length} rows)
              </span>
            )}
          </div>
          <div>
            <Label className="text-sm">Or paste CSV</Label>
            <Textarea
              placeholder="Paste CSV content here…"
              value={csvPaste}
              onChange={(e) => setCsvPaste(e.target.value)}
              rows={4}
              className="mt-1 font-mono text-sm"
            />
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => csvPaste.trim() && (applyCsv(csvPaste), setFile(null))}>
              Use pasted CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Map columns to order fields</CardTitle>
            <CardDescription>
              Customer email and Total are required. Order number is used to skip duplicates (idempotency).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ORDER_FIELDS.map(({ key, label, required }) => (
              <div key={key} className="flex items-center gap-4">
                <Label className="w-48 shrink-0 text-sm">
                  {label}
                  {required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <select
                  className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={mapping[key] ?? ""}
                  onChange={(e) => setMappingField(key, e.target.value === "" ? -1 : Number(e.target.value))}
                >
                  <option value="">Don&apos;t map</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      Column: {h || `(column ${i + 1})`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {dataRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              First 5 data rows (after header). These will be imported when you click Import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium">
                        {h || `Col ${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.slice(0, 5).map((row, ri) => (
                    <tr key={ri} className="border-b last:border-0">
                      {row.map((cell, ci) => (
                        <td key={ci} className="max-w-[200px] truncate px-3 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                onClick={handleImport}
                disabled={importing || mapping.customer_email == null || mapping.total == null}
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import {dataRows.length} order{dataRows.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
              <Link href="/admin/ecommerce/orders">
                <Button variant="outline">Cancel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>
                {result.created} order{result.created !== 1 ? "s" : ""} created
                {result.skipped != null && result.skipped > 0 && `, ${result.skipped} skipped`}
              </span>
            </div>
            {result.errors.length > 0 && (
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/ecommerce/orders">
              <Button variant="outline" size="sm" className="mt-2">
                Back to orders
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!file && !csvPaste && rows.length === 0 && !result && (
        <p className="text-sm text-muted-foreground">
          Upload a CSV file or paste CSV content to get started. Map columns to order fields (customer email, total, etc.). Order number column skips duplicates.
        </p>
      )}
    </div>
  );
}
