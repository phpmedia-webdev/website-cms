import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface MediaMetricCardProps {
  count: number;
  /** Total storage in bytes; omit or 0 to hide storage line */
  totalSizeBytes?: number;
}

export function MediaMetricCard({ count, totalSizeBytes = 0 }: MediaMetricCardProps) {
  const hasStorage = totalSizeBytes > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
        <CardTitle className="text-sm font-medium">Media Items</CardTitle>
        <Image className="h-4 w-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-xl font-bold">{count.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {hasStorage
            ? `Images and videos · ${formatBytes(totalSizeBytes)}`
            : "Images and videos"}
        </p>
      </CardContent>
    </Card>
  );
}
