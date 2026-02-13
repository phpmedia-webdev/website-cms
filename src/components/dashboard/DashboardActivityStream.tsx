"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { DashboardActivityItem } from "@/lib/supabase/crm";

const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "note", label: "Notes" },
  { value: "form_submission", label: "Form submissions" },
  { value: "contact_added", label: "Contact added" },
] as const;

interface DashboardActivityStreamProps {
  initialItems: DashboardActivityItem[];
}

function formatItem(item: DashboardActivityItem): string {
  switch (item.type) {
    case "note":
      return item.body?.trim() ? item.body : "Note";
    case "form_submission":
      return `Submitted ${item.formName ?? "form"}`;
    case "contact_added":
      return "Contact added";
    default:
      return "";
  }
}

export function DashboardActivityStream({ initialItems }: DashboardActivityStreamProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = initialItems;
    if (typeFilter !== "all") {
      list = list.filter((i) => i.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.contactName.toLowerCase().includes(q) ||
          (i.body?.toLowerCase().includes(q)) ||
          (i.formName?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [initialItems, typeFilter, search]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Activity</CardTitle>
        <p className="text-xs text-muted-foreground">Recent notes, form submissions, and new contacts</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            {TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="max-h-[360px] overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No activity matches</p>
          ) : (
            filtered.map((item) => (
              <Link
                key={`${item.type}-${item.at}-${item.contactId}`}
                href={`/admin/crm/contacts/${item.contactId}`}
                className="block rounded px-2 py-1.5 hover:bg-muted/50 text-sm transition-colors"
              >
                <p className="truncate">{formatItem(item)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <span>{item.contactName}</span>
                  <span>·</span>
                  <span>{new Date(item.at).toLocaleString()}</span>
                  {item.noteType && (
                    <span className="inline-flex rounded px-1 py-0.5 text-[10px] font-medium bg-muted">
                      {item.noteType}
                    </span>
                  )}
                </p>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
