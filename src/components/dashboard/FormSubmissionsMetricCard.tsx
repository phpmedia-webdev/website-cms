"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

const PERIODS = [
  { key: "1d", label: "24h" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

interface FormSubmissionsMetricCardProps {
  count1d: number;
  count7d: number;
  count30d: number;
  countAll: number;
}

export function FormSubmissionsMetricCard({
  count1d,
  count7d,
  count30d,
  countAll,
}: FormSubmissionsMetricCardProps) {
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const value =
    period === "1d" ? count1d : period === "7d" ? count7d : period === "30d" ? count30d : countAll;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Form submissions</CardTitle>
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">Submissions in selected period</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                period === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
