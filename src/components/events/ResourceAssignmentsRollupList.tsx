"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Matches persisted shape; `source_bundle_id` is UI-only (bundle definition id for label). */
export type ResourceAssignmentRollupRow = {
  resource_id: string;
  bundle_instance_id: string | null;
  source_bundle_id?: string | null;
};

function partitionAssignments(rows: ResourceAssignmentRollupRow[]) {
  const bundleGroups = new Map<string, ResourceAssignmentRollupRow[]>();
  const singles: ResourceAssignmentRollupRow[] = [];
  for (const row of rows) {
    if (row.bundle_instance_id) {
      const id = row.bundle_instance_id;
      const list = bundleGroups.get(id) ?? [];
      list.push(row);
      bundleGroups.set(id, list);
    } else {
      singles.push(row);
    }
  }
  return { bundleGroups, singles };
}

function bundleGroupTitle(
  members: ResourceAssignmentRollupRow[],
  bundleNamesByDefinitionId: Map<string, string> | undefined
): string {
  const src = members.find((m) => m.source_bundle_id)?.source_bundle_id;
  if (src && bundleNamesByDefinitionId?.has(src)) {
    return bundleNamesByDefinitionId.get(src) ?? "Bundle";
  }
  return "Bundle";
}

export interface ResourceAssignmentsRollupListProps {
  assignments: ResourceAssignmentRollupRow[];
  /** Resolve display name for a resource id (from full registry on tasks, picker list on events). */
  resourceLabel: (resourceId: string) => string;
  /** Bundle definition id → product name (Resources manager). */
  bundleNamesByDefinitionId?: Map<string, string>;
  onRemoveResource?: (resourceId: string) => void;
  onRemoveBundleInstance?: (bundleInstanceId: string) => void;
  emptyMessage?: string;
  /** Smaller typography for task bento tile. */
  variant?: "default" | "compact";
}

/**
 * §2.2 — Rolled-up list: one collapsible block per `bundle_instance_id`; individual resources listed;
 * singles listed as plain rows. Remove actions optional (read-only when omitted).
 */
export function ResourceAssignmentsRollupList({
  assignments,
  resourceLabel,
  bundleNamesByDefinitionId,
  onRemoveResource,
  onRemoveBundleInstance,
  emptyMessage = "No resources assigned.",
  variant = "default",
}: ResourceAssignmentsRollupListProps) {
  const [expandedInstances, setExpandedInstances] = useState<Set<string>>(() => new Set());

  const { bundleGroups, singles } = useMemo(
    () => partitionAssignments(assignments),
    [assignments]
  );

  const bundleEntries = useMemo(
    () =>
      [...bundleGroups.entries()].sort((a, b) =>
        bundleGroupTitle(a[1], bundleNamesByDefinitionId).localeCompare(
          bundleGroupTitle(b[1], bundleNamesByDefinitionId)
        )
      ),
    [bundleGroups, bundleNamesByDefinitionId]
  );

  const sortedSingles = useMemo(
    () =>
      [...singles].sort((x, y) =>
        resourceLabel(x.resource_id).localeCompare(resourceLabel(y.resource_id))
      ),
    [singles, resourceLabel]
  );

  const toggleExpanded = (instanceId: string) => {
    setExpandedInstances((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  };

  const textMain = variant === "compact" ? "text-[11px] leading-snug" : "text-sm";
  const textMuted = variant === "compact" ? "text-[10px]" : "text-xs";

  if (assignments.length === 0) {
    return (
      <p
        className={cn(
          "py-1 text-center text-muted-foreground",
          variant === "compact" ? "text-[11px]" : "text-sm"
        )}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className={cn("divide-y divide-border/40", variant === "compact" ? "rounded-sm border border-border/30" : "")}>
      {bundleEntries.map(([instanceId, members]) => {
        const title = bundleGroupTitle(members, bundleNamesByDefinitionId);
        const open = expandedInstances.has(instanceId);
        const sortedMembers = [...members].sort((x, y) =>
          resourceLabel(x.resource_id).localeCompare(resourceLabel(y.resource_id))
        );
        return (
          <li key={instanceId} className={cn(variant === "compact" ? "px-0.5 py-1" : "py-2")}>
            <div className="flex items-start gap-1">
              <button
                type="button"
                className={cn(
                  "mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground",
                  variant === "compact" && "mt-px"
                )}
                aria-expanded={open}
                aria-label={open ? "Collapse bundle" : "Expand bundle"}
                onClick={() => toggleExpanded(instanceId)}
              >
                {open ? (
                  <ChevronDown className={variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"} />
                ) : (
                  <ChevronRight className={variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"} />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={cn("font-medium text-foreground/90", textMain)}>
                    {title}
                    <span className={cn("font-normal text-muted-foreground", textMuted)}>
                      {" "}
                      · {members.length} resource{members.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  {onRemoveBundleInstance ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 px-2 text-destructive hover:text-destructive",
                        variant === "compact" && "h-6 text-[10px]"
                      )}
                      onClick={() => onRemoveBundleInstance(instanceId)}
                    >
                      Remove bundle
                    </Button>
                  ) : null}
                </div>
                {open ? (
                  <ul className={cn("mt-1.5 space-y-0.5 border-l border-border/50 pl-3", textMain)}>
                    {sortedMembers.map((m) => (
                      <li key={m.resource_id} className="flex items-center gap-1">
                        <span className="min-w-0 flex-1 truncate" title={resourceLabel(m.resource_id)}>
                          {resourceLabel(m.resource_id)}
                        </span>
                        {onRemoveResource ? (
                          <button
                            type="button"
                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                            aria-label={`Remove ${resourceLabel(m.resource_id)}`}
                            onClick={() => onRemoveResource(m.resource_id)}
                          >
                            <X className={variant === "compact" ? "h-3 w-3" : "h-3.5 w-3.5"} />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}

      {sortedSingles.map((row) => (
        <li
          key={row.resource_id}
          className={cn(
            "flex items-center gap-2",
            variant === "compact" ? "px-0.5 py-1" : "py-2"
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", textMain)} title={resourceLabel(row.resource_id)}>
            {resourceLabel(row.resource_id)}
          </span>
          {onRemoveResource ? (
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
              aria-label={`Remove ${resourceLabel(row.resource_id)}`}
              onClick={() => onRemoveResource(row.resource_id)}
            >
              <X className={variant === "compact" ? "h-3 w-3" : "h-3.5 w-3.5"} />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
