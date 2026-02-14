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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Media</CardTitle>
        <Image className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {hasStorage
            ? `Images and videos · ${formatBytes(totalSizeBytes)}`
            : "Images and videos"}
        </p>
      </CardContent>
    </Card>
  );
}
