"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, X } from "lucide-react";
import type { OrgWithMemberPreview } from "@/lib/supabase/organizations";
import type { TaxonomyTerm, SectionTaxonomyConfig } from "@/types/taxonomy";
import { getTermsForContentSection } from "@/lib/supabase/taxonomy";

function MemberBadges({
  members,
  memberCount,
  orgId,
}: {
  members: { id: string; full_name: string | null }[];
  memberCount: number;
  orgId: string;
}) {
  const display = members.slice(0, 5);
  const extra = memberCount > display.length ? memberCount - display.length : 0;
  return (
    <div className="flex items-center gap-0.5">
      {display.map((m, i) => (
        <Link
          key={m.id}
          href={`/admin/crm/contacts/${m.id}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background hover:bg-primary hover:text-primary-foreground"
          style={{ marginLeft: i > 0 ? -6 : 0 }}
          title={m.full_name || "Contact"}
        >
          {(m.full_name || "?").charAt(0).toUpperCase()}
        </Link>
      ))}
      {extra > 0 && (
        <Link
          href={`/admin/crm/organizations/${orgId}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background hover:bg-primary hover:text-primary-foreground"
          style={{ marginLeft: display.length ? -6 : 0 }}
          title={`+${extra} more`}
        >
          +{extra}
        </Link>
      )}
    </div>
  );
}

const selectClass =
  "h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

interface OrganizationsListClientProps {
  initialOrganizations: OrgWithMemberPreview[];
  taxonomyTerms: TaxonomyTerm[];
  sectionConfigs: SectionTaxonomyConfig[];
  orgTermIds: { organization_id: string; term_id: string }[];
}

export function OrganizationsListClient({
  initialOrganizations,
  taxonomyTerms,
  sectionConfigs,
  orgTermIds,
}: OrganizationsListClientProps) {
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");

  const { categories, tags } = useMemo(
    () => getTermsForContentSection(taxonomyTerms, sectionConfigs, "organization"),
    [taxonomyTerms, sectionConfigs]
  );

  const orgTermIdsByOrg = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of orgTermIds) {
      let set = map.get(r.organization_id);
      if (!set) {
        set = new Set();
        map.set(r.organization_id, set);
      }
      set.add(r.term_id);
    }
    return map;
  }, [orgTermIds]);

  const filteredOrganizations = useMemo(() => {
    let list = initialOrganizations;
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (o) =>
          (o.name ?? "").toLowerCase().includes(q) ||
          (o.email ?? "").toLowerCase().includes(q) ||
          (o.phone ?? "").toLowerCase().includes(q) ||
          (o.type ?? "").toLowerCase().includes(q) ||
          (o.industry ?? "").toLowerCase().includes(q)
      );
    }
    if (selectedCategoryId) {
      list = list.filter((o) => orgTermIdsByOrg.get(o.id)?.has(selectedCategoryId));
    }
    if (selectedTagId) {
      list = list.filter((o) => orgTermIdsByOrg.get(o.id)?.has(selectedTagId));
    }
    return list;
  }, [initialOrganizations, search, selectedCategoryId, selectedTagId, orgTermIdsByOrg]);

  const hasFilters = !!(
    search.trim() ||
    selectedCategoryId ||
    selectedTagId
  );
  const resetFilters = () => {
    setSearch("");
    setSelectedCategoryId("");
    setSelectedTagId("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Organizations</h1>
        <Button size="sm" asChild>
          <Link href="/admin/crm/organizations/new">
            <Plus className="h-4 w-4 mr-1.5" />
            New organization
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name, email, type, industry..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <select
          className={selectClass}
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={selectedTagId}
          onChange={(e) => setSelectedTagId(e.target.value)}
        >
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs shrink-0">
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-9 px-4 text-left font-medium">Organization Name</th>
                  <th className="h-9 px-4 text-left font-medium">Type</th>
                  <th className="h-9 px-4 text-left font-medium">Members</th>
                  <th className="h-9 px-4 text-left font-medium">Email Address</th>
                  <th className="h-9 px-4 text-left font-medium">Phone Number</th>
                  <th className="h-9 px-4 text-left font-medium">Industry</th>
                  <th className="h-9 w-28 px-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrganizations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {initialOrganizations.length === 0
                        ? "No organizations yet. Click “New organization” to add one."
                        : "No organizations match your search or filters."}
                    </td>
                  </tr>
                ) : (
                  filteredOrganizations.map((org) => (
                    <tr key={org.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">
                        <Link
                          href={`/admin/crm/organizations/${org.id}`}
                          className="text-primary hover:underline"
                        >
                          {org.name}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{org.type ?? "—"}</td>
                      <td className="p-3">
                        <MemberBadges
                          members={org.members ?? []}
                          memberCount={org.member_count ?? 0}
                          orgId={org.id}
                        />
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {org.email ? (
                          <a href={`mailto:${org.email}`} className="text-primary hover:underline">
                            {org.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{org.phone ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{org.industry ?? "—"}</td>
                      <td className="p-3 flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                          <Link href={`/admin/crm/organizations/${org.id}`}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
