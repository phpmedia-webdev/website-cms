"use client";

import type { ReactNode, RefCallback } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, GripVertical } from "lucide-react";
import type { TaxonomyTerm } from "@/types/taxonomy";

const ITEM = "TAXONOMY_CATEGORY_ROW";

export interface TaxonomyCategoryDndRowProps {
  term: TaxonomyTerm;
  depth: number;
  path: string[];
  indentCh: number;
  showPathTooltip: boolean;
  canDrag: boolean;
  onReorder: (draggedId: string, targetId: string, parentId: string | null) => void;
  onEdit: () => void;
  onDelete: () => void;
  sectionsCell: ReactNode;
}

export function TaxonomyCategoryDndRow({
  term,
  depth,
  path,
  indentCh,
  showPathTooltip,
  canDrag,
  onReorder,
  onEdit,
  onDelete,
  sectionsCell,
}: TaxonomyCategoryDndRowProps) {
  const parentId = term.parent_id ?? null;

  const [{ isDragging }, drag] = useDrag({
    type: ITEM,
    item: { id: term.id, parentId },
    canDrag: () => canDrag,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: ITEM,
    canDrop: (item: { id: string; parentId: string | null }) =>
      item.id !== term.id && item.parentId === parentId,
    drop: (item: { id: string; parentId: string | null }) => {
      onReorder(item.id, term.id, parentId);
    },
  });

  return (
    <tr
      ref={drop as unknown as RefCallback<HTMLTableRowElement>}
      className={`border-t hover:bg-accent ${isDragging ? "opacity-50" : ""}`}
      title={showPathTooltip ? path.join(" › ") : undefined}
    >
      <td className="px-1 py-1.5 w-8 align-middle">
        {canDrag ? (
          <button
            type="button"
            ref={drag as unknown as RefCallback<HTMLButtonElement>}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <span className="inline-block w-6" />
        )}
      </td>
      <td className="px-3 py-1.5">
        <div
          className="inline-flex items-center gap-2 flex-wrap"
          style={{ paddingLeft: `${indentCh}ch` }}
        >
          <span
            className="rounded-full shrink-0 w-3 h-3 border border-border"
            style={{ backgroundColor: term.color || "var(--muted)" }}
            aria-hidden
          />
          <span className="text-sm">{term.name}</span>
          {term.is_core && (
            <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
              Core
            </Badge>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 text-xs text-muted-foreground">{term.slug}</td>
      <td className="px-3 py-1.5 text-xs">{sectionsCell}</td>
      <td className="px-3 py-1.5 text-xs text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onDelete}
            disabled={term.slug === "uncategorized" || !!term.is_core}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
