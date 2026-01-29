"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PublicFormFieldConfig } from "./page";

interface PublicFormClientProps {
  formSlug: string;
  formName: string;
  successMessage: string;
  fields: PublicFormFieldConfig[];
}

export function PublicFormClient({
  formSlug,
  successMessage,
  fields,
}: PublicFormClientProps) {
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleChange = (submitKey: string, value: string) => {
    setPayload((prev) => ({ ...prev, [submitKey]: value }));
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/forms/${formSlug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: data.message ?? successMessage });
        setPayload({});
      } else {
        setResult({ success: false, message: data.error ?? "Something went wrong." });
      }
    } catch {
      setResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.submitKey} className="space-y-2">
          <Label htmlFor={field.submitKey}>
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          {field.type === "textarea" ? (
            <textarea
              id={field.submitKey}
              name={field.submitKey}
              value={payload[field.submitKey] ?? ""}
              onChange={(e) => handleChange(field.submitKey, e.target.value)}
              required={field.required}
              rows={4}
              className={cn(
                "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-y"
              )}
              placeholder={field.required ? undefined : "Optional"}
            />
          ) : (
            <Input
              id={field.submitKey}
              name={field.submitKey}
              type={field.type}
              value={payload[field.submitKey] ?? ""}
              onChange={(e) => handleChange(field.submitKey, e.target.value)}
              required={field.required}
              placeholder={field.required ? undefined : "Optional"}
            />
          )}
        </div>
      ))}

      {result && (
        <div
          className={cn(
            "rounded-md border p-3 text-sm",
            result.success
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
              : "border-destructive/50 bg-destructive/10 text-destructive"
          )}
        >
          {result.message}
        </div>
      )}

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Sending…" : "Submit"}
      </Button>
    </form>
  );
}
