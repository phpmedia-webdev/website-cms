"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormStyle, ColorLabels, ColorPalette } from "@/types/design-system";
import { BUTTON_THEME_COLOR_KEYS } from "@/types/design-system";
import { FileInput, Save, Plus, Trash2, ChevronUp, ChevronDown, Eye } from "lucide-react";
import { formStyleToCss } from "@/components/editor/FormEmbed";

function themeLabel(key: string, colorLabels?: ColorLabels | null): string {
  const label = colorLabels?.[key as keyof ColorLabels];
  if (typeof label === "string" && label.trim()) return label;
  const num = key.replace(/^color0?/, "") || "1";
  return `Color ${parseInt(num, 10)}`;
}

function getThemeColor(key: string | undefined, palette: ColorPalette): string | undefined {
  if (!key || key === "__none__") return undefined;
  const hex = (palette as unknown as Record<string, string>)[key];
  return typeof hex === "string" ? hex : undefined;
}

/** Color swatch + Select for a single form style theme color. Shows chip so user can see the color. */
function FormColorField({
  label,
  value,
  onChange,
  themeColors,
  colorLabels,
  themeOptions,
  toSelectValue,
  fromSelectValue,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  themeColors: ColorPalette;
  colorLabels?: ColorLabels | null;
  themeOptions: { value: string; label: string }[];
  toSelectValue: (v: string | undefined) => string;
  fromSelectValue: (v: string) => string | undefined;
}) {
  const hex = getThemeColor(value, themeColors);
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <span
          className="h-8 w-8 shrink-0 rounded-md border border-input"
          style={{ backgroundColor: hex ?? "transparent" }}
          title={hex ?? "None"}
        />
        <Select value={toSelectValue(value)} onValueChange={(v) => onChange(fromSelectValue(v))}>
          <SelectTrigger className="h-9 flex-1 min-w-0">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            {themeOptions.map((o) => {
              const optionHex = o.value !== "__none__" ? getThemeColor(o.value, themeColors) : null;
              return (
                <SelectItem key={o.value} value={o.value}>
                  <span className="flex items-center gap-2">
                    {optionHex != null ? (
                      <span
                        className="h-4 w-4 shrink-0 rounded border border-input"
                        style={{ backgroundColor: optionHex }}
                      />
                    ) : null}
                    {o.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/** Mini form preview (label + input + submit) with a single form style applied. */
function FormStyleBlockPreview({
  style,
  themeColors,
}: {
  style: FormStyle;
  themeColors: ColorPalette;
}) {
  const { container, label: labelStyle, input: inputStyle, submit: submitStyle } = formStyleToCss(
    style,
    themeColors
  );
  return (
    <div
      className="rounded-md p-3 space-y-2 max-w-[220px]"
      style={Object.keys(container).length ? container : undefined}
    >
      <label
        className="block text-sm font-medium"
        style={Object.keys(labelStyle).length ? labelStyle : undefined}
      >
        Email
      </label>
      <input
        type="email"
        placeholder="you@example.com"
        readOnly
        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
        style={Object.keys(inputStyle).length ? inputStyle : undefined}
      />
      <button
        type="button"
        disabled
        className="rounded-md px-3 py-1.5 text-sm font-medium"
        style={Object.keys(submitStyle).length ? submitStyle : undefined}
      >
        Submit
      </button>
    </div>
  );
}

interface FormStylesSettingsProps {
  themeColors: ColorPalette;
  colorLabels?: ColorLabels | null;
  onSaved?: () => void;
}

export function FormStylesSettings(props: FormStylesSettingsProps) {
  const { themeColors, colorLabels, onSaved } = props;
  const [styles, setStyles] = useState<FormStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/form-styles");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setStyles(data);
      }
    } catch {
      setStyles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/form-styles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styles }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await load();
      onSaved?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateAt = (index: number, updates: Partial<FormStyle>) => {
    setStyles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const removeAt = (index: number) => {
    setStyles((prev) => prev.filter((_, i) => i !== index));
  };

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= styles.length) return;
    setStyles((prev) => {
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  const addStyle = () => {
    setStyles((prev) => [
      ...prev,
      { slug: `form-${prev.length + 1}`, label: "New form style" },
    ]);
  };

  const themeOptions = [
    { value: "__none__", label: "None" },
    ...BUTTON_THEME_COLOR_KEYS.map((k) => ({
      value: k,
      label: themeLabel(k, colorLabels),
    })),
  ];
  const toSelectValue = (v: string | undefined) => v ?? "__none__";
  const fromSelectValue = (v: string) => (v === "__none__" ? undefined : v);

  if (loading) {
    return (
      <div className="text-muted-foreground text-sm py-8">Loading form styles…</div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileInput className="h-4 w-4" />
                Form styles
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Define reusable form styles for the form shortcode. Use slug in shortcode (e.g. [[form:id|style=default]]). Colors use your theme palette for consistency.
              </CardDescription>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-3 w-3 mr-1.5" />
              {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {styles.length === 0 ? (
            <p className="text-muted-foreground text-sm">No form styles yet. Add one to use in the shortcode picker.</p>
          ) : (
            <ul className="space-y-4">
              {styles.map((s, i) => (
                <li
                  key={i}
                  className="rounded-lg border p-3 bg-muted/30 space-y-3"
                >
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="grid gap-1.5 flex-1 min-w-[100px]">
                      <Label className="text-xs">Label (picker)</Label>
                      <Input
                        value={s.label}
                        onChange={(e) => updateAt(i, { label: e.target.value })}
                        placeholder="Default"
                      />
                    </div>
                    <div className="grid gap-1.5 w-28">
                      <Label className="text-xs">Slug</Label>
                      <Input
                        value={s.slug}
                        onChange={(e) => updateAt(i, { slug: e.target.value.replace(/\s/g, "-") })}
                        placeholder="default"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => move(i, 1)}
                        disabled={i === styles.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeAt(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t">
                    <FormColorField
                      label="Container background"
                      value={s.backgroundColorTheme}
                      onChange={(v) => updateAt(i, { backgroundColorTheme: v })}
                      themeColors={themeColors}
                      colorLabels={colorLabels}
                      themeOptions={themeOptions}
                      toSelectValue={toSelectValue}
                      fromSelectValue={fromSelectValue}
                    />
                    <FormColorField
                      label="Border color"
                      value={s.borderColorTheme}
                      onChange={(v) => updateAt(i, { borderColorTheme: v })}
                      themeColors={themeColors}
                      colorLabels={colorLabels}
                      themeOptions={themeOptions}
                      toSelectValue={toSelectValue}
                      fromSelectValue={fromSelectValue}
                    />
                    <FormColorField
                      label="Label color"
                      value={s.labelColorTheme}
                      onChange={(v) => updateAt(i, { labelColorTheme: v })}
                      themeColors={themeColors}
                      colorLabels={colorLabels}
                      themeOptions={themeOptions}
                      toSelectValue={toSelectValue}
                      fromSelectValue={fromSelectValue}
                    />
                    <FormColorField
                      label="Input border"
                      value={s.inputBorderColorTheme}
                      onChange={(v) => updateAt(i, { inputBorderColorTheme: v })}
                      themeColors={themeColors}
                      colorLabels={colorLabels}
                      themeOptions={themeOptions}
                      toSelectValue={toSelectValue}
                      fromSelectValue={fromSelectValue}
                    />
                    <FormColorField
                      label="Submit button background"
                      value={s.submitBackgroundTheme}
                      onChange={(v) => updateAt(i, { submitBackgroundTheme: v })}
                      themeColors={themeColors}
                      colorLabels={colorLabels}
                      themeOptions={themeOptions}
                      toSelectValue={toSelectValue}
                      fromSelectValue={fromSelectValue}
                    />
                    <FormColorField
                      label="Submit button text"
                      value={s.submitColorTheme}
                      onChange={(v) => updateAt(i, { submitColorTheme: v })}
                      themeColors={themeColors}
                      colorLabels={colorLabels}
                      themeOptions={themeOptions}
                      toSelectValue={toSelectValue}
                      fromSelectValue={fromSelectValue}
                    />
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Border radius</Label>
                      <Input
                        value={s.borderRadius ?? ""}
                        onChange={(e) => updateAt(i, { borderRadius: e.target.value || undefined })}
                        placeholder="0.375rem"
                        className="font-mono text-xs h-9"
                      />
                    </div>
                  </div>
                  {/* Live preview for this form style */}
                  <div className="pt-3 border-t space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </h4>
                    <FormStyleBlockPreview style={s} themeColors={themeColors} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addStyle}>
            <Plus className="h-3 w-3 mr-1.5" />
            Add form style
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
