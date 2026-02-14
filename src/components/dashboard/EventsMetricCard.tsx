import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface EventsMetricCardProps {
  total: number;
  byType: { event_type: string | null; count: number }[];
  recurringCount?: number;
  publicCount?: number;
  privateCount?: number;
}

export function EventsMetricCard({
  total,
  byType,
  recurringCount = 0,
  publicCount = 0,
  privateCount = 0,
}: EventsMetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Events</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{total.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">Total events on calendar</p>
        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          <li className="flex justify-between gap-2">
            <span className="truncate">Recurring Events</span>
            <span className="shrink-0">{recurringCount}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="truncate">Public Events</span>
            <span className="shrink-0">{publicCount}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="truncate">Private Events</span>
            <span className="shrink-0">{privateCount}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
