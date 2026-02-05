"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Member "Apply code" — redeem a membership code. Used for testing and Phase 9A.
 */
export function ApplyCodeBlock() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/members/redeem-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to apply code" });
        return;
      }
      setMessage({ type: "success", text: "Code applied. You now have access to the linked membership." });
      setCode("");
    } catch {
      setMessage({ type: "error", text: "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply code</CardTitle>
        <CardDescription>
          Have a membership or access code? Enter it below to add the linked membership to your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code"
            className="max-w-xs"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !code.trim()}>
            {loading ? "Applying…" : "Apply"}
          </Button>
        </form>
        {message && (
          <p className={`mt-2 text-sm ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
