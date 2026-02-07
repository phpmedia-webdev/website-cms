"use client";

import { useState, useEffect } from "react";
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
  mag_id: string;
  name: string;
  use_type: string;
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

export function CodeGeneratorClient() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [mags, setMags] = useState<Mag[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [useType, setUseType] = useState<"single_use" | "multi_use">("single_use");
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
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generatingBatchId, setGeneratingBatchId] = useState<string | null>(null);
  const [generateCount, setGenerateCount] = useState("50");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

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

  const resetForm = () => {
    setUseType("single_use");
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
  };

  /** Parse comma-separated exclude characters into a single string (deduped) for the API. */
  const parseExcludeChars = (input: string): string => {
    const tokens = input.split(",").map((s) => s.trim()).filter(Boolean);
    const chars = new Set<string>();
    tokens.forEach((t) => t.split("").forEach((c) => chars.add(c)));
    return [...chars].join("");
  };

  const handleCreate = async () => {
    if (!magId) {
      alert("Select a membership");
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
        mag_id: magId,
        expires_at: expiresAt || null,
      };
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
    const m = b.mags;
    return m ? `${m.name} (${m.uid})` : b.mag_id;
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
            <div className="space-y-2">
              {batches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium truncate">{b.name}</p>
                        {b.use_type === "multi_use" && b.code_plain && (
                          <code className="text-sm font-mono shrink-0 text-right">{b.code_plain}</code>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {magName(b)} · {b.use_type === "single_use" ? "Single-use" : "Multi-use"}
                        {b.use_type === "single_use" && typeof b.total_codes === "number" && (
                          <> · {b.redeemed_count ?? 0}/{b.total_codes} redeemed</>
                        )}
                        {b.use_type === "multi_use" && typeof b.use_count === "number" && (
                          <> · {b.use_count}{b.max_uses ? `/${b.max_uses}` : ""} uses</>
                        )}
                        <> · Expires {formatExpires(b.expires_at)}</>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create code batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
          <DialogFooter>
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
