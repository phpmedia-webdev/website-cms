import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface EventsMetricCardProps {
  total: number;
  byType: { event_type: string | null; count: number }[];
}

export function EventsMetricCard({ total, byType }: EventsMetricCardProps) {
  const topTypes = byType.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Events</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{total.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">Total on calendar</p>
        {topTypes.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {topTypes.map(({ event_type, count }) => (
              <li key={event_type ?? "(none)"} className="flex justify-between gap-2">
                <span className="truncate">{event_type ?? "(no type)"}</span>
                <span className="shrink-0">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
