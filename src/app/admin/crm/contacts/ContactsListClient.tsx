"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Users, Search, X } from "lucide-react";
import type { CrmContact, ContactMag, ContactMarketingList, Mag, MarketingList } from "@/lib/supabase/crm";
import type { TaxonomyTerm, SectionTaxonomyConfig } from "@/types/taxonomy";
import { getTermsForContentSection } from "@/lib/supabase/taxonomy";

interface ContactWithRelations extends CrmContact {
  mags: { mag_id: string; mag_name: string }[];
  lists: { list_id: string; list_name: string }[];
  termIds: string[];
}

interface ContactsListClientProps {
  contacts: CrmContact[];
  contactMags: { contact_id: string; mag_id: string; mag_name: string }[];
  contactLists: { contact_id: string; list_id: string; list_name: string }[];
  contactTermIds: { contact_id: string; term_id: string }[];
  mags: Mag[];
  marketingLists: MarketingList[];
  taxonomyTerms: TaxonomyTerm[];
  sectionConfigs: SectionTaxonomyConfig[];
}

export function ContactsListClient({
  contacts,
  contactMags,
  contactLists,
  contactTermIds,
  mags,
  marketingLists,
  taxonomyTerms,
  sectionConfigs,
}: ContactsListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMagId, setSelectedMagId] = useState<string>("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedTagId, setSelectedTagId] = useState<string>("");

  const { categories, tags } = useMemo(
    () => getTermsForContentSection(taxonomyTerms, sectionConfigs, "crm"),
    [taxonomyTerms, sectionConfigs]
  );

  const enrichedContacts: ContactWithRelations[] = useMemo(() => {
    return contacts.map((c) => ({
      ...c,
      mags: contactMags.filter((m) => m.contact_id === c.id).map((m) => ({ mag_id: m.mag_id, mag_name: m.mag_name })),
      lists: contactLists.filter((l) => l.contact_id === c.id).map((l) => ({ list_id: l.list_id, list_name: l.list_name })),
      termIds: contactTermIds.filter((t) => t.contact_id === c.id).map((t) => t.term_id),
    }));
  }, [contacts, contactMags, contactLists, contactTermIds]);

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
    return list;
  }, [enrichedContacts, searchQuery, selectedMagId, selectedListId, selectedCategoryId, selectedTagId]);

  const hasFilters = Boolean(selectedMagId || selectedListId || selectedCategoryId || selectedTagId);

  const resetFilters = () => {
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
            Manage CRM contacts ({filteredContacts.length}
            {contacts.length !== filteredContacts.length ? ` / ${contacts.length}` : ""})
          </p>
        </div>
        <Link href="/admin/crm/contacts/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New contact
          </Button>
        </Link>
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-sm"
          />
        </div>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={selectedMagId}
          onChange={(e) => setSelectedMagId(e.target.value)}
        >
          <option value="">All Memberships</option>
          {mags.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={selectedListId}
          onChange={(e) => setSelectedListId(e.target.value)}
        >
          <option value="">All Lists</option>
          {marketingLists.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={selectedTagId}
          onChange={(e) => setSelectedTagId(e.target.value)}
        >
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {(hasFilters || searchQuery) && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
            <X className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

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
                    <th className="text-left font-medium py-2 px-3">Name</th>
                    <th className="text-left font-medium py-2 px-3">Email</th>
                    <th className="text-left font-medium py-2 px-3">Phone</th>
                    <th className="text-left font-medium py-2 px-3">Status</th>
                    <th className="text-left font-medium py-2 px-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2 px-3">
                        <Link
                          href={`/admin/crm/contacts/${c.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.full_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{c.email ?? "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{c.phone ?? "—"}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-muted">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
