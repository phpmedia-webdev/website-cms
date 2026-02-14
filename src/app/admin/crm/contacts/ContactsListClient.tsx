"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Users, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import type { CrmContact, ContactMag, ContactMarketingList, Mag, MarketingList } from "@/lib/supabase/crm";
import type { TaxonomyTerm, SectionTaxonomyConfig } from "@/types/taxonomy";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";
import { getTermsForContentSection } from "@/lib/supabase/taxonomy";
import { ExportContactsDialog } from "@/components/crm/ExportContactsDialog";
import { AddToListDialog } from "@/components/crm/AddToListDialog";
import { RemoveFromListDialog } from "@/components/crm/RemoveFromListDialog";
import { SetCrmFieldsDialog } from "@/components/crm/SetCrmFieldsDialog";
import { TaxonomyBulkDialog } from "@/components/crm/TaxonomyBulkDialog";
import { ConfirmTrashDialog } from "@/components/crm/ConfirmTrashDialog";
import { ConfirmEmptyTrashDialog } from "@/components/crm/ConfirmEmptyTrashDialog";
import { MergeBulkDialog } from "@/components/crm/MergeBulkDialog";
import { ContactsListFilters } from "@/components/crm/ContactsListFilters";
import { ContactsListBulkBar } from "@/components/crm/ContactsListBulkBar";

interface ContactWithRelations extends CrmContact {
  mags: { mag_id: string; mag_name: string }[];
  lists: { list_id: string; list_name: string }[];
  termIds: string[];
}

interface ContactsListClientProps {
  contacts: CrmContact[];
  trashedContacts: CrmContact[];
  contactMags: { contact_id: string; mag_id: string; mag_name: string }[];
  contactLists: { contact_id: string; list_id: string; list_name: string }[];
  contactTermIds: { contact_id: string; term_id: string }[];
  mags: Mag[];
  marketingLists: MarketingList[];
  taxonomyTerms: TaxonomyTerm[];
  sectionConfigs: SectionTaxonomyConfig[];
  contactStatuses: CrmContactStatusOption[];
}

export function ContactsListClient({
  contacts,
  trashedContacts = [],
  contactMags,
  contactLists,
  contactTermIds,
  mags,
  marketingLists,
  taxonomyTerms,
  sectionConfigs,
  contactStatuses,
}: ContactsListClientProps) {
  const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
  type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

  const [showTrashed, setShowTrashed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedMagId, setSelectedMagId] = useState<string>("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [addToListDialogOpen, setAddToListDialogOpen] = useState(false);
  const [removeFromListDialogOpen, setRemoveFromListDialogOpen] = useState(false);
  const [crmFieldsDialogOpen, setCrmFieldsDialogOpen] = useState(false);
  const [taxonomyDialogOpen, setTaxonomyDialogOpen] = useState(false);
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [mergeBulkDialogOpen, setMergeBulkDialogOpen] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleRestore = async () => {
    if (selectedIds.size === 0) return;
    setBulkMenuOpen(false);
    setRestoreError(null);
    setRestoreLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/bulk-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : "Failed to restore");
    } finally {
      setRestoreLoading(false);
    }
  };

  const hasSelection = selectedIds.size > 0;
  const hasTrashedContacts = trashedContacts.length > 0;

  const refreshListAndBadge = () => {
    router.refresh();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("crm-data-changed"));
    }
  };

  const baseContacts = showTrashed ? trashedContacts : contacts;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
        setBulkMenuOpen(false);
      }
    }
    if (bulkMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [bulkMenuOpen]);

  const { categories, tags } = useMemo(
    () => getTermsForContentSection(taxonomyTerms, sectionConfigs, "crm"),
    [taxonomyTerms, sectionConfigs]
  );

  const enrichedContacts: ContactWithRelations[] = useMemo(() => {
    return baseContacts.map((c) => ({
      ...c,
      mags: contactMags.filter((m) => m.contact_id === c.id).map((m) => ({ mag_id: m.mag_id, mag_name: m.mag_name })),
      lists: contactLists.filter((l) => l.contact_id === c.id).map((l) => ({ list_id: l.list_id, list_name: l.list_name })),
      termIds: contactTermIds.filter((t) => t.contact_id === c.id).map((t) => t.term_id),
    }));
  }, [baseContacts, contactMags, contactLists, contactTermIds]);

  const filteredContacts = useMemo(() => {
    let list = enrichedContacts;
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((c) => {
        const name = (c.full_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`).toLowerCase();
        const email = (c.email ?? "").toLowerCase();
        const phone = (c.phone ?? "").toLowerCase();
        const magNames = c.mags.map((m) => m.mag_name.toLowerCase()).join(" ");
        const listNames = c.lists.map((l) => l.list_name.toLowerCase()).join(" ");
        return name.includes(q) || email.includes(q) || phone.includes(q) || magNames.includes(q) || listNames.includes(q);
      });
    }
    if (selectedStatus) {
      list = list.filter((c) => c.status === selectedStatus);
    }
    if (selectedMagId) {
      list = list.filter((c) => c.mags.some((m) => m.mag_id === selectedMagId));
    }
    if (selectedListId) {
      list = list.filter((c) => c.lists.some((l) => l.list_id === selectedListId));
    }
    if (selectedCategoryId) {
      list = list.filter((c) => c.termIds.includes(selectedCategoryId));
    }
    if (selectedTagId) {
      list = list.filter((c) => c.termIds.includes(selectedTagId));
    }
    return [...list].sort((a, b) => {
      const lnA = (a.last_name ?? "").toLowerCase();
      const lnB = (b.last_name ?? "").toLowerCase();
      if (lnA !== lnB) return lnA.localeCompare(lnB);
      const fnA = (a.first_name ?? "").toLowerCase();
      const fnB = (b.first_name ?? "").toLowerCase();
      if (fnA !== fnB) return fnA.localeCompare(fnB);
      return (a.email ?? "").toLowerCase().localeCompare((b.email ?? "").toLowerCase());
    });
  }, [enrichedContacts, searchQuery, selectedStatus, selectedMagId, selectedListId, selectedCategoryId, selectedTagId]);

  const hasFilters = Boolean(selectedStatus || selectedMagId || selectedListId || selectedCategoryId || selectedTagId || searchQuery);

  const totalCount = filteredContacts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  // Reset to page 1 and clear selection when filters, page size, or showTrashed change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedMagId, selectedListId, selectedCategoryId, selectedTagId, pageSize, showTrashed]);
  useEffect(() => {
    setSelectedIds(new Set());
  }, [showTrashed]);

  // Clamp current page when filtered list shrinks (e.g. fewer pages after filter)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handlePageSizeChange = (value: string) => {
    const n = parseInt(value, 10) as PageSize;
    if (PAGE_SIZE_OPTIONS.includes(n)) {
      setPageSize(n);
    }
  };

  const filteredContactIds = useMemo(() => filteredContacts.map((c) => c.id), [filteredContacts]);

  const mergeTwoContacts = useMemo(() => {
    const arr = enrichedContacts.filter((c) => selectedIds.has(c.id));
    if (arr.length !== 2) return null;
    const toOpt = (c: ContactWithRelations) => ({
      id: c.id,
      displayName:
        (c.full_name || [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || c.email || "—").trim() || "—",
    });
    return { contactA: toOpt(arr[0]), contactB: toOpt(arr[1]) };
  }, [enrichedContacts, selectedIds]);

  const allFilteredSelected =
    totalCount > 0 && filteredContactIds.every((id) => selectedIds.has(id));
  const someFilteredSelected =
    totalCount > 0 && filteredContactIds.some((id) => selectedIds.has(id));

  const handleCheckAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContactIds));
    }
  };

  const resetFilters = () => {
    setSelectedStatus("");
    setSelectedMagId("");
    setSelectedListId("");
    setSelectedCategoryId("");
    setSelectedTagId("");
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground text-sm">
            {showTrashed
              ? hasFilters
                ? `Showing ${filteredContacts.length} of ${trashedContacts.length} trashed`
                : `${trashedContacts.length} trashed contact${trashedContacts.length === 1 ? "" : "s"}`
              : hasFilters
                ? `Showing ${filteredContacts.length} of ${contacts.length} contacts`
                : `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/crm/contacts/import">
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
          </Link>
          <Link href="/admin/crm/contacts/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New contact
            </Button>
          </Link>
        </div>
      </div>

      <ContactsListFilters
        selectedStatus={selectedStatus}
        onSelectedStatusChange={setSelectedStatus}
        selectedMagId={selectedMagId}
        onSelectedMagIdChange={setSelectedMagId}
        selectedListId={selectedListId}
        onSelectedListIdChange={setSelectedListId}
        selectedCategoryId={selectedCategoryId}
        onSelectedCategoryIdChange={setSelectedCategoryId}
        selectedTagId={selectedTagId}
        onSelectedTagIdChange={setSelectedTagId}
        resetFilters={resetFilters}
        hasFilters={hasFilters}
        contactStatuses={contactStatuses}
        mags={mags}
        marketingLists={marketingLists}
        categories={categories}
        tags={tags}
      />

      <ContactsListBulkBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        showTrashed={showTrashed}
        onShowTrashedChange={setShowTrashed}
        hasTrashedContacts={hasTrashedContacts}
        trashedCount={trashedContacts.length}
        hasSelection={hasSelection}
        selectedCount={selectedIds.size}
        bulkMenuOpen={bulkMenuOpen}
        onBulkMenuOpenChange={setBulkMenuOpen}
        bulkMenuRef={bulkMenuRef}
        onExport={() => setExportDialogOpen(true)}
        onAddToList={() => setAddToListDialogOpen(true)}
        onRemoveFromList={() => setRemoveFromListDialogOpen(true)}
        onSetCrmFields={() => setCrmFieldsDialogOpen(true)}
        onTaxonomy={() => setTaxonomyDialogOpen(true)}
        onMerge={selectedIds.size === 2 ? () => setMergeBulkDialogOpen(true) : undefined}
        onTrash={() => setTrashConfirmOpen(true)}
        onRestore={handleRestore}
        restoreLoading={restoreLoading}
        onEmptyTrash={() => setEmptyTrashDialogOpen(true)}
      />

      {restoreError && (
        <p className="text-sm text-destructive" role="alert">
          {restoreError}
          <button type="button" className="ml-2 underline" onClick={() => setRestoreError(null)} aria-label="Dismiss">
            Dismiss
          </button>
        </p>
      )}

      {/* Table */}
      {filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3 text-sm">
              {contacts.length === 0 ? "No contacts yet" : "No contacts match your search or filters"}
            </p>
            {contacts.length === 0 && (
              <Link href="/admin/crm/contacts/new">
                <Button size="sm">Add your first contact</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="w-10 text-left font-medium py-2 px-3">
                      <Checkbox
                        aria-label="Select all filtered contacts"
                        checked={allFilteredSelected}
                        indeterminate={someFilteredSelected && !allFilteredSelected}
                        onCheckedChange={handleCheckAll}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </th>
                    <th className="text-left font-medium py-2 px-3">Last name</th>
                    <th className="text-left font-medium py-2 px-3">First name</th>
                    <th className="text-left font-medium py-2 px-3">Full name</th>
                    <th className="text-left font-medium py-2 px-3">Phone</th>
                    <th className="text-left font-medium py-2 px-3">Status</th>
                    <th className="text-left font-medium py-2 px-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContacts.map((c) => {
                    const rowLabel =
                      [c.last_name, c.first_name].filter(Boolean).join(", ") ||
                      c.full_name ||
                      c.email ||
                      "Contact";
                    return (
                    <tr
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${rowLabel}`}
                      onClick={() => router.push(`/admin/crm/contacts/${c.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/admin/crm/contacts/${c.id}`);
                        }
                      }}
                      className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="w-10 py-2 px-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${rowLabel}`}
                          checked={selectedIds.has(c.id)}
                          onCheckedChange={(checked) => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(c.id);
                              else next.delete(c.id);
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-2 px-3 font-medium">{c.last_name ?? "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{c.first_name ?? "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{c.full_name ?? "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{c.phone ?? "—"}</td>
                      <td className="py-2 px-3">
                        {(() => {
                          const config = contactStatuses.find((s) => s.slug === c.status);
                          const label = config?.label ?? c.status;
                          if (config?.color) {
                            return (
                              <span
                                className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium text-white"
                                style={{ backgroundColor: config.color }}
                              >
                                {label}
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-muted">
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Show</span>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  aria-label="Contacts per page"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span>per page</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[10rem] text-center">
                  Showing {(totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1)}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div>
                {totalCount} contact{totalCount === 1 ? "" : "s"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <ExportContactsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        selectedIds={selectedIds}
      />
      <AddToListDialog
        open={addToListDialogOpen}
        onOpenChange={setAddToListDialogOpen}
        selectedIds={selectedIds}
        marketingLists={marketingLists}
        onSuccess={refreshListAndBadge}
      />
      <RemoveFromListDialog
        open={removeFromListDialogOpen}
        onOpenChange={setRemoveFromListDialogOpen}
        selectedIds={selectedIds}
        marketingLists={marketingLists}
        onSuccess={refreshListAndBadge}
      />
      <SetCrmFieldsDialog
        open={crmFieldsDialogOpen}
        onOpenChange={setCrmFieldsDialogOpen}
        selectedIds={selectedIds}
        contactStatuses={contactStatuses}
        onSuccess={refreshListAndBadge}
      />
      <TaxonomyBulkDialog
        open={taxonomyDialogOpen}
        onOpenChange={setTaxonomyDialogOpen}
        selectedIds={selectedIds}
        categories={categories}
        tags={tags}
        onSuccess={refreshListAndBadge}
      />
      <ConfirmTrashDialog
        open={trashConfirmOpen}
        onOpenChange={setTrashConfirmOpen}
        selectedIds={selectedIds}
        onSuccess={refreshListAndBadge}
      />
      <ConfirmEmptyTrashDialog
        open={emptyTrashDialogOpen}
        onOpenChange={setEmptyTrashDialogOpen}
        trashedCount={trashedContacts.length}
        onSuccess={refreshListAndBadge}
      />
      {mergeTwoContacts && (
        <MergeBulkDialog
          open={mergeBulkDialogOpen}
          onOpenChange={setMergeBulkDialogOpen}
          contactA={mergeTwoContacts.contactA}
          contactB={mergeTwoContacts.contactB}
          onSuccess={() => {
            setSelectedIds(new Set());
            refreshListAndBadge();
          }}
        />
      )}
    </div>
  );
}
