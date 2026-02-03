"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CodeSnippet } from "@/types/code-snippets";
import { ArrowLeft, Copy } from "lucide-react";

export function CodeSnippetDetailClient({ snippet }: { snippet: CodeSnippet }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/super/code-snippets">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to list
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{snippet.title || "Untitled"}</CardTitle>
          <CardDescription>
            {snippet.type && <span className="mr-4">Type: {snippet.type}</span>}
            {snippet.description && <span>{snippet.description}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              {copied ? "Copied!" : "Copy code"}
            </Button>
          </div>
          <div className="rounded-lg border bg-muted/30 overflow-hidden">
            <pre className="p-4 text-sm overflow-x-auto max-h-[60vh] overflow-y-auto whitespace-pre-wrap font-mono">
              <code>{snippet.code || "(empty)"}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
