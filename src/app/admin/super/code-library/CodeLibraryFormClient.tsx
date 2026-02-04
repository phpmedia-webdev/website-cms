"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

const CODE_LIBRARY_BASE = "/admin/super/code-library";

export function CodeLibraryFormClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/code-snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type: type.trim() || null,
          description: description.trim() || null,
          code,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create");
      }
      const created = await res.json();
      router.push(`${CODE_LIBRARY_BASE}/${created.id}`);
    } catch (e) {
      console.error("Create code library entry:", e);
      alert(e instanceof Error ? e.message : "Failed to create entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={CODE_LIBRARY_BASE}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Code Library
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New entry</CardTitle>
          <CardDescription>Title, type, description, and code. Type is optional (e.g. section, page, layout).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hero section"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g. section, page, layout"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="code">Code *</Label>
              <textarea
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste or type the code block…"
                required
                rows={16}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save entry"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={CODE_LIBRARY_BASE}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
