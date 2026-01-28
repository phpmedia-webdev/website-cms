"use client";

import { useState, useEffect } from "react";
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
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { getTaxonomyTermsClient, getSectionConfigsClient } from "@/lib/supabase/taxonomy";
import { cn } from "@/lib/utils";
import { Plus, Edit, Trash2, Tag, FolderTree, List, Settings, Loader2, Search } from "lucide-react";
import type { TaxonomyTerm, TaxonomyTermWithChildren, TaxonomyType, SectionTaxonomyConfig } from "@/types/taxonomy";
import { generateTaxonomySlug } from "@/types/taxonomy";

export function TaxonomySettings() {
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
  });
  const [sectionFormData, setSectionFormData] = useState({
    section_name: "",
    display_name: "",
    // Removed: content_type - not functionally used
    category_slugs: [] as string[],
    tag_slugs: [] as string[],
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

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

      setCategories(rootCategories);
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

  const handleCreateOrUpdateTerm = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    if (saving) return; // Prevent multiple submissions

    const slug = formData.slug.trim() || generateTaxonomySlug(formData.name);
    const type = editingTerm?.type || formData.type;

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

      const termData = {
        name: formData.name.trim(),
        slug,
        type,
        parent_id: type === "category" ? (formData.parent_id || null) : null,
        description: formData.description.trim() || null,
        suggested_sections: formData.suggested_sections.length > 0 ? formData.suggested_sections : null,
      };

      const oldSlug = editingTerm?.slug ?? null;

      if (editingTerm) {
        const { error } = await supabase
          .schema(schema)
          .from("taxonomy_terms")
          .update(termData)
          .eq("id", editingTerm.id);
        if (error) throw error;

        // Cascade: update section_taxonomy_config when slug changed
        if (oldSlug && oldSlug !== slug) {
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

      // Apply to these Sections: add this term's slug to each selected section's
      // category_slugs / tag_slugs so it appears in Sections tab count and edit checkboxes.
      if (formData.suggested_sections.length > 0) {
        const { data: configs } = await supabase
          .schema(schema)
          .from("section_taxonomy_config")
          .select("id, section_name, category_slugs, tag_slugs")
          .in("section_name", formData.suggested_sections);
        const isCat = type === "category";
        for (const row of configs || []) {
          const arr = isCat ? row.category_slugs : row.tag_slugs;
          const base = Array.isArray(arr) && arr.length > 0 ? arr : [];
          if (base.includes(slug)) continue;
          const next = [...base, slug];
          await supabase
            .schema(schema)
            .from("section_taxonomy_config")
            .update(isCat ? { category_slugs: next } : { tag_slugs: next })
            .eq("id", row.id);
        }
      }

      resetForm();
      setShowTermForm(false);
      await loadAllData(false);
    } catch (error) {
      console.error("Error saving term:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
        : String(error);
      alert(`Failed to save: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (term: TaxonomyTerm) => {
    if (term.slug === "uncategorized") {
      alert("Cannot delete the 'Uncategorized' category");
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

      const newSectionName = sectionFormData.section_name.trim();
      const configData = {
        section_name: newSectionName,
        display_name: sectionFormData.display_name.trim(),
        content_type: "section", // Default value - not used functionally, but required by DB
        category_slugs: sectionFormData.category_slugs.length > 0 ? sectionFormData.category_slugs : null,
        tag_slugs: sectionFormData.tag_slugs.length > 0 ? sectionFormData.tag_slugs : null,
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
    });
  };

  const resetSectionForm = () => {
    setEditingSection(null);
    setShowSectionForm(false);
    setSectionFormData({
      section_name: "",
      display_name: "",
      // Removed: content_type
      category_slugs: [],
      tag_slugs: [],
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
    setFormData((prev) => ({ ...prev, type: "category" }));
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

  const getSectionBadges = (term: TaxonomyTerm) => {
    if (!term.suggested_sections || term.suggested_sections.length === 0) {
      return <span className="text-xs text-muted-foreground">No sections</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {term.suggested_sections.map((sectionSlug) => {
          const section = sections.find((s) => s.section_name === sectionSlug);
          return (
            <span
              key={sectionSlug}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground"
            >
              {section?.display_name || sectionSlug}
            </span>
          );
        })}
      </div>
    );
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
      const slugs = sec?.category_slugs;
      if (Array.isArray(slugs) && slugs.length > 0) {
        const set = new Set(slugs);
        flatCats = flatCats.filter((cat) => set.has(cat.slug));
      } else {
        flatCats = [];
      }
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
            Sections
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
                  <CardTitle>Sections</CardTitle>
                  <CardDescription>Configure which categories and tags each section uses</CardDescription>
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
                        placeholder="Search sections by name or slug..."
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
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Categories</th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Tags</th>
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
                                    {section.category_slugs?.length || "Use suggested"}
                                  </td>
                                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                                    {section.tag_slugs?.length || "Use suggested"}
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
                                          });
                                        }}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn("h-7 w-7 p-0", section.is_staple && "opacity-40 cursor-not-allowed")}
                                        onClick={() => handleDeleteSection(section)}
                                        disabled={saving || section.is_staple}
                                        title={section.is_staple ? "Template sections cannot be removed" : "Delete section"}
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
                  {editingSection ? "Edit Section" : "Add New Section"}
                </DialogTitle>
                <DialogDescription>
                  Configure which categories and tags this section uses
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
                  />
                </div>
                {/* REMOVED: Content Type field - not functionally used */}
                <div>
                  <Label>Categories</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select specific categories (leave empty to use suggested sections from terms)
                  </p>
                  <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                    {allTerms
                      .filter((t) => t.type === "category")
                      .map((term) => (
                        <label key={term.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sectionFormData.category_slugs.includes(term.slug)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSectionFormData({
                                  ...sectionFormData,
                                  category_slugs: [...sectionFormData.category_slugs, term.slug],
                                });
                              } else {
                                setSectionFormData({
                                  ...sectionFormData,
                                  category_slugs: sectionFormData.category_slugs.filter(
                                    (s) => s !== term.slug
                                  ),
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
                  ) : (
                    editingSection ? "Update" : "Create"
                  )} Section
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
                  <CardDescription>Manage hierarchical categories for organizing content</CardDescription>
                </div>
                <Button onClick={handleNewCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Categories List - Compact Table Style */}
                <div>
                  <div className="space-y-3">
                    {/* Search + Section filter */}
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search categories by name or slug..."
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
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
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Parent</th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Sections</th>
                              <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getFilteredCategories().length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                                  {categorySearch || termListSectionFilter
                                    ? "No categories match your search and filters"
                                    : "No categories found"}
                                </td>
                              </tr>
                            ) : (
                              getFilteredCategories().map((term) => (
                                <tr key={term.id} className="border-t hover:bg-accent">
                                  <td className="px-3 py-1.5 text-sm">
                                    {term.parent_id && <span className="text-muted-foreground mr-2">└─</span>}
                                    {term.name}
                                  </td>
                                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{term.slug}</td>
                                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                                    {term.parent_id
                                      ? categories
                                          .flatMap((c) => flattenCategories([c]))
                                          .find((c) => c.id === term.parent_id)?.name || "—"
                                      : "—"}
                                  </td>
                                  <td className="px-3 py-1.5 text-xs">
                                    {getSectionBadges(term)}
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
                                            parent_id: term.parent_id || "",
                                            type: term.type,
                                            suggested_sections: term.suggested_sections || [],
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
                                        disabled={term.slug === "uncategorized"}
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
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Sections</th>
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
                                  <td className="px-3 py-1.5 text-sm">{term.name}</td>
                                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{term.slug}</td>
                                  <td className="px-3 py-1.5 text-xs">
                                    {getSectionBadges(term)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                disabled={editingTerm?.slug === "uncategorized"}
              />
            </div>
            {formData.type === "category" && (
              <div>
                <Label>Parent Category (optional)</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
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
              <Label>Apply to these Sections</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {formData.type === "category"
                  ? "Add this category to the selected sections. It will be assigned to those sections."
                  : "Add this tag to the selected sections. It will be assigned to those sections."}
              </p>
              <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                {sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sections configured.</p>
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
