"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Plus, Loader2, KeyRound, Copy, Download, ExternalLink } from "lucide-react";

interface Mag {
  id: string;
  name: string;
  uid: string;
}

interface Batch {
  id: string;
  mag_id: string | null;
  name: string;
  use_type: string;
  purpose?: string;
  discount_type?: string | null;
  discount_value?: number | null;
  min_purchase?: number | null;
  scope?: string | null;
  code_hash?: string;
  code_plain?: string | null;
  max_uses?: number | null;
  use_count?: number;
  num_codes?: number | null;
  expires_at?: string | null;
  created_at: string;
  total_codes?: number;
  redeemed_count?: number;
  mags?: { id: string; name: string; uid: string } | null;
}

interface UnifiedCodeRow {
  code: string;
  batch_id: string;
  batch_name: string;
  use_type: "single_use" | "multi_use";
  status: "open" | "used";
  redeemed_at: string | null;
  contact_id: string | null;
  contact_display: string;
}

export function CodeGeneratorClient() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [mags, setMags] = useState<Mag[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [useType, setUseType] = useState<"single_use" | "multi_use">("single_use");
  const [purpose, setPurpose] = useState<"membership" | "discount" | "other">("membership");
  const [magId, setMagId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [numCodes, setNumCodes] = useState("50");
  const [expiresAt, setExpiresAt] = useState("");
  const [codePrefix, setCodePrefix] = useState("");
  const [codeSuffix, setCodeSuffix] = useState("");
  const [randomLength, setRandomLength] = useState("8");
  const [excludeCharsInput, setExcludeCharsInput] = useState("0, O, 1, l, I");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [scope, setScope] = useState("");
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generatingBatchId, setGeneratingBatchId] = useState<string | null>(null);
  const [generateCount, setGenerateCount] = useState("50");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const [codesList, setCodesList] = useState<UnifiedCodeRow[]>([]);
  const [codesTotal, setCodesTotal] = useState(0);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesBatchFilter, setCodesBatchFilter] = useState<string>("all");
  const [codesStatusFilter, setCodesStatusFilter] = useState<"all" | "open" | "used">("all");
  const [codesSearch, setCodesSearch] = useState("");

  const fetchBatches = async () => {
    const res = await fetch("/api/admin/membership-codes/batches");
    if (res.ok) {
      const data = await res.json();
      setBatches(data);
    }
  };

  const fetchMags = async () => {
    const res = await fetch("/api/crm/mags");
    if (res.ok) {
      const data = await res.json();
      setMags(data);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBatches(), fetchMags()]).finally(() => setLoading(false));
  }, []);

  const fetchCodes = async () => {
    setCodesLoading(true);
    try {
      const params = new URLSearchParams();
      if (codesBatchFilter !== "all") params.set("batchId", codesBatchFilter);
      params.set("status", codesStatusFilter);
      params.set("limit", "500");
      const res = await fetch(`/api/admin/membership-codes/codes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCodesList(data.codes ?? []);
        setCodesTotal(data.total ?? 0);
      } else {
        setCodesList([]);
        setCodesTotal(0);
      }
    } catch {
      setCodesList([]);
      setCodesTotal(0);
    } finally {
      setCodesLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [codesBatchFilter, codesStatusFilter]);

  const codesFiltered = useMemo(() => {
    const q = codesSearch.trim();
    if (!q) return codesList;
    const lower = q.toLowerCase();
    return codesList.filter((r) => r.code.toLowerCase().includes(lower));
  }, [codesList, codesSearch]);

  const exportCodesCsv = () => {
    if (codesFiltered.length === 0) return;
    const header = "code,batch_id,batch_name,use_type,status,redeemed_at,contact_id,contact_display";
    const escape = (v: string | null) => {
      const s = v ?? "";
      return /[",\n\r]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : s;
    };
    const rows = codesFiltered.map(
      (r) =>
        [r.code, r.batch_id, r.batch_name, r.use_type, r.status, r.redeemed_at ?? "", r.contact_id ?? "", r.contact_display].map(escape).join(",")
    );
    const csv = [header, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `membership-codes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setUseType("single_use");
    setPurpose("membership");
    setMagId("");
    setName("");
    setCode("");
    setMaxUses("");
    setNumCodes("50");
    setExpiresAt("");
    setCodePrefix("");
    setCodeSuffix("");
    setRandomLength("8");
    setExcludeCharsInput("0, O, 1, l, I");
    setDiscountType("percent");
    setDiscountValue("");
    setMinPurchase("");
    setScope("");
  };

  /** Parse comma-separated exclude characters into a single string (deduped) for the API. */
  const parseExcludeChars = (input: string): string => {
    const tokens = input.split(",").map((s) => s.trim()).filter(Boolean);
    const chars = new Set<string>();
    tokens.forEach((t) => t.split("").forEach((c) => chars.add(c)));
    return [...chars].join("");
  };

  const handleCreate = async () => {
    const isDiscount = purpose === "discount";
    if (!isDiscount && !magId) {
      alert("Select a membership for membership codes");
      return;
    }
    if (isDiscount && (!discountValue.trim() || Number(discountValue) <= 0)) {
      alert("Enter a valid discount value for discount codes");
      return;
    }
    if (useType === "multi_use" && !code.trim()) {
      alert("Enter the code for multi-use");
      return;
    }
    if (useType === "single_use" && !name.trim()) {
      alert("Enter a batch name");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        use_type: useType,
        purpose,
        mag_id: magId || null,
        expires_at: expiresAt || null,
      };
      if (isDiscount) {
        body.discount_type = discountType;
        body.discount_value = Number(discountValue);
        body.min_purchase = minPurchase.trim() ? Number(minPurchase) : null;
        body.scope = scope.trim() || null;
      }
      if (useType === "multi_use") {
        body.code = code.trim();
        body.name = name.trim() || null;
        body.max_uses = maxUses ? parseInt(maxUses, 10) : null;
      } else {
        body.name = name.trim();
        body.num_codes = parseInt(numCodes, 10) || 50;
        body.code_prefix = codePrefix || null;
        body.code_suffix = codeSuffix || null;
        body.random_length = parseInt(randomLength, 10) || 8;
        body.exclude_chars = parseExcludeChars(excludeCharsInput);
      }
      const res = await fetch("/api/admin/membership-codes/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      await fetchBatches();
      fetchCodes();
      const { id } = await res.json();
      setModalOpen(false);
      resetForm();
      if (useType === "single_use") {
        setGeneratingBatchId(id);
        setGenerateModalOpen(true);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create batch");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!generatingBatchId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/membership-codes/batches/${generatingBatchId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: parseInt(generateCount, 10) || 50 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }
      const { codes } = await res.json();
      setGeneratedCodes(codes);
      await fetchBatches();
      fetchCodes();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate codes");
    } finally {
      setGenerating(false);
    }
  };

  const copyCodes = () => {
    if (generatedCodes.length === 0) return;
    navigator.clipboard.writeText(generatedCodes.join("\n"));
    alert(`Copied ${generatedCodes.length} codes to clipboard`);
  };

  const downloadCsv = () => {
    if (generatedCodes.length === 0) return;
    const csv = "code\n" + generatedCodes.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "membership-codes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatExpires = (s: string | null | undefined) => {
    if (!s) return "Never";
    try {
      return new Date(s).toLocaleDateString();
    } catch {
      return s;
    }
  };

  const magName = (b: Batch) => {
    if (!b.mag_id) return "—";
    const m = b.mags;
    return m ? `${m.name} (${m.uid})` : b.mag_id;
  };

  const purposeLabel = (p: string | undefined) => {
    if (p === "discount") return "Discount";
    if (p === "other") return "Other";
    return "Membership";
  };

  const discountSummary = (b: Batch) => {
    if (b.purpose !== "discount" || b.discount_type == null || b.discount_value == null) return null;
    const val = b.discount_type === "percent" ? `${b.discount_value}%` : `$${Number(b.discount_value).toFixed(2)}`;
    const min = b.min_purchase != null && b.min_purchase > 0 ? ` min $${Number(b.min_purchase).toFixed(2)}` : "";
    return `${val} off${min}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Code Generator</h1>
          <p className="text-muted-foreground mt-1">
            Create single-use or multi-use redemption codes for memberships.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create batch
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batches</CardTitle>
          <CardDescription>
            Single-use batches can have codes generated. Multi-use batches use one shared code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No batches yet. Create one to get started.
            </p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2 px-3 font-medium">Name</th>
                    <th className="text-left py-2 px-3 font-medium">Purpose</th>
                    <th className="text-left py-2 px-3 font-medium">MAG</th>
                    <th className="text-left py-2 px-3 font-medium">Type</th>
                    <th className="text-left py-2 px-3 font-medium">Codes / Usage</th>
                    <th className="text-left py-2 px-3 font-medium">Expires</th>
                    <th className="text-right py-2 px-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="py-2 px-3">
                        <span className="font-medium">{b.name}</span>
                        {b.use_type === "multi_use" && b.code_plain && (
                          <code className="ml-2 text-xs font-mono text-muted-foreground">{b.code_plain}</code>
                        )}
                        {discountSummary(b) && (
                          <span className="block text-xs text-muted-foreground mt-0.5">{discountSummary(b)}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{purposeLabel(b.purpose)}</td>
                      <td className="py-2 px-3 text-muted-foreground">{magName(b)}</td>
                      <td className="py-2 px-3">
                        {b.use_type === "single_use" ? "Single-use" : "Multi-use"}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {b.use_type === "single_use" && typeof b.total_codes === "number"
                          ? `${b.redeemed_count ?? 0} / ${b.total_codes} redeemed`
                          : b.use_type === "multi_use" && typeof b.use_count === "number"
                            ? `${b.use_count}${b.max_uses ? ` / ${b.max_uses}` : ""} uses`
                            : "—"}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{formatExpires(b.expires_at)}</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/crm/memberships/code-generator/batches/${b.id}`} className="inline-flex items-center">
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Explore
                            </Link>
                          </Button>
                          {b.use_type === "single_use" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setGeneratingBatchId(b.id);
                                setGeneratedCodes([]);
                                setGenerateCount("50");
                                setGenerateModalOpen(true);
                              }}
                            >
                              Generate codes
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Codes</CardTitle>
          <CardDescription>
            All codes and redemptions. Filter by batch or status; export as CSV for event participation and reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Batch</Label>
              <select
                value={codesBatchFilter}
                onChange={(e) => setCodesBatchFilter(e.target.value)}
                className="flex h-9 w-[220px] mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Status</Label>
              <select
                value={codesStatusFilter}
                onChange={(e) => setCodesStatusFilter(e.target.value as "all" | "open" | "used")}
                className="flex h-9 w-[120px] mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="used">Used</option>
              </select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Search</Label>
              <Input
                type="text"
                placeholder="Find code…"
                maxLength={20}
                value={codesSearch}
                onChange={(e) => setCodesSearch(e.target.value)}
                className="h-9 w-[140px] mt-1"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" className="h-9" onClick={fetchCodes} disabled={codesLoading}>
                {codesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={exportCodesCsv} disabled={codesFiltered.length === 0}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
            <span className="text-sm text-muted-foreground ml-auto pb-0.5">
              {codesSearch.trim() ? `${codesFiltered.length} of ${codesTotal}` : codesTotal} record{(codesSearch.trim() ? codesFiltered.length : codesTotal) !== 1 ? "s" : ""}
            </span>
          </div>
          {codesLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : codesList.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No codes match the current filters.
            </p>
          ) : codesFiltered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No codes match the search.
            </p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2 px-3 font-medium">Code</th>
                    <th className="text-left py-2 px-3 font-medium">Batch</th>
                    <th className="text-left py-2 px-3 font-medium">Type</th>
                    <th className="text-left py-2 px-3 font-medium">Status</th>
                    <th className="text-left py-2 px-3 font-medium">Used</th>
                    <th className="text-left py-2 px-3 font-medium">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {codesFiltered.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-3 font-mono">{row.code}</td>
                      <td className="py-2 px-3 text-muted-foreground">{row.batch_name}</td>
                      <td className="py-2 px-3">{row.use_type === "single_use" ? "Single" : "Multi"}</td>
                      <td className="py-2 px-3">{row.status === "used" ? "Used" : "Open"}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {row.redeemed_at ? new Date(row.redeemed_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-3">
                        {row.contact_id ? (
                          <Link href={`/admin/crm/contacts/${row.contact_id}`} className="text-primary hover:underline">
                            {row.contact_display}
                          </Link>
                        ) : (
                          row.contact_display || "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Create code batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto min-h-0 max-h-[60vh] pr-1">
            <div>
              <Label>Purpose</Label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as "membership" | "discount" | "other")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="membership">Membership (MAG redemption)</option>
                <option value="discount">Discount (ecommerce coupon)</option>
                <option value="other">Other</option>
              </select>
            </div>
            {purpose === "membership" && (
              <div>
                <Label>Membership (MAG)</Label>
                <select
                  value={magId}
                  onChange={(e) => setMagId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {mags.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.uid})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {purpose === "discount" && (
              <>
                <div>
                  <Label>Discount type</Label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="percent">Percent off</option>
                    <option value="fixed">Fixed amount off</option>
                  </select>
                </div>
                <div>
                  <Label>Discount value {discountType === "percent" ? "(%)" : "($)"}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={discountType === "percent" ? 1 : 0.01}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 5.00"}
                  />
                </div>
                <div>
                  <Label>Minimum purchase (optional, $)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    placeholder="No minimum"
                  />
                </div>
                <div>
                  <Label>Scope (optional)</Label>
                  <Input
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    placeholder="e.g. entire_order"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Reserved for future use (e.g. entire order vs specific products).</p>
                </div>
              </>
            )}
            <div>
              <Label>Type</Label>
              <select
                value={useType}
                onChange={(e) => setUseType(e.target.value as "single_use" | "multi_use")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="single_use">Single-use (many unique codes)</option>
                <option value="multi_use">Multi-use (one shared code)</option>
              </select>
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={useType === "multi_use" ? "Optional" : "e.g. Summer 2026 promo"}
              />
            </div>
            {useType === "multi_use" && (
              <>
                <div>
                  <Label>Code (shared code)</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. SUMMER2026"
                  />
                </div>
                <div>
                  <Label>Max uses (optional)</Label>
                  <Input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                  />
                </div>
              </>
            )}
            {useType === "single_use" && (
              <>
                <div>
                  <Label>Number of codes (batch size)</Label>
                  <Input
                    type="number"
                    value={numCodes}
                    onChange={(e) => setNumCodes(e.target.value)}
                    min={1}
                    max={1000}
                  />
                </div>
                <div>
                  <Label>Code prefix (optional)</Label>
                  <Input value={codePrefix} onChange={(e) => setCodePrefix(e.target.value)} placeholder="e.g. PROMO-" />
                </div>
                <div>
                  <Label>Code suffix (optional)</Label>
                  <Input value={codeSuffix} onChange={(e) => setCodeSuffix(e.target.value)} placeholder="e.g. -2026" />
                </div>
                <div>
                  <Label>Random segment length</Label>
                  <Input
                    type="number"
                    value={randomLength}
                    onChange={(e) => setRandomLength(e.target.value)}
                    min={4}
                    max={24}
                  />
                </div>
                <div>
                  <Label htmlFor="exclude-chars">Characters to omit from codes</Label>
                  <Input
                    id="exclude-chars"
                    type="text"
                    value={excludeCharsInput}
                    onChange={(e) => setExcludeCharsInput(e.target.value)}
                    placeholder="e.g. 0, O, 1, l, I, 2, Z"
                    className="mt-1 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated. These characters will not appear in generated codes.
                  </p>
                </div>
              </>
            )}
            <div>
              <Label>Expires at (optional)</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate codes</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Codes are shown once. Copy or download for distribution.
            </p>
          </DialogHeader>
          {generatedCodes.length === 0 ? (
            <div className="space-y-4 py-4">
              <div>
                <Label>Number to generate</Label>
                <Input
                  type="number"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(e.target.value)}
                  min={1}
                  max={500}
                  disabled={generating}
                />
              </div>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Generate
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <p className="text-sm">
                Generated {generatedCodes.length} codes. Copy or download now — they won&apos;t be shown again.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyCodes}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCsv}>
                  <Download className="h-4 w-4 mr-1" />
                  Download CSV
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded border p-2 font-mono text-xs">
                {generatedCodes.slice(0, 20).map((c, i) => (
                  <div key={i}>{c}</div>
                ))}
                {generatedCodes.length > 20 && (
                  <div className="text-muted-foreground">… and {generatedCodes.length - 20} more</div>
                )}
              </div>
              <Button onClick={() => { setGeneratedCodes([]); setGenerateModalOpen(false); }}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
