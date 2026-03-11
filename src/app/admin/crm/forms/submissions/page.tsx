import { getForms, getFormSubmissionsList } from "@/lib/supabase/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmissionsListClient } from "./SubmissionsListClient";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function parseDateRange(
  preset: string | null,
  dateFrom: string | null,
  dateTo: string | null
): { from: string | null; to: string | null } {
  if (preset === "all") {
    return { from: null, to: null };
  }
  const now = new Date();
  if (preset === "24h") {
    const from = new Date(now);
    from.setHours(from.getHours() - 24);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (preset === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (preset === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (preset === "custom" && dateFrom?.trim() && dateTo?.trim()) {
    return { from: new Date(dateFrom).toISOString(), to: new Date(dateTo).toISOString() };
  }
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString(), to: now.toISOString() };
}

interface Props {
  searchParams: Promise<{
    formId?: string;
    preset?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function AllFormSubmissionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const formId = params.formId?.trim() || undefined;
  const preset = params.preset?.trim() || "30d";
  const dateFromParam = params.dateFrom?.trim() || null;
  const dateToParam = params.dateTo?.trim() || null;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSizeParam = parseInt(params.pageSize || "25", 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeParam as (typeof PAGE_SIZE_OPTIONS)[number])
    ? (pageSizeParam as (typeof PAGE_SIZE_OPTIONS)[number])
    : DEFAULT_PAGE_SIZE;

  const { from, to } = parseDateRange(preset, dateFromParam, dateToParam);
  const offset = (page - 1) * pageSize;

  const forms = await getForms();
  const { submissions, total } = await getFormSubmissionsList({
    formId: formId || null,
    dateFrom: from,
    dateTo: to,
    limit: pageSize,
    offset,
  });

  const submissionsWithFormId = submissions.map((s) => ({ ...s, formId: s.form_id }));

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">Form submissions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Filter by form and date range · paginated
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Filter by form and date range (presets or custom). Use the Inbox icon on a form (CRM → Forms) to see only that form's submissions.
          </p>
        </CardHeader>
        <CardContent>
          <SubmissionsListClient
            forms={forms.map((f) => ({ id: f.id, name: f.name }))}
            submissions={submissionsWithFormId}
            total={total}
            page={page}
            pageSize={pageSize}
            formId={formId ?? "all"}
            preset={preset}
            dateFrom={dateFromParam ?? ""}
            dateTo={dateToParam ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
