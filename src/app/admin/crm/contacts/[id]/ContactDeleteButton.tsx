"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ContactDeleteButtonProps {
  contactId: string;
  /** Display name for confirmation message */
  displayName: string;
}

/**
 * Delete contact button with confirmation. Redirects to contacts list on success.
 */
export function ContactDeleteButton({ contactId, displayName }: ContactDeleteButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const message = `Delete contact "${displayName}"? This cannot be undone. Notes, MAG assignments, and list memberships for this contact will also be removed.`;
    if (!confirm(message)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete contact");
      }
      router.push("/admin/crm/contacts");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete contact");
      setDeleting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={handleDelete}
      disabled={deleting}
    >
      <Trash2 className="h-3.5 w-3.5 mr-1" />
      {deleting ? "Deleting…" : "Delete"}
    </Button>
  );
}
