"use client";

import { useState, useEffect, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { getTaxonomyTermsClient, getSectionConfigsClient } from "@/lib/supabase/taxonomy";
import { cn } from "@/lib/utils";
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  FolderTree,
  List,
  Settings,
  Loader2,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { TaxonomyCategoryDndRow } from "@/components/settings/TaxonomyCategoryDndRow";
import type { TaxonomyTerm, TaxonomyTermWithChildren, TaxonomyType, SectionTaxonomyConfig } from "@/types/taxonomy";
import { generateTaxonomySlug } from "@/types/taxonomy";

function depthPathForCategory(
  term: TaxonomyTerm,
  byId: Map<string, TaxonomyTerm>
): { depth: number; path: string[] } {
  const chain: TaxonomyTerm[] = [];
  let cur: TaxonomyTerm | undefined = term;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return { depth: Math.max(0, chain.length - 1), path: chain.map((c) => c.name) };
}

/** Depth-first rows for one home section: siblings by display_order then name. */
function buildTreeRowsForHomeSection(
  sectionName: string,
  filtered: TaxonomyTerm[]
): { term: TaxonomyTerm; depth: number; path: string[] }[] {
  const inSection = filtered.filter((t) => t.home_section_name === sectionName);
  if (inSection.length === 0) return [];
  const idSet = new Set(inSection.map((t) => t.id));
  const roots = inSection.filter((t) => !t.parent_id || !idSet.has(t.parent_id));
  roots.sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name)
  );
  const result: { term: TaxonomyTerm; depth: number; path: string[] }[] = [];
  const walk = (node: TaxonomyTerm, depth: number, pathPrefix: string[]) => {
    const nodePath = [...pathPrefix, node.name];
    result.push({ term: node, depth, path: nodePath });
    const children = inSection
      .filter((t) => t.parent_id === node.id)
      .sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name)
      );
    for (const ch of children) walk(ch, depth + 1, nodePath);
  };
  for (const r of roots) walk(r, 0, []);
  return result;
}

/** Returns dark or light text color for a hex background so pill text is readable. */
function textColorForBg(hex: string): string {
  const m = hex.match(/^#?([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/);
  if (!m) return "#fff";
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.5 ? "#1a1a1a" : "#fff";
}

export function TaxonomySettings({ isSuperadmin = false }: { isSuperadmin?: boolean }) {
  const [allTerms, setAllTerms] = useState<TaxonomyTerm[]>([]);
  const [categories, setCategories] = useState<TaxonomyTermWithChildren[]>([]);
  const [tags, setTags] = useState<TaxonomyTerm[]>([]);
  const [sections, setSections] = useState<SectionTaxonomyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "categories" | "tags">("sections");
  const [showTermForm, setShowTermForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TaxonomyTerm | null>(null);
  const [editingSection, setEditingSection] = useState<SectionTaxonomyConfig | null>(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionSearch, setSectionSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [termListSectionFilter, setTermListSectionFilter] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    parent_id: "",
    type: "category" as TaxonomyType,
    suggested_sections: [] as string[],
    /** Categories only: single home taxonomy section. */
    home_section_name: "",
    color: "",
    is_core: false,
  });
  /** When section filter is on: sibling order overrides by parent key (ROOT or parent uuid). */
  const [pendingSiblingOrder, setPendingSiblingOrder] = useState<Record<string, string[]>>({});
  const [savingCategoryOrder, setSavingCategoryOrder] = useState(false);
  /** Categories table: tree = drag + default depth order; name/slug/home = column sort. */
  const [categorySortColumn, setCategorySortColumn] = useState<"tree" | "name" | "slug" | "home">("tree");
  const [categorySortDir, setCategorySortDir] = useState<"asc" | "desc">("asc");
  const [sectionFormData, setSectionFormData] = useState({
    section_name: "",
    display_name: "",
    // Removed: content_type - not functionally used
    category_slugs: [] as string[],
    tag_slugs: [] as string[],
    is_core: false,
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    setPendingSiblingOrder({});
  }, [termListSectionFilter]);

  const loadAllData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Load taxonomy data (tries RPC first, falls back to direct query)
      let terms: TaxonomyTerm[] = [];
      let sectionsData: SectionTaxonomyConfig[] = [];
      
      try {
        terms = await getTaxonomyTermsClient();
      } catch (termsError) {
        console.error("Failed to load taxonomy terms:", termsError);
        // Try direct query as last resort (use client schema)
        const supabase = createClientSupabaseClient();
        const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA;
        const { data: termsData, error: termsQueryError } = await supabase
          .schema(schema || "public")
          .from("taxonomy_terms")
          .select("*")
          .order("name", { ascending: true });
        
        if (termsQueryError) {
          throw new Error(`Failed to load taxonomy terms: ${termsQueryError.message || JSON.stringify(termsQueryError)}`);
        }
        terms = termsData || [];
      }

      try {
        sectionsData = await getSectionConfigsClient();
      } catch (sectionsError) {
        console.error("Failed to load sections:", sectionsError);
        // Try direct query as last resort (use client schema)
        const supabase = createClientSupabaseClient();
        const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA;
        const { data: sectionsDataDirect, error: sectionsQueryError } = await supabase
          .schema(schema || "public")
          .from("section_taxonomy_config")
          .select("*")
          .order("display_name", { ascending: true });
        
        if (sectionsQueryError) {
          throw new Error(`Failed to load sections: ${sectionsQueryError.message || JSON.stringify(sectionsQueryError)}`);
        }
        sectionsData = sectionsDataDirect || [];
      }

      setAllTerms(terms);
      setSections(sectionsData);

      // Separate categories and tags
      const cats = (terms || []).filter((t) => t.type === "category");
      const tgs = (terms || []).filter((t) => t.type === "tag");

      // Build hierarchical structure for categories
      const categoryMap = new Map<string, TaxonomyTermWithChildren>();
      const rootCategories: TaxonomyTermWithChildren[] = [];

      cats.forEach((cat) => {
        categoryMap.set(cat.id, { ...cat, children: [] });
      });

      cats.forEach((cat) => {
        const category = categoryMap.get(cat.id)!;
        if (cat.parent_id && categoryMap.has(cat.parent_id)) {
          const parent = categoryMap.get(cat.parent_id)!;
          if (!parent.children) parent.children = [];
          parent.children.push(category);
        } else {
          rootCategories.push(category);
        }
      });

      const sortCategoryTree = (nodes: TaxonomyTermWithChildren[]): TaxonomyTermWithChildren[] =>
        [...nodes]
          .sort(
            (a, b) =>
              (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name)
          )
          .map((n) => ({
            ...n,
            children: n.children?.length ? sortCategoryTree(n.children) : [],
          }));

      setCategories(sortCategoryTree(rootCategories));
      setTags(tgs);
    } catch (error) {
      console.error("Error loading taxonomy:", error);
      let errorMessage = "Unknown error";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        // Try to extract message from Supabase error
        const supabaseError = error as any;
        errorMessage = supabaseError.message || 
                      supabaseError.error?.message || 
                      supabaseError.details ||
                      JSON.stringify(error, Object.getOwnPropertyNames(error));
      } else {
        errorMessage = String(error);
      }
      
      console.error("Full error details:", {
        error,
        errorMessage,
        type: typeof error,
        keys: error && typeof error === 'object' ? Object.keys(error) : [],
        stringified: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      
      alert(`Failed to load taxonomy: ${errorMessage}\n\nCheck browser console for details.`);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const rebuildAllSectionCategorySlugs = async (
    supabase: ReturnType<typeof createClientSupabaseClient>,
    schema: string
  ) => {
    const { data: secs } = await supabase
      .schema(schema)
      .from("section_taxonomy_config")
      .select("id, section_name");
    const { data: cats } = await supabase
      .schema(schema)
      .from("taxonomy_terms")
      .select("slug, home_section_name, display_order, name")
      .eq("type", "category");
    for (const s of secs || []) {
      const slugs = (cats || [])
        .filter((c) => c.home_section_name === s.section_name)
        .sort(
          (a, b) =>
            (a.display_order ?? 0) - (b.display_order ?? 0) ||
            (a.name || "").localeCompare(b.name || "")
        )
        .map((c) => c.slug);
      await supabase
        .schema(schema)
        .from("section_taxonomy_config")
        .update({ category_slugs: slugs })
        .eq("id", s.id);
    }
  };

  const handleCreateOrUpdateTerm = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    if (saving) return; // Prevent multiple submissions

    // Core terms: slug is fixed (use existing)
    const slug = editingTerm?.is_core ? editingTerm.slug : (formData.slug.trim() || generateTaxonomySlug(formData.name));
    const type = editingTerm?.type || formData.type;

    if (type === "category" && !formData.home_section_name.trim()) {
      alert("Select a home taxonomy section for this category.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClientSupabaseClient();
      const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "public";

      // Uniqueness: same type, same slug, excluding current when editing
      const { data: existing } = await supabase
        .schema(schema)
        .from("taxonomy_terms")
        .select("id")
        .eq("type", type)
        .eq("slug", slug);
      const duplicate = (existing || []).find((r) => !editingTerm || r.id !== editingTerm.id);
      if (duplicate) {
        alert(`A ${type} with slug "${slug}" already exists. Use a different slug.`);
        setSaving(false);
        return;
      }

      const termData: Record<string, unknown> = {
        name: formData.name.trim(),
        slug,
        type,
        parent_id: type === "category" ? (formData.parent_id || null) : null,
        description: formData.description.trim() || null,
        color: formData.color.trim() || null,
      };
      if (isSuperadmin) {
        termData.is_core = !!formData.is_core;
      }

      if (type === "category") {
        const home = formData.home_section_name.trim();
        termData.home_section_name = home;
        termData.suggested_sections = [home];
        if (!editingTerm) {
          let sibQuery = supabase
            .schema(schema)
            .from("taxonomy_terms")
            .select("display_order")
            .eq("type", "category")
            .eq("home_section_name", home);
          if (formData.parent_id) {
            sibQuery = sibQuery.eq("parent_id", formData.parent_id);
          } else {
            sibQuery = sibQuery.is("parent_id", null);
          }
          const { data: sibs } = await sibQuery;
          const max = Math.max(0, ...(sibs || []).map((s) => (s.display_order as number) ?? 0));
          termData.display_order = max + 10;
        }
      } else {
        termData.suggested_sections =
          formData.suggested_sections.length > 0 ? formData.suggested_sections : null;
      }

      const oldSlug = editingTerm?.slug ?? null;

      if (editingTerm) {
        const { error } = await supabase
          .schema(schema)
          .from("taxonomy_terms")
          .update(termData)
          .eq("id", editingTerm.id);
        if (error) throw error;

        // Cascade: update section_taxonomy_config when slug changed (never for core terms)
        if (!editingTerm.is_core && oldSlug && oldSlug !== slug) {
          const { data: configs } = await supabase
            .schema(schema)
            .from("section_taxonomy_config")
            .select("id, category_slugs, tag_slugs");
          for (const row of configs || []) {
            const isCat = type === "category";
            const arr = isCat ? row.category_slugs : row.tag_slugs;
            if (!Array.isArray(arr) || !arr.includes(oldSlug)) continue;
            const next = arr.map((s) => (s === oldSlug ? slug : s));
            await supabase
              .schema(schema)
              .from("section_taxonomy_config")
              .update(isCat ? { category_slugs: next } : { tag_slugs: next })
              .eq("id", row.id);
          }
        }
      } else {
        const { error } = await supabase
          .schema(schema)
          .from("taxonomy_terms")
          .insert(termData);
        if (error) throw error;
      }

      if (type === "category") {
        await rebuildAllSectionCategorySlugs(supabase, schema);
      }

      // Tags: add slug to each selected section's tag_slugs
      if (type === "tag" && formData.suggested_sections.length > 0) {
        const { data: configs } = await supabase
          .schema(schema)
          .from("section_taxonomy_config")
          .select("id, section_name, tag_slugs")
          .in("section_name", formData.suggested_sections);
        for (const row of configs || []) {
          const base = Array.isArray(row.tag_slugs) && row.tag_slugs.length > 0 ? row.tag_slugs : [];
          if (base.includes(slug)) continue;
          await supabase
            .schema(schema)
            .from("section_taxonomy_config")
            .update({ tag_slugs: [...base, slug] })
            .eq("id", row.id);
        }
      }

      resetForm();
      setShowTermForm(false);
      await loadAllData(false);
      // So new tag is visible even when a section filter is applied
      if (type === "tag") {
        setTermListSectionFilter("");
      }
    } catch (error) {
      console.error("Error saving term:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
        : String(error);
      alert(`Failed to save: ${errorMessage}`);
      // Refresh list anyway so any partial success (e.g. term inserted) is visible
      await loadAllData(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (term: TaxonomyTerm) => {
    if (term.slug === "uncategorized") {
      alert("Cannot delete the 'Uncategorized' category");
      return;
    }
    if (term.is_core) {
      alert("Cannot delete a Core term. Core terms are system-required; only the label (name) can be edited.");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${term.name}"?`)) {
      return;
    }

    // If deleting the item currently being edited, reset the form
    if (editingTerm?.id === term.id) {
      resetForm();
    }

    try {
      const supabase = createClientSupabaseClient();
      const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "public";
      
      await supabase
        .schema(schema)
        .from("taxonomy_relationships")
        .delete()
        .eq("term_id", term.id);
      
      const { error } = await supabase
        .schema(schema)
        .from("taxonomy_terms")
        .delete()
        .eq("id", term.id);
      if (error) throw error;

      if (term.type === "category") {
        const { data: uncategorized } = await supabase
          .schema(schema)
          .from("taxonomy_terms")
          .select("id")
          .eq("slug", "uncategorized")
          .single();

        if (uncategorized) {
          const { data: relationships } = await supabase
            .schema(schema)
            .from("taxonomy_relationships")
            .select("content_type, content_id")
            .eq("term_id", term.id);

          if (relationships && relationships.length > 0) {
            for (const rel of relationships) {
              await supabase
                .schema(schema)
                .from("taxonomy_relationships")
                .upsert({
                  term_id: uncategorized.id,
                  content_type: rel.content_type,
                  content_id: rel.content_id,
                });
            }
          }
        }
      }

      // Reload data without showing full loading state
      await loadAllData(false);
    } catch (error) {
      console.error("Error deleting term:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
        : String(error);
      alert(`Failed to delete: ${errorMessage}`);
    }
  };

  const handleSaveSectionConfig = async () => {
    if (!sectionFormData.section_name.trim() || !sectionFormData.display_name.trim()) {
      alert("Section name and display name are required");
      return;
    }

    if (saving) return; // Prevent multiple submissions

    setSaving(true);
    try {
      const supabase = createClientSupabaseClient();
      const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "public";

      // When editing a core or staple section, slug is locked
      const newSectionName =
        (editingSection?.is_core || editingSection?.is_staple)
          ? editingSection.section_name
          : sectionFormData.section_name.trim();
      const configData = {
        section_name: newSectionName,
        display_name: sectionFormData.display_name.trim(),
        content_type: "section", // Default value - not used functionally, but required by DB
        category_slugs: sectionFormData.category_slugs.length > 0 ? sectionFormData.category_slugs : null,
        tag_slugs: sectionFormData.tag_slugs.length > 0 ? sectionFormData.tag_slugs : null,
        is_core: sectionFormData.is_core,
        // Superadmin can unprotect template sections: sync is_staple with Core checkbox
        ...(isSuperadmin ? { is_staple: sectionFormData.is_core } : {}),
      };

      if (editingSection) {
        // Uniqueness: another section with same section_name, excluding current
        const { data: existing } = await supabase
          .schema(schema)
          .from("section_taxonomy_config")
          .select("id")
          .eq("section_name", newSectionName);
        const duplicate = (existing || []).find((r) => r.id !== editingSection.id);
        if (duplicate) {
          alert(`A section with slug "${newSectionName}" already exists. Use a different section name.`);
          setSaving(false);
          return;
        }

        const oldSectionName = editingSection.section_name;

        const { error } = await supabase
          .schema(schema)
          .from("section_taxonomy_config")
          .update(configData)
          .eq("id", editingSection.id);
        if (error) throw error;

        // Cascade: update taxonomy_terms.suggested_sections when section_name changed
        if (oldSectionName !== newSectionName) {
          const { data: terms } = await supabase
            .schema(schema)
            .from("taxonomy_terms")
            .select("id, suggested_sections");
          for (const row of terms || []) {
            const arr = row.suggested_sections;
            if (!Array.isArray(arr) || !arr.includes(oldSectionName)) continue;
            const next = arr.map((s) => (s === oldSectionName ? newSectionName : s));
            await supabase
              .schema(schema)
              .from("taxonomy_terms")
              .update({ suggested_sections: next })
              .eq("id", row.id);
          }
        }
      } else {
        // Uniqueness for create
        const { data: existing } = await supabase
          .schema(schema)
          .from("section_taxonomy_config")
          .select("id")
          .eq("section_name", newSectionName);
        if ((existing || []).length > 0) {
          alert(`A section with slug "${newSectionName}" already exists. Use a different section name.`);
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .schema(schema)
          .from("section_taxonomy_config")
          .insert(configData);
        if (error) throw error;
      }

      resetSectionForm();
      await loadAllData(false);
    } catch (error) {
      console.error("Error saving section config:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
        : String(error);
      alert(`Failed to save section configuration: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (section: SectionTaxonomyConfig) => {
    if (section.is_core) {
      alert("Core sections cannot be removed.");
      return;
    }
    if (section.is_staple) {
      alert("Template sections cannot be removed.");
      return;
    }
    if (!confirm(`Are you sure you want to delete section "${section.display_name}"? Its category/tag assignments will be removed.`)) {
      return;
    }

    if (editingSection?.id === section.id) {
      resetSectionForm();
    }

    setSaving(true);
    try {
      const supabase = createClientSupabaseClient();
      const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "public";
      const sectionName = section.section_name;

      const { data: terms } = await supabase
        .schema(schema)
        .from("taxonomy_terms")
        .select("id, suggested_sections");
      for (const row of terms || []) {
        const arr = row.suggested_sections;
        if (!Array.isArray(arr) || !arr.includes(sectionName)) continue;
        const next = arr.filter((s) => s !== sectionName);
        await supabase
          .schema(schema)
          .from("taxonomy_terms")
          .update({ suggested_sections: next.length > 0 ? next : null })
          .eq("id", row.id);
      }

      const { error } = await supabase
        .schema(schema)
        .from("section_taxonomy_config")
        .delete()
        .eq("id", section.id);
      if (error) throw error;

      await loadAllData(false);
    } catch (error) {
      console.error("Error deleting section:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
        : String(error);
      alert(`Failed to delete section: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingTerm(null);
    setShowTermForm(false);
    setSlugManuallyEdited(false);
    setFormData({
      name: "",
      slug: "",
      description: "",
      parent_id: "",
      type: "category",
      suggested_sections: [],
      home_section_name: "",
      color: "",
      is_core: false,
    });
  };

  const resetSectionForm = () => {
    setEditingSection(null);
    setShowSectionForm(false);
    setSectionFormData({
      section_name: "",
      display_name: "",
      category_slugs: [],
      tag_slugs: [],
      is_core: false,
    });
  };

  const handleNewSection = () => {
    // Reset term form if it's open
    if (editingTerm || showTermForm) {
      resetForm();
    }
    resetSectionForm();
    setShowSectionForm(true);
    setActiveTab("sections");
  };

  const handleNewCategory = () => {
    // Reset section form if it's open
    if (editingSection || showSectionForm) {
      resetSectionForm();
    }
    resetForm();
    setFormData((prev) => ({
      ...prev,
      type: "category",
      home_section_name: termListSectionFilter || "",
    }));
    setShowTermForm(true);
    setActiveTab("categories");
  };

  const handleNewTag = () => {
    // Reset section form if it's open
    if (editingSection || showSectionForm) {
      resetSectionForm();
    }
    resetForm();
    setFormData((prev) => ({ ...prev, type: "tag" }));
    setShowTermForm(true);
    setActiveTab("tags");
  };

  const flattenCategories = (cats: TaxonomyTermWithChildren[]): TaxonomyTerm[] => {
    const result: TaxonomyTerm[] = [];
    const traverse = (items: TaxonomyTermWithChildren[]) => {
      items.forEach((item) => {
        const { children: _c, ...rest } = item;
        result.push(rest);
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      });
    };
    traverse(cats);
    return result;
  };

  /** Plain text list of section display names (categories list: Content Type Sections column). */
  const getSectionNamesText = (term: TaxonomyTerm) => {
    if (!term.suggested_sections || term.suggested_sections.length === 0) {
      return <span className="text-xs text-muted-foreground">No sections</span>;
    }
    const names = term.suggested_sections
      .map((sectionSlug) => sections.find((s) => s.section_name === sectionSlug)?.display_name || sectionSlug);
    return <span className="text-xs text-muted-foreground">{names.join(", ")}</span>;
  };

  const getFilteredSections = () => {
    if (!sectionSearch.trim()) return sections;
    const query = sectionSearch.toLowerCase();
    return sections.filter((section) =>
      section.display_name.toLowerCase().includes(query) ||
      section.section_name.toLowerCase().includes(query)
    );
  };

  const getFilteredCategories = () => {
    let flatCats = flattenCategories(categories);

    if (termListSectionFilter) {
      const sec = sections.find((s) => s.section_name === termListSectionFilter);
      const slugSet = new Set(sec?.category_slugs || []);
      flatCats = flatCats.filter((cat) => {
        if (cat.home_section_name === termListSectionFilter) return true;
        if (!cat.home_section_name && slugSet.has(cat.slug)) return true;
        return false;
      });
    }

    if (!categorySearch.trim()) return flatCats;
    const query = categorySearch.toLowerCase();
    const matches = flatCats.filter((cat) =>
      cat.name.toLowerCase().includes(query) ||
      cat.slug.toLowerCase().includes(query)
    );
    const matchIds = new Set(matches.map((m) => m.id));
    let added = true;
    while (added) {
      added = false;
      flatCats.forEach((cat) => {
        if (cat.parent_id && matchIds.has(cat.id) && !matchIds.has(cat.parent_id)) {
          matchIds.add(cat.parent_id);
          added = true;
        }
      });
    }
    return flatCats.filter((cat) => matchIds.has(cat.id));
  };

  /** Depth-first list with indent depth and path for tooltip. Visual indent capped at 5 levels. */
  const MAX_VISUAL_DEPTH = 5;
  const INDENT_CH_PER_LEVEL = 3;

  const getFilteredCategoriesWithDepth = (): { term: TaxonomyTerm; depth: number; path: string[] }[] => {
    const included = getFilteredCategories();
    const includedIds = new Set(included.map((t) => t.id));
    const termById = new Map(included.map((t) => [t.id, t]));

    const siblingKey = (parentId: string | null) => (parentId ? parentId : "ROOT");
    const sortSiblings = (nodes: TaxonomyTermWithChildren[], parentId: string | null) => {
      const key = siblingKey(parentId);
      const custom = pendingSiblingOrder[key];
      const cmp = (a: TaxonomyTermWithChildren, b: TaxonomyTermWithChildren) =>
        (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name);
      if (!custom?.length) return [...nodes].sort(cmp);
      const byId = new Map(nodes.map((n) => [n.id, n]));
      const ordered = custom.map((id) => byId.get(id)).filter(Boolean) as TaxonomyTermWithChildren[];
      const rest = nodes.filter((n) => !custom.includes(n.id)).sort(cmp);
      return [...ordered, ...rest];
    };

    const result: { term: TaxonomyTerm; depth: number; path: string[] }[] = [];
    const traverse = (nodes: TaxonomyTermWithChildren[], depth: number, path: string[], parentId: string | null) => {
      const sorted = sortSiblings(nodes, parentId);
      for (const node of sorted) {
        const nodePath = path.concat(node.name);
        if (includedIds.has(node.id)) {
          const term = termById.get(node.id) ?? ({ ...node, children: undefined } as TaxonomyTerm);
          result.push({ term, depth, path: nodePath });
        }
        traverse(node.children ?? [], depth + 1, nodePath, node.id);
      }
    };
    traverse(
      categories.filter((c) => !c.parent_id),
      0,
      [],
      null
    );
    return result;
  };

  const onCategorySortHeader = (col: "name" | "slug" | "home") => {
    setPendingSiblingOrder({});
    if (col === "home" && termListSectionFilter) {
      setCategorySortColumn("tree");
      setCategorySortDir("asc");
      return;
    }
    if (categorySortColumn === col) {
      if (categorySortDir === "asc") {
        setCategorySortDir("desc");
      } else {
        setCategorySortColumn("tree");
        setCategorySortDir("asc");
      }
    } else {
      setCategorySortColumn(col);
      setCategorySortDir("asc");
    }
  };

  const getCategoryTableRows = (): { term: TaxonomyTerm; depth: number; path: string[] }[] => {
    const filtered = getFilteredCategories();
    const allById = new Map(flattenCategories(categories).map((t) => [t.id, t]));
    const dir = categorySortDir === "asc" ? 1 : -1;

    if (categorySortColumn === "tree") {
      return getFilteredCategoriesWithDepth();
    }

    if (categorySortColumn === "home") {
      if (termListSectionFilter) {
        return getFilteredCategoriesWithDepth();
      }
      const orderedSecs = [...sections].sort((a, b) => dir * a.display_name.localeCompare(b.display_name));
      const out: { term: TaxonomyTerm; depth: number; path: string[] }[] = [];
      for (const sec of orderedSecs) {
        out.push(...buildTreeRowsForHomeSection(sec.section_name, filtered));
      }
      return out;
    }

    if (categorySortColumn === "name" || categorySortColumn === "slug") {
      const key = categorySortColumn === "name" ? "name" : "slug";
      const rows = filtered.map((term) => ({
        term,
        ...depthPathForCategory(term, allById),
      }));
      rows.sort((a, b) => dir * a.term[key].localeCompare(b.term[key], undefined, { sensitivity: "base" }));
      return rows;
    }

    return getFilteredCategoriesWithDepth();
  };

  const handleCategoryReorder = useCallback(
    (draggedId: string, targetId: string, parentId: string | null) => {
      const key = parentId ? parentId : "ROOT";
      const included = new Set(
        (() => {
          let flat = flattenCategories(categories);
          if (termListSectionFilter) {
            const sec = sections.find((s) => s.section_name === termListSectionFilter);
            const slugSet = new Set(sec?.category_slugs || []);
            flat = flat.filter((cat) => {
              if (cat.home_section_name === termListSectionFilter) return true;
              if (!cat.home_section_name && slugSet.has(cat.slug)) return true;
              return false;
            });
          }
          if (categorySearch.trim()) {
            const q = categorySearch.toLowerCase();
            const matches = flat.filter(
              (cat) => cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q)
            );
            const matchIds = new Set(matches.map((m) => m.id));
            let added = true;
            while (added) {
              added = false;
              flat.forEach((cat) => {
                if (cat.parent_id && matchIds.has(cat.id) && !matchIds.has(cat.parent_id)) {
                  matchIds.add(cat.parent_id);
                  added = true;
                }
              });
            }
            flat = flat.filter((cat) => matchIds.has(cat.id));
          }
          return flat.map((c) => c.id);
        })()
      );
      const sortLeef = (arr: TaxonomyTermWithChildren[]) =>
        [...arr]
          .filter((n) => included.has(n.id))
          .sort(
            (a, b) =>
              (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name)
          )
          .map((n) => n.id);
      const getDefault = (): string[] => {
        if (!parentId) return sortLeef(categories.filter((c) => !c.parent_id));
        const findChildrenOf = (nodes: TaxonomyTermWithChildren[]): TaxonomyTermWithChildren[] | undefined => {
          for (const n of nodes) {
            if (n.id === parentId) return n.children || [];
            const d = findChildrenOf(n.children || []);
            if (d !== undefined) return d;
          }
          return undefined;
        };
        const ch = findChildrenOf(categories);
        return ch !== undefined ? sortLeef(ch) : [];
      };
      setPendingSiblingOrder((prev) => {
        const current = [...(prev[key] ?? getDefault())];
        const fi = current.indexOf(draggedId);
        const ti = current.indexOf(targetId);
        if (fi < 0 || ti < 0) return prev;
        current.splice(fi, 1);
        current.splice(ti, 0, draggedId);
        return { ...prev, [key]: current };
      });
    },
    [categories, termListSectionFilter, categorySearch, sections]
  );

  const handleSaveCategoryOrder = async () => {
    if (!termListSectionFilter || Object.keys(pendingSiblingOrder).length === 0) return;
    setSavingCategoryOrder(true);
    try {
      const supabase = createClientSupabaseClient();
      const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "public";
      for (const ids of Object.values(pendingSiblingOrder)) {
        for (let i = 0; i < ids.length; i++) {
          const { error } = await supabase
            .schema(schema)
            .from("taxonomy_terms")
            .update({ display_order: (i + 1) * 10 })
            .eq("id", ids[i])
            .eq("type", "category");
          if (error) throw error;
        }
      }
      await rebuildAllSectionCategorySlugs(supabase, schema);
      setPendingSiblingOrder({});
      await loadAllData(false);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to save order");
    } finally {
      setSavingCategoryOrder(false);
    }
  };

  const getFilteredTags = () => {
    let list = tags;

    if (termListSectionFilter) {
      const sec = sections.find((s) => s.section_name === termListSectionFilter);
      const slugs = sec?.tag_slugs;
      if (Array.isArray(slugs) && slugs.length > 0) {
        const set = new Set(slugs);
        list = list.filter((tag) => set.has(tag.slug));
      } else {
        list = [];
      }
    }

    if (!tagSearch.trim()) return list;
    const query = tagSearch.toLowerCase();
    return list.filter((tag) =>
      tag.name.toLowerCase().includes(query) ||
      tag.slug.toLowerCase().includes(query)
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading taxonomy...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sections" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Taxonomy Sections
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </TabsTrigger>
        </TabsList>

        {/* Sections Tab */}
        <TabsContent value="sections" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Taxonomy Sections</CardTitle>
                  <CardDescription>Configure which categories and tags each taxonomy section uses</CardDescription>
                </div>
                <Button onClick={handleNewSection}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sections List - Compact Table Style */}
                <div>
                  <div className="space-y-3">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search content type sections by name or slug..."
                        value={sectionSearch}
                        onChange={(e) => setSectionSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Scrollable Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-muted sticky top-0 z-10">
                            <tr>
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Display Name</th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Slug</th>
                              {/* REMOVED: Content Type column */}
                              <th
                                className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground"
                                title="Categories whose home section is this row (includes hierarchy in that section)."
                              >
                                Categories
                              </th>
                              <th
                                className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground"
                                title="Tags assigned to this section; the same tag may appear in multiple sections."
                              >
                                Tags
                              </th>
                              <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getFilteredSections().length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                                  {sectionSearch ? "No sections match your search" : "No sections configured"}
                                </td>
                              </tr>
                            ) : (
                              getFilteredSections().map((section) => (
                                <tr key={section.id} className="border-t hover:bg-accent">
                                  <td className="px-3 py-1.5 text-sm">{section.display_name}</td>
                                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{section.section_name}</td>
                                  {/* REMOVED: content_type display */}
                                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                                    {allTerms.filter(
                                      (t) =>
                                        t.type === "category" &&
                                        t.home_section_name === section.section_name
                                    ).length}
                                  </td>
                                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                                    {Array.isArray(section.tag_slugs) ? section.tag_slugs.length : 0}
                                  </td>
                                  <td className="px-3 py-1.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => {
                                          if (editingTerm || showTermForm) resetForm();
                                          setEditingSection(section);
                                          setShowSectionForm(true);
                                          setSectionFormData({
                                            section_name: section.section_name,
                                            display_name: section.display_name,
                                            category_slugs: section.category_slugs || [],
                                            tag_slugs: section.tag_slugs || [],
                                            // Show Core checked when protected by is_core OR is_staple (template sections)
                                            is_core: !!section.is_core || !!section.is_staple,
                                          });
                                        }}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                          "h-7 w-7 p-0",
                                          (section.is_core || section.is_staple) && "opacity-40 cursor-not-allowed"
                                        )}
                                        onClick={() => handleDeleteSection(section)}
                                        disabled={saving || !!section.is_core || !!section.is_staple}
                                        title={
                                          section.is_core
                                            ? "Core sections cannot be removed"
                                            : section.is_staple
                                              ? "Template sections cannot be removed"
                                              : "Delete section"
                                        }
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Form Modal */}
          <Dialog
            open={showSectionForm || !!editingSection}
            onOpenChange={(open) => {
              if (!open) {
                resetSectionForm();
              }
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSection ? "Edit Taxonomy Section" : "Add New Taxonomy Section"}
                </DialogTitle>
                <DialogDescription>
                  Set the display name and slug for this taxonomy section. Categories and tags can be created and assigned separately.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Display Name *</Label>
                  <Input
                    value={sectionFormData.display_name}
                    onChange={(e) =>
                      setSectionFormData({ ...sectionFormData, display_name: e.target.value })
                    }
                    placeholder="Blog"
                  />
                </div>
                <div>
                  <Label>Section Name (slug) *</Label>
                  <Input
                    value={sectionFormData.section_name}
                    onChange={(e) =>
                      setSectionFormData({ ...sectionFormData, section_name: e.target.value })
                    }
                    placeholder="blog"
                    disabled={sectionFormData.is_core}
                    title={sectionFormData.is_core ? "Core sections have a locked slug" : undefined}
                  />
                </div>
                {/* Categories are created and assigned separately; no picker here */}
                <div>
                  <Label>Tags</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select specific tags (leave empty to use suggested sections from terms)
                  </p>
                  <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                    {allTerms
                      .filter((t) => t.type === "tag")
                      .map((term) => (
                        <label key={term.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sectionFormData.tag_slugs.includes(term.slug)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSectionFormData({
                                  ...sectionFormData,
                                  tag_slugs: [...sectionFormData.tag_slugs, term.slug],
                                });
                              } else {
                                setSectionFormData({
                                  ...sectionFormData,
                                  tag_slugs: sectionFormData.tag_slugs.filter((s) => s !== term.slug),
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{term.name}</span>
                        </label>
                      ))}
                  </div>
                </div>
                {isSuperadmin && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="section-is-core"
                      checked={sectionFormData.is_core}
                      onChange={(e) =>
                        setSectionFormData({ ...sectionFormData, is_core: e.target.checked })
                      }
                      className="rounded"
                    />
                    <Label htmlFor="section-is-core" className="cursor-pointer">
                      Core (system-required: slug locked, only label editable, cannot delete)
                    </Label>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetSectionForm} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSectionConfig} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingSection ? (
                    "Update Taxonomy Section"
                  ) : (
                    "Create Taxonomy Section"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categories</CardTitle>
                  <CardDescription>
                    Sort by column headers (Name, Slug, Home section). Home section groups by section, then parent/child
                    order. Click a header twice to reverse; third click restores default tree order. Drag-reorder when a
                    section is selected and sort is default.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {termListSectionFilter && Object.keys(pendingSiblingOrder).length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={handleSaveCategoryOrder}
                      disabled={savingCategoryOrder}
                    >
                      {savingCategoryOrder ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save order"
                      )}
                    </Button>
                  )}
                  <Button onClick={handleNewCategory}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Categories List - Compact Table Style */}
                <div>
                  <div className="space-y-3">
                    {/* Search + Section filter */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search categories by name or slug..."
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Label htmlFor="category-section-scope" className="text-sm font-medium whitespace-nowrap">
                          Taxonomy Section
                        </Label>
                        <select
                          id="category-section-scope"
                          value={termListSectionFilter}
                          onChange={(e) => setTermListSectionFilter(e.target.value)}
                          className="w-[180px] px-3 py-2 border border-input rounded-md bg-background text-sm"
                        >
                          <option value="">All sections</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.section_name}>
                              {s.display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Scrollable Table */}
                    <DndProvider backend={HTML5Backend}>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-[500px] overflow-y-auto">
                          <table className="w-full">
                            <thead className="bg-muted sticky top-0 z-10">
                              <tr>
                                <th className="w-8 px-1 py-1.5" aria-label="Reorder" />
                                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-0.5 hover:text-foreground"
                                    onClick={() => onCategorySortHeader("name")}
                                  >
                                    Name
                                    {categorySortColumn === "name" &&
                                      (categorySortDir === "asc" ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      ))}
                                  </button>
                                </th>
                                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-0.5 hover:text-foreground"
                                    onClick={() => onCategorySortHeader("slug")}
                                  >
                                    Slug
                                    {categorySortColumn === "slug" &&
                                      (categorySortDir === "asc" ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      ))}
                                  </button>
                                </th>
                                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-0.5 hover:text-foreground"
                                    onClick={() => onCategorySortHeader("home")}
                                    title={
                                      termListSectionFilter
                                        ? "With one section selected, list stays in tree order"
                                        : "Group by home section, then category order (parent/child)"
                                    }
                                  >
                                    Home section
                                    {categorySortColumn === "home" &&
                                      !termListSectionFilter &&
                                      (categorySortDir === "asc" ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      ))}
                                  </button>
                                </th>
                                <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {getCategoryTableRows().length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                                    {categorySearch || termListSectionFilter
                                      ? "No categories match your search and filters"
                                      : "No categories found"}
                                  </td>
                                </tr>
                              ) : (
                                getCategoryTableRows().map(({ term, depth, path }) => {
                                  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);
                                  const indentCh = visualDepth * INDENT_CH_PER_LEVEL;
                                  const showPathTooltip = path.length > MAX_VISUAL_DEPTH;
                                  const homeLabel =
                                    term.home_section_name &&
                                    sections.find((s) => s.section_name === term.home_section_name)
                                      ?.display_name;
                                  return (
                                    <TaxonomyCategoryDndRow
                                      key={term.id}
                                      term={term}
                                      depth={depth}
                                      path={path}
                                      indentCh={indentCh}
                                      showPathTooltip={showPathTooltip}
                                      canDrag={!!termListSectionFilter && categorySortColumn === "tree"}
                                      onReorder={handleCategoryReorder}
                                      sectionsCell={
                                        <span className="text-xs text-muted-foreground">
                                          {homeLabel || term.home_section_name || "—"}
                                        </span>
                                      }
                                      onEdit={() => {
                                        if (editingSection || showSectionForm) resetSectionForm();
                                        setSlugManuallyEdited(false);
                                        setEditingTerm(term);
                                        setShowTermForm(true);
                                        setActiveTab("categories");
                                        setFormData({
                                          name: term.name,
                                          slug: term.slug,
                                          description: term.description || "",
                                          parent_id: term.parent_id || "",
                                          type: term.type,
                                          suggested_sections: term.suggested_sections || [],
                                          home_section_name:
                                            term.home_section_name ||
                                            term.suggested_sections?.[0] ||
                                            "",
                                          color: term.color ?? "",
                                          is_core: !!term.is_core,
                                        });
                                      }}
                                      onDelete={() => handleDelete(term)}
                                    />
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </DndProvider>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tags</CardTitle>
                  <CardDescription>Manage tags for organizing and filtering content</CardDescription>
                </div>
                <Button onClick={handleNewTag}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Tags List - Compact Table Style */}
                <div>
                  <div className="space-y-3">
                    {/* Search + Section filter */}
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search tags by name or slug..."
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <select
                        value={termListSectionFilter}
                        onChange={(e) => setTermListSectionFilter(e.target.value)}
                        className="w-[180px] px-3 py-2 border border-input rounded-md bg-background text-sm"
                      >
                        <option value="">All sections</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.section_name}>
                            {s.display_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Scrollable Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-muted sticky top-0 z-10">
                            <tr>
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Name</th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Slug</th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Content Type Sections</th>
                              <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getFilteredTags().length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                                  {tagSearch || termListSectionFilter
                                    ? "No tags match your search and filters"
                                    : "No tags found"}
                                </td>
                              </tr>
                            ) : (
                              getFilteredTags().map((term) => (
                                <tr key={term.id} className="border-t hover:bg-accent">
                                  <td className="px-3 py-1.5">
                                    <div className="inline-flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm">{term.name}</span>
                                      {term.is_core && (
                                        <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                                          Core
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{term.slug}</td>
                                  <td className="px-3 py-1.5 text-xs">
                                    {getSectionNamesText(term)}
                                  </td>
                                  <td className="px-3 py-1.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => {
                                          // Reset section form if it's open
                                          if (editingSection || showSectionForm) {
                                            resetSectionForm();
                                          }
                                          setSlugManuallyEdited(false);
                                          setEditingTerm(term);
                                          setShowTermForm(true);
                                          // Switch to appropriate tab
                                          setActiveTab(term.type === "category" ? "categories" : "tags");
                                          setFormData({
                                            name: term.name,
                                            slug: term.slug,
                                            description: term.description || "",
                                            parent_id: "",
                                            type: term.type,
                                            suggested_sections: term.suggested_sections || [],
                                            home_section_name: "",
                                            color: term.color ?? "",
                                            is_core: !!term.is_core,
                                          });
                                        }}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleDelete(term)}
                                        disabled={!!term.is_core}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Term (Category / Tag) Form Modal */}
      <Dialog
        open={showTermForm || !!editingTerm}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formData.type === "category"
                ? editingTerm
                  ? "Edit Category"
                  : "Add New Category"
                : editingTerm
                  ? "Edit Tag"
                  : "Add New Tag"}
            </DialogTitle>
            <DialogDescription>
              {formData.type === "category"
                ? "Hierarchical categories for organizing content"
                : "Tags for organizing and filtering content"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (!editingTerm && !slugManuallyEdited) {
                    setFormData((prev) => ({
                      ...prev,
                      slug: generateTaxonomySlug(e.target.value),
                    }));
                  }
                }}
                placeholder={formData.type === "category" ? "Category name" : "Tag name"}
              />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input
                value={formData.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setFormData({ ...formData, slug: e.target.value });
                }}
                placeholder={formData.type === "category" ? "category-slug" : "tag-slug"}
                disabled={editingTerm?.slug === "uncategorized" || !!editingTerm?.is_core}
              />
            </div>
            {formData.type === "category" && (
              <div>
                <Label>Home taxonomy section *</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  This category belongs to exactly one section. Section category lists and order are scoped per
                  section.
                </p>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={formData.home_section_name}
                  onChange={(e) => setFormData({ ...formData, home_section_name: e.target.value })}
                >
                  <option value="">Select section…</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.section_name}>
                      {section.display_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {formData.type === "category" && (
              <div>
                <Label>Parent Category (optional)</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={formData.parent_id}
                  onChange={(e) => {
                    const parentId = e.target.value;
                    const next = { ...formData, parent_id: parentId };
                    // Auto-inherit color from parent when creating a new child and parent has a color
                    if (!editingTerm && parentId) {
                      const parent = flattenCategories(categories).find((c) => c.id === parentId);
                      if (parent?.color && !formData.color.trim()) {
                        next.color = parent.color;
                      }
                    }
                    setFormData(next);
                  }}
                  disabled={editingTerm?.id === formData.parent_id}
                >
                  <option value="">None (Top Level)</option>
                  {flattenCategories(categories)
                    .filter((cat) => cat.id !== editingTerm?.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description"
              />
            </div>
            <div>
              <Label>Color (optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Used for chips and badges when this term is shown in lists or filters.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: "", label: "None" },
                  { value: "#ef4444", label: "Red" },
                  { value: "#f97316", label: "Orange" },
                  { value: "#eab308", label: "Amber" },
                  { value: "#22c55e", label: "Green" },
                  { value: "#3b82f6", label: "Blue" },
                  { value: "#8b5cf6", label: "Violet" },
                  { value: "#ec4899", label: "Pink" },
                  { value: "#64748b", label: "Slate" },
                ].map(({ value, label }) => (
                  <button
                    key={value || "none"}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: value })}
                    className={cn(
                      "rounded-md border-2 p-1.5 transition-colors",
                      (value ? formData.color === value : !formData.color.trim())
                        ? "border-primary ring-1 ring-primary"
                        : "border-transparent hover:border-muted-foreground/30"
                    )}
                    title={label}
                  >
                    {value ? (
                      <span
                        className="block h-6 w-6 rounded-sm shrink-0"
                        style={{ backgroundColor: value }}
                      />
                    ) : (
                      <span className="block h-6 w-6 rounded-sm border border-dashed border-muted-foreground/50 bg-muted/30" />
                    )}
                  </button>
                ))}
                <span className="h-8 w-px bg-border mx-1" aria-hidden />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">Custom:</span>
                  <input
                    type="color"
                    value={formData.color.match(/^#[0-9A-Fa-f]{6}$/) ? formData.color : "#808080"}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-8 w-8 cursor-pointer rounded border border-input bg-transparent p-0"
                    title="Custom color"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#rrggbb"
                    className="w-24 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
            {formData.type === "tag" && (
              <div>
                <Label>Apply to these taxonomy sections</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Tags can be assigned to multiple sections for filtering and global tagging.
                </p>
                <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                  {sections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No taxonomy sections configured.</p>
                  ) : (
                    sections.map((section) => (
                      <label key={section.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.suggested_sections.includes(section.section_name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                suggested_sections: [...formData.suggested_sections, section.section_name],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                suggested_sections: formData.suggested_sections.filter(
                                  (s) => s !== section.section_name
                                ),
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{section.display_name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
            {isSuperadmin && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="term-is-core"
                  checked={formData.is_core}
                  onChange={(e) => setFormData({ ...formData, is_core: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="term-is-core" className="cursor-pointer">
                  Core (system-required: slug locked, only label editable, cannot delete)
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrUpdateTerm} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : formData.type === "category" ? (
                editingTerm ? "Update Category" : "Create Category"
              ) : (
                editingTerm ? "Update Tag" : "Create Tag"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
