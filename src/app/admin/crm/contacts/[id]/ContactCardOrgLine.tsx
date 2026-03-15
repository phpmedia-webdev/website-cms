"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ContactOrgItem {
  organization_id: string;
  organization: { id: string; name: string } | null;
}

interface ContactCardOrgLineProps {
  orgs: ContactOrgItem[];
}

export function ContactCardOrgLine({ orgs }: ContactCardOrgLineProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const primary = orgs[0];
  const hasMultiple = orgs.length > 1;

  if (orgs.length === 0) return null;

  const primaryName = primary?.organization?.name ?? "Organization";
  const primaryId = primary?.organization?.id ?? primary?.organization_id;

  return (
    <>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5 min-w-0">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        {hasMultiple ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-primary hover:underline truncate text-left inline-flex items-center gap-0.5"
          >
            <span className="truncate">{primaryName}</span>
            <span>+</span>
          </button>
        ) : (
          <Link
            href={`/admin/crm/organizations/${primaryId}`}
            className="text-primary hover:underline truncate"
          >
            {primaryName}
          </Link>
        )}
      </p>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Open organization</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            {orgs.map((item) => {
              const id = item.organization?.id ?? item.organization_id;
              const name = item.organization?.name ?? "Organization";
              return (
                <Button key={id} variant="outline" className="justify-start" asChild>
                  <Link href={`/admin/crm/organizations/${id}`} onClick={() => setModalOpen(false)}>
                    {name}
                  </Link>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
