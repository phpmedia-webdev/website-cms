import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

function formatChars(chars: number): string {
  if (chars < 1000) return `${chars} chars`;
  if (chars < 1_000_000) return `${(chars / 1000).toFixed(1)}k chars`;
  return `${(chars / 1_000_000).toFixed(1)}M chars`;
}

interface ContentMetricCardProps {
  count: number;
  /** Total character count across content bodies; omit or 0 to hide */
  totalChars?: number;
}

export function ContentMetricCard({ count, totalChars = 0 }: ContentMetricCardProps) {
  const hasChars = totalChars > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Content items</CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {hasChars ? `Blogs and Articles · ${formatChars(totalChars)}` : "Blogs and Articles"}
        </p>
      </CardContent>
    </Card>
  );
}
