"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const CRM_FIELDS: { key: string; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "full_name", label: "Full name" },
  { key: "company", label: "Company" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "postal_code", label: "Postal code" },
  { key: "country", label: "Country" },
  { key: "message", label: "Message / notes" },
  { key: "source", label: "Source" },
];

/** Parse a single CSV line (handles quoted fields with commas). */
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

/** Parse CSV text into rows (array of string arrays). */
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  return lines.map(parseCSVLine);
}

export function ImportContactsClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    failed: number;
    total: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const headers = rows.length > 0 ? rows[0] : [];
  const dataRows = rows.length > 1 ? rows.slice(1) : [];

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      setResult(null);
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        const parsed = parseCSV(text);
        setRows(parsed);
        setMapping({});
      };
      reader.readAsText(f, "UTF-8");
    },
    []
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
      const res = await fetch("/api/crm/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: dataRows, mapping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("crm-data-changed"));
      }
    } catch (err) {
      setResult({
        created: 0,
        failed: dataRows.length,
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
          <CardTitle>1. Upload CSV</CardTitle>
          <CardDescription>
            First row should be column headers. We’ll use them to map to CRM fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Map columns</CardTitle>
            <CardDescription>
              Choose which file column maps to each CRM field. Leave “Don’t map” to skip a field.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {CRM_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-4">
                <Label className="w-40 shrink-0 text-sm">{label}</Label>
                <select
                  className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={mapping[key] ?? ""}
                  onChange={(e) =>
                    setMappingField(key, e.target.value === "" ? -1 : Number(e.target.value))
                  }
                >
                  <option value="">Don’t map</option>
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
                disabled={importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import {dataRows.length} contact{dataRows.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
              <Link href="/admin/crm/contacts">
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
              <span>{result.created} contact{result.created !== 1 ? "s" : ""} created</span>
            </div>
            {result.failed > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{result.failed} failed</span>
                </div>
                {result.errors.length > 0 && (
                  <ul className="list-inside list-disc text-sm text-muted-foreground">
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                    {result.errors.length < result.failed && (
                      <li>… and {result.failed - result.errors.length} more</li>
                    )}
                  </ul>
                )}
              </>
            )}
            <Link href="/admin/crm/contacts">
              <Button variant="outline" size="sm" className="mt-2">
                Back to contacts
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!file && !result && (
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to get started. The first row should contain column headers.
        </p>
      )}
    </div>
  );
}
