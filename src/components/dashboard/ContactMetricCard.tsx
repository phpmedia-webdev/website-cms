import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface ContactMetricCardProps {
  total: number;
  byStatus: { status: string; count: number }[];
  /** Map status slug to display label (e.g. "new" -> "New"). Omit to show slug. */
  statusLabels?: Record<string, string>;
}

function labelFor(status: string, statusLabels?: Record<string, string>): string {
  if (!status) return "(no status)";
  const slug = status.trim().toLowerCase();
  return statusLabels?.[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function ContactMetricCard({
  total,
  byStatus,
  statusLabels,
}: ContactMetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{total.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">CRM contacts</p>
        {byStatus.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {byStatus.map(({ status, count }) => (
              <li key={status || "(none)"} className="flex justify-between gap-2">
                <span className="truncate">{labelFor(status, statusLabels)}</span>
                <span className="shrink-0">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
