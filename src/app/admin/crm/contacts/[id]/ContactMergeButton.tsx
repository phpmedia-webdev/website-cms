"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Merge, AlertTriangle } from "lucide-react";

interface ContactMergeButtonProps {
  contactId: string;
  displayName: string;
}

function contactLabel(c: { id: string; email: string | null; full_name: string | null; first_name: string | null; last_name: string | null; company: string | null }) {
  const name = c.full_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
  const extra = [name !== "—" ? null : c.email, c.company].filter(Boolean).join(" · ");
  return extra ? `${name} (${extra})` : name;
}

/**
 * Merge button and dialog. Current contact is the primary (kept); user selects another contact to merge into this one (secondary will be removed).
 * Dire warning: action is not reversible.
 */
export function ContactMergeButton({ contactId, displayName }: ContactMergeButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<{ id: string; email: string | null; full_name: string | null; first_name: string | null; last_name: string | null; company: string | null }[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingContacts(true);
    fetch("/api/crm/contacts")
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        const active = Array.isArray(list) ? list.filter((c: { id: string; deleted_at?: string | null }) => c.id !== contactId && !c.deleted_at) : [];
        setContacts(active);
        setSelectedId("");
      })
      .catch(() => setContacts([]))
      .finally(() => setLoadingContacts(false));
  }, [open, contactId]);

  const handleMerge = async () => {
    if (!selectedId || !understood) return;
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId: contactId, secondaryId: selectedId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Merge failed");
      setOpen(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setLoading(false);
    }
  };

  const canMerge = selectedId && understood && !loading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8">
          <Merge className="h-3.5 w-3.5 mr-1" />
          Merge
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Merge contacts
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-left">
              <p className="font-semibold text-destructive">
                This action is not reversible.
              </p>
              <p className="text-sm text-muted-foreground">
                You will merge another contact into <strong>{displayName}</strong>. The selected contact will be removed from the active list (moved to trash). All of their notes, form submissions, memberships, and other data will be combined into this contact. You cannot undo this.
              </p>
              <p className="text-sm text-muted-foreground">
                Choose the contact to merge into this one (that contact will no longer appear in the list).
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label htmlFor="merge-target">Contact to merge into this one</Label>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={loadingContacts}>
              <SelectTrigger id="merge-target" className="mt-1">
                <SelectValue placeholder={loadingContacts ? "Loading…" : "Select a contact"} />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {contactLabel(c)}
                  </SelectItem>
                ))}
                {!loadingContacts && contacts.length === 0 && (
                  <SelectItem value="" disabled>No other contacts</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="merge-understood"
              checked={understood}
              onCheckedChange={(v) => setUnderstood(v === true)}
            />
            <Label htmlFor="merge-understood" className="text-sm font-normal cursor-pointer">
              I understand this action cannot be undone.
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleMerge}
            disabled={!canMerge}
          >
            {loading ? "Merging…" : "Merge permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
