"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, KeyRound } from "lucide-react";

interface CodeRow {
  code: string;
  status: string;
  redeemed_at: string | null;
  contact_email: string;
  contact_id?: string | null;
}

interface BatchExploreClientProps {
  batchId: string;
  batchName: string;
  useType: "single_use" | "multi_use";
  magName: string;
  codePlain: string | null;
  expiresAt: string | null;
  totalCodes: number;
  redeemedCount: number;
  useCount: number;
  maxUses: number | null;
}

export function BatchExploreClient({
  batchId,
  batchName,
  useType,
  magName,
  codePlain,
  expiresAt,
  totalCodes,
  redeemedCount,
  useCount,
  maxUses,
}: BatchExploreClientProps) {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/membership-codes/batches/${batchId}/codes`)
      .then((res) => (res.ok ? res.json() : { codes: [] }))
      .then((data) => setCodes(data.codes ?? []))
      .catch(() => setCodes([]))
      .finally(() => setLoading(false));
  }, [batchId]);

  const formatExpires = (s: string | null) => {
    if (!s) return "Never";
    try {
      return new Date(s).toLocaleDateString();
    } catch {
      return s;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <KeyRound className="h-8 w-8 text-muted-foreground" />
          <div>
            <CardTitle>{batchName}</CardTitle>
            <CardDescription>
              {magName} · {useType === "single_use" ? "Single-use" : "Multi-use"}
              {useType === "single_use" && (
                <> · {redeemedCount}/{totalCodes} redeemed</>
              )}
              {useType === "multi_use" && (
                <> · {useCount}{maxUses ? `/${maxUses}` : ""} uses</>
              )}
              <> · Expires {formatExpires(expiresAt)}</>
              {codePlain && useType === "multi_use" && (
                <> · Code: <code className="font-mono">{codePlain}</code></>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="text-sm font-semibold mb-3">Redemption Data</h3>
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : codes.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            {useType === "single_use" ? "No codes generated yet." : "No redemptions yet."}
          </p>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right py-2 px-3 font-medium">Code</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                  <th className="text-left py-2 px-3 font-medium">Contact / Email</th>
                  <th className="text-left py-2 px-3 font-medium">Redeemed</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-right">{row.code}</td>
                    <td className="py-2 px-3">{row.status}</td>
                    <td className="py-2 px-3">
                      {row.contact_id ? (
                        <Link
                          href={`/admin/crm/contacts/${row.contact_id}`}
                          className="text-primary hover:underline"
                        >
                          {row.contact_email}
                        </Link>
                      ) : (
                        row.contact_email
                      )}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {row.redeemed_at
                        ? new Date(row.redeemed_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
