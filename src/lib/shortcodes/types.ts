/**
 * Shortcode type registry. Types can be loaded from public.shortcode_types (API) or fallback to this list.
 */

export interface ShortcodeType {
  id?: string;
  slug: string;
  label: string;
  icon: string;
  has_picker: boolean;
  picker_type: string | null;
  display_order: number;
}

/** Canonical shortcode picker list: Image, Gallery, Content, Button, fixed, Layout. */
export const SHORTCODE_TYPES_FALLBACK: ShortcodeType[] = [
  { slug: "media", label: "Image", icon: "Image", has_picker: true, picker_type: "media", display_order: 10 },
  { slug: "gallery", label: "Gallery", icon: "ImagePlus", has_picker: true, picker_type: "gallery", display_order: 20 },
  { slug: "content", label: "Content", icon: "FileText", has_picker: true, picker_type: "content", display_order: 30 },
  { slug: "button", label: "Button", icon: "MousePointer", has_picker: true, picker_type: "button", display_order: 40 },
  { slug: "separator", label: "Separator", icon: "Minus", has_picker: false, picker_type: null, display_order: 50 },
  { slug: "section_break", label: "Section Break", icon: "Layout", has_picker: false, picker_type: null, display_order: 60 },
  { slug: "spacer", label: "Spacer", icon: "Space", has_picker: false, picker_type: null, display_order: 70 },
  { slug: "clear", label: "Clear", icon: "Eraser", has_picker: false, picker_type: null, display_order: 80 },
  { slug: "layout", label: "Layout", icon: "LayoutGrid", has_picker: true, picker_type: "layout", display_order: 90 },
];
