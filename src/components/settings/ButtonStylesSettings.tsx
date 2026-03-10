"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ButtonStyle, ColorLabels, ColorPalette } from "@/types/design-system";
import { MousePointer, Save, Plus, Trash2, ChevronUp, ChevronDown, Palette } from "lucide-react";
import {
  buttonStyleHasVisual,
  buttonStyleToInlineStyle,
} from "./ButtonStylesPreview";
import { ThemeOrCustomColorPicker } from "./ThemeOrCustomColorPicker";

interface ButtonStylesSettingsProps {
  themeColors: ColorPalette;
  colorLabels?: ColorLabels | null;
  /** Called after a successful save so parent can refetch (e.g. update Fonts/Colors preview). */
  onSaved?: () => void;
}

export function ButtonStylesSettings(props: ButtonStylesSettingsProps) {
  const { themeColors, colorLabels, onSaved } = props;
  const [styles, setStyles] = useState<ButtonStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/button-styles");
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
      const res = await fetch("/api/settings/button-styles", {
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

  const updateAt = (index: number, updates: Partial<ButtonStyle>) => {
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
      { slug: `style-${prev.length + 1}`, label: "New style", className: "btn-custom" },
    ]);
  };

  if (loading) {
    return (
      <div className="text-muted-foreground text-sm py-8">Loading button styles…</div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MousePointer className="h-4 w-4" />
                Button styles
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Define reusable button styles for the button shortcode. Use slug in shortcode (e.g. primary, outline). Theme CSS should define classes like .btn-primary, .btn-outline.
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
            <p className="text-muted-foreground text-sm">No button styles yet. Add one to use in the shortcode picker.</p>
          ) : (
            <ul className="space-y-4">
              {styles.map((s, i) => {
                const hasVisual = buttonStyleHasVisual(s);
                const inlineStyle = buttonStyleToInlineStyle(s, { colors: themeColors });
                return (
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
                          placeholder="Primary"
                        />
                      </div>
                      <div className="grid gap-1.5 w-28">
                        <Label className="text-xs">Slug</Label>
                        <Input
                          value={s.slug}
                          onChange={(e) => updateAt(i, { slug: e.target.value.replace(/\s/g, "-") })}
                          placeholder="primary"
                        />
                      </div>
                      <div className="grid gap-1.5 flex-1 min-w-[120px]">
                        <Label className="text-xs">CSS class (fallback)</Label>
                        <Input
                          value={s.className}
                          onChange={(e) => updateAt(i, { className: e.target.value })}
                          placeholder="btn-primary"
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground mr-1">Preview:</span>
                        <button
                          type="button"
                          className={
                            hasVisual
                              ? "text-sm font-medium rounded cursor-default shrink-0"
                              : `px-3 py-1.5 text-sm rounded border font-medium shrink-0 ${s.className}`
                          }
                          style={hasVisual ? inlineStyle : undefined}
                        >
                          {s.label || "Button"}
                        </button>
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
                    {/* Visual style editor */}
                    <div className="border-t pt-3 space-y-3">
                      <h4 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <Palette className="h-3.5 w-3.5" />
                        Customize appearance (optional)
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Set colors and sizes below to style this button without writing CSS. Leave blank to use the CSS class above. For an <strong>outline</strong> style: leave Background empty or set to <code className="rounded bg-muted px-1">transparent</code>, then set Border color, Border width (e.g. 1px), and Text color.
                      </p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="min-w-0">
                            <ThemeOrCustomColorPicker
                              label="Background"
                            themeKey={s.backgroundColorTheme}
                            customValue={s.backgroundColor}
                            customAlpha={s.backgroundColorAlpha}
                            onThemeChange={(key) =>
                              updateAt(i, {
                                backgroundColorTheme: key ?? undefined,
                                backgroundColor: undefined,
                                backgroundColorAlpha: undefined,
                              })
                            }
                            onCustomChange={(hex, a) =>
                              updateAt(i, {
                                backgroundColorTheme: undefined,
                                backgroundColor: hex ?? undefined,
                                backgroundColorAlpha: a ?? undefined,
                              })
                            }
                            themeColors={themeColors}
                            colorLabels={colorLabels}
                            placeholder="transparent"
                            fallbackHex="#3b82f6"
                          />
                        </div>
                        <div className="min-w-0">
                          <ThemeOrCustomColorPicker
                            label="Text color"
                            themeKey={s.colorTheme}
                            customValue={s.color}
                            customAlpha={s.colorAlpha}
                            onThemeChange={(key) =>
                              updateAt(i, {
                                colorTheme: key ?? undefined,
                                color: undefined,
                                colorAlpha: undefined,
                              })
                            }
                            onCustomChange={(hex, a) =>
                              updateAt(i, {
                                colorTheme: undefined,
                                color: hex ?? undefined,
                                colorAlpha: a ?? undefined,
                              })
                            }
                            themeColors={themeColors}
                            colorLabels={colorLabels}
                            placeholder="inherit"
                            fallbackHex="#ffffff"
                            />
                          </div>
                          <div className="min-w-0">
                            <ThemeOrCustomColorPicker
                              label="Border color"
                            themeKey={s.borderColorTheme}
                            customValue={s.borderColor}
                            customAlpha={s.borderColorAlpha}
                            onThemeChange={(key) =>
                              updateAt(i, {
                                borderColorTheme: key ?? undefined,
                                borderColor: undefined,
                                borderColorAlpha: undefined,
                              })
                            }
                            onCustomChange={(hex, a) =>
                              updateAt(i, {
                                borderColorTheme: undefined,
                                borderColor: hex ?? undefined,
                                borderColorAlpha: a ?? undefined,
                              })
                            }
                            themeColors={themeColors}
                            colorLabels={colorLabels}
                            placeholder="transparent"
                            fallbackHex="#000000"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="grid gap-1">
                            <Label className="text-xs">Border width</Label>
                            <Input
                              value={s.borderWidth ?? ""}
                              onChange={(e) => updateAt(i, { borderWidth: e.target.value || undefined })}
                              placeholder="1px"
                              className="font-mono text-xs"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">Border radius</Label>
                            <Input
                              value={s.borderRadius ?? ""}
                              onChange={(e) => updateAt(i, { borderRadius: e.target.value || undefined })}
                              placeholder="0.375rem"
                              className="font-mono text-xs"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">Padding X</Label>
                            <Input
                              value={s.paddingX ?? ""}
                              onChange={(e) => updateAt(i, { paddingX: e.target.value || undefined })}
                              placeholder="0.75rem"
                              className="font-mono text-xs"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">Padding Y</Label>
                            <Input
                              value={s.paddingY ?? ""}
                              onChange={(e) => updateAt(i, { paddingY: e.target.value || undefined })}
                              placeholder="0.5rem"
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addStyle}>
            <Plus className="h-3 w-3 mr-1.5" />
            Add style
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
