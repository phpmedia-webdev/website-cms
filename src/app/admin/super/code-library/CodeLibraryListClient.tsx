"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CodeSnippet } from "@/types/code-snippets";
import { Plus, Search, Eye } from "lucide-react";

const CODE_LIBRARY_BASE = "/admin/super/code-library";

export function CodeLibraryListClient() {
  const [items, setItems] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/code-snippets");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Fetch code library:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const types = Array.from(
    new Set(items.map((i) => i.type).filter(Boolean)) as Set<string>
  ).sort();

  const filtered = items.filter((c) => {
    const matchSearch =
      !search.trim() ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || c.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>All entries</CardTitle>
            <CardDescription>
              Title, type, description. Open a row to view and copy code.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href={`${CODE_LIBRARY_BASE}/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add entry
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-[160px] px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      Title
                    </th>
                    <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No entries yet. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id} className="border-t hover:bg-accent">
                        <td className="px-3 py-1.5 font-medium">{c.title || "—"}</td>
                        <td className="px-3 py-1.5 text-sm text-muted-foreground">
                          {c.type || "—"}
                        </td>
                        <td className="px-3 py-1.5 text-sm text-muted-foreground max-w-[300px] truncate">
                          {c.description || "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`${CODE_LIBRARY_BASE}/${c.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
