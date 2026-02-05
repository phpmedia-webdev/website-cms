"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContentEditorForm } from "./ContentEditorForm";
import type { ContentRow, ContentType } from "@/types/content";

export interface ContentEditModalProps {
  open: boolean;
  onClose: () => void;
  item: ContentRow | null;
  types: ContentType[];
  onSaved: () => void;
}

/**
 * Add/edit content in a modal (legacy). Prefer full-page /admin/content/new and /admin/content/[id]/edit.
 */
export function ContentEditModal({
  open,
  onClose,
  item,
  types,
  onSaved,
}: ContentEditModalProps) {
  const handleSaved = () => {
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="w-[95vw] sm:w-[70vw] sm:max-w-[min(70vw,1200px)] max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{item ? "Edit content" : "Add content"}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <ContentEditorForm
            item={item}
            types={types}
            onSaved={handleSaved}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
