"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FormStyle, ColorPalette } from "@/types/design-system";

export interface FormEmbedFieldConfig {
  submitKey: string;
  label: string;
  required: boolean;
  type: "email" | "text" | "textarea" | "tel";
}

function getThemeColor(key: string, palette: ColorPalette): string | undefined {
  if (!key || !palette) return undefined;
  const hex = (palette as unknown as Record<string, string>)[key];
  return typeof hex === "string" ? hex : undefined;
}

/** Build inline styles for form container, labels, inputs, and submit from FormStyle + theme colors. */
export function formStyleToCss(
  style: FormStyle | undefined,
  themeColors: ColorPalette
): {
  container: React.CSSProperties;
  label: React.CSSProperties;
  input: React.CSSProperties;
  submit: React.CSSProperties;
} {
  const container: React.CSSProperties = {};
  const label: React.CSSProperties = {};
  const input: React.CSSProperties = {};
  const submit: React.CSSProperties = {};

  if (!style) return { container, label, input, submit };

  const bg = style.backgroundColorTheme && getThemeColor(style.backgroundColorTheme, themeColors);
  if (bg) container.backgroundColor = bg;
  const borderColor = style.borderColorTheme && getThemeColor(style.borderColorTheme, themeColors);
  if (borderColor) {
    container.borderWidth = "1px";
    container.borderStyle = "solid";
    container.borderColor = borderColor;
  }
  if (style.borderRadius) container.borderRadius = style.borderRadius;

  const labelColor = style.labelColorTheme && getThemeColor(style.labelColorTheme, themeColors);
  if (labelColor) label.color = labelColor;

  const inputBorder = style.inputBorderColorTheme && getThemeColor(style.inputBorderColorTheme, themeColors);
  if (inputBorder) {
    input.borderColor = inputBorder;
    input.borderWidth = "1px";
    input.borderStyle = "solid";
  }
  if (style.borderRadius) input.borderRadius = style.borderRadius;

  const submitBg = style.submitBackgroundTheme && getThemeColor(style.submitBackgroundTheme, themeColors);
  if (submitBg) submit.backgroundColor = submitBg;
  const submitColor = style.submitColorTheme && getThemeColor(style.submitColorTheme, themeColors);
  if (submitColor) submit.color = submitColor;
  if (style.borderRadius) submit.borderRadius = style.borderRadius;

  return { container, label, input, submit };
}

interface FormEmbedProps {
  formId: string;
  styleSlug?: string | null;
  formStyles?: FormStyle[] | null;
  themeColors?: ColorPalette | null;
  className?: string;
}

export function FormEmbed({
  formId,
  styleSlug,
  formStyles,
  themeColors,
  className,
}: FormEmbedProps) {
  const [config, setConfig] = useState<{
    slug: string;
    name: string;
    successMessage: string;
    fields: FormEmbedFieldConfig[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/forms/${encodeURIComponent(formId)}/config`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Form not found" : "Failed to load form");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setConfig(data);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load form");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const resolvedFormStyle: FormStyle | undefined = styleSlug && formStyles
    ? formStyles.find((s) => s.slug === styleSlug)
    : undefined;
  const palette = themeColors ?? ({} as ColorPalette);
  const { container: containerStyle, label: labelStyle, input: inputStyle, submit: submitStyle } = formStyleToCss(resolvedFormStyle, palette);

  const handleChange = (submitKey: string, value: string) => {
    setPayload((prev) => ({ ...prev, [submitKey]: value }));
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/forms/${config.slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: data.message ?? config.successMessage });
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

  if (loading) {
    return (
      <div className={cn("rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground", className)}>
        Loading form…
      </div>
    );
  }
  if (error || !config) {
    return (
      <div className={cn("rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive", className)}>
        {error ?? "Form not found"}
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-md p-4 space-y-4", className)}
      style={Object.keys(containerStyle).length ? containerStyle : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {config.fields.map((field) => (
          <div key={field.submitKey} className="space-y-2">
            <Label htmlFor={field.submitKey} style={Object.keys(labelStyle).length ? labelStyle : undefined}>
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
                  "flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-y"
                )}
                style={Object.keys(inputStyle).length ? inputStyle : undefined}
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
                className="rounded-md border bg-background"
                style={Object.keys(inputStyle).length ? inputStyle : undefined}
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

        <Button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto"
          style={Object.keys(submitStyle).length ? submitStyle : undefined}
        >
          {submitting ? "Sending…" : "Submit"}
        </Button>
      </form>
    </div>
  );
}
