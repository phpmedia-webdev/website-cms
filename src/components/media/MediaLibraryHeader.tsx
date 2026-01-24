"use client";

import { Layout, LayoutGrid, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFileSize } from "@/lib/media/image-optimizer";

interface MediaLibraryHeaderProps {
  view: "list" | "grid";
  onViewChange: (view: "list" | "grid") => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: "name-asc" | "name-desc" | "date-newest" | "date-oldest" | "size-smallest" | "size-largest";
  onSortChange: (sort: typeof sort) => void;
  totalSize: number;
  totalItems: number;
  isLoadingStats: boolean;
}

export function MediaLibraryHeader({
  view,
  onViewChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  totalSize,
  totalItems,
  isLoadingStats,
}: MediaLibraryHeaderProps) {
  return (
    <div className="space-y-4 pb-4 border-b">
      {/* Title and Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm text-muted-foreground">
            {isLoadingStats ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading stats...
              </span>
            ) : (
              <>
                {totalItems} {totalItems === 1 ? "image" : "images"} •{" "}
                {formatFileSize(totalSize)} used
              </>
            )}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1">
          <Input
            placeholder="Search by name, slug, or filename..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Sort */}
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A → Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z → A)</SelectItem>
            <SelectItem value="date-newest">Newest First</SelectItem>
            <SelectItem value="date-oldest">Oldest First</SelectItem>
            <SelectItem value="size-smallest">Smallest First</SelectItem>
            <SelectItem value="size-largest">Largest First</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex gap-1 border rounded-md p-1 bg-muted">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onViewChange("list")}
            title="List view"
          >
            <Layout className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onViewChange("grid")}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
