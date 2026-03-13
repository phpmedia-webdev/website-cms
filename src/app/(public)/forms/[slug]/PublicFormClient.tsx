"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PublicFormFieldConfig } from "./page";

const HONEYPOT_FIELD = "website";

interface PublicFormClientProps {
  formSlug: string;
  formName: string;
  successMessage: string;
  fields: PublicFormFieldConfig[];
  recaptchaSiteKey?: string;
}

export function PublicFormClient({
  formSlug,
  successMessage,
  fields,
  recaptchaSiteKey,
}: PublicFormClientProps) {
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const formLoadedAtRef = useRef<string | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    formLoadedAtRef.current = new Date().toISOString();
  }, []);

  useEffect(() => {
    const siteKey = recaptchaSiteKey;
    if (!siteKey || !recaptchaContainerRef.current) return;
    const w = window as unknown as {
      grecaptcha?: { render: (el: HTMLElement, opts: { sitekey: string }) => number };
      onRecaptchaPublicFormLoad?: () => void;
    };
    if (w.grecaptcha?.render) {
      try {
        if (recaptchaWidgetIdRef.current != null) return;
        recaptchaWidgetIdRef.current = w.grecaptcha.render(recaptchaContainerRef.current, { sitekey: siteKey });
      } catch {
        // ignore
      }
      return;
    }
    w.onRecaptchaPublicFormLoad = () => {
      if (w.grecaptcha?.render && recaptchaContainerRef.current && recaptchaWidgetIdRef.current == null) {
        try {
          recaptchaWidgetIdRef.current = w.grecaptcha.render(recaptchaContainerRef.current, { sitekey: siteKey });
        } catch {
          // ignore
        }
      }
    };
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaPublicFormLoad&render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => {
      delete w.onRecaptchaPublicFormLoad;
    };
  }, [recaptchaSiteKey]);

  const handleChange = (submitKey: string, value: string) => {
    setPayload((prev) => ({ ...prev, [submitKey]: value }));
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { ...payload };
      body[HONEYPOT_FIELD] = "";
      if (formLoadedAtRef.current) body._form_loaded_at = formLoadedAtRef.current;
      if (recaptchaSiteKey && typeof (window as unknown as { grecaptcha?: { getResponse: (id?: number) => string } }).grecaptcha !== "undefined") {
        const token = (window as unknown as { grecaptcha: { getResponse: (id?: number) => string } }).grecaptcha.getResponse(recaptchaWidgetIdRef.current ?? undefined);
        if (token) body.captcha_token = token;
      }
      const res = await fetch(`/api/forms/${formSlug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: data.message ?? successMessage });
        setPayload({});
        if (recaptchaSiteKey && recaptchaWidgetIdRef.current != null && (window as unknown as { grecaptcha?: { reset: (id?: number) => void } }).grecaptcha?.reset) {
          (window as unknown as { grecaptcha: { reset: (id?: number) => void } }).grecaptcha.reset(recaptchaWidgetIdRef.current);
        }
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

      <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
        <label htmlFor={`${formSlug}-${HONEYPOT_FIELD}`}>Leave blank</label>
        <input id={`${formSlug}-${HONEYPOT_FIELD}`} type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {recaptchaSiteKey && (
        <div ref={recaptchaContainerRef} className="min-h-[78px]" data-sitekey={recaptchaSiteKey} />
      )}

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
