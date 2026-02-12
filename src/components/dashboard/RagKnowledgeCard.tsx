"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Copy, Check } from "lucide-react";
import { useState } from "react";

export interface RagKnowledgeCardProps {
  totalTokens: number;
  partCount: number;
  totalChars: number;
  /** Full URLs for each part (e.g. https://site.com/api/rag/knowledge?part=1). Empty if base URL not set. */
  urls: string[];
}

export function RagKnowledgeCard({
  totalTokens,
  partCount,
  totalChars,
  urls,
}: RagKnowledgeCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | "all" | null>(null);

  const copyToClipboard = async (text: string, index: number | "all") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // ignore
    }
  };

  const displayUrls = urls.length > 0 ? urls : Array.from({ length: partCount }, (_, i) => `/api/rag/knowledge?part=${i + 1}`);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">RAG Knowledge (Agent Training)</CardTitle>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {partCount === 1 ? "1 URL" : `${partCount} parts`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ~{totalTokens.toLocaleString()} tokens · {totalChars.toLocaleString()} chars
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Content marked &quot;Use for Agent Training&quot; is included. Add the URL(s) below to your chatbot when you retrain.
          </p>
          {partCount >= 5 && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
              Many parts can slow training and increase load. Consider scaling back &quot;Use for Agent Training&quot; on some content, or use shorter excerpts and snippets.
            </p>
          )}
        </CardContent>
      </Card>

      {partCount >= 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {partCount === 1 ? "URL for your bot" : "URLs for your bot"}
            </CardTitle>
            <CardDescription>
              {partCount === 1
                ? "Add this URL to your chatbot when you retrain so it can use this knowledge."
                : "Add each URL to your chatbot training so it has the full knowledge base."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {displayUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                  {url}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={() => copyToClipboard(url, i)}
                >
                  {copiedIndex === i ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
            {partCount > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => copyToClipboard(displayUrls.join("\n"), "all")}
              >
                {copiedIndex === "all" ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Copied all
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy all URLs
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
