"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Pencil } from "lucide-react";
import type { OrgWithMemberPreview } from "@/lib/supabase/organizations";

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

interface OrganizationsListClientProps {
  initialOrganizations: OrgWithMemberPreview[];
}

export function OrganizationsListClient({
  initialOrganizations,
}: OrganizationsListClientProps) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/crm/organizations?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.organizations)) {
        setOrganizations(data.organizations);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Organizations</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" asChild>
            <Link href="/admin/crm/organizations/new">
              <Plus className="h-4 w-4 mr-1.5" />
              New organization
            </Link>
          </Button>
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchList()}
            className="w-48"
          />
          <Button variant="outline" size="sm" onClick={fetchList} disabled={loading}>
            Search
          </Button>
        </div>
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
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No organizations yet. Click “New organization” to add one.
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
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
