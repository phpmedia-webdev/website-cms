"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormSubmission } from "@/lib/supabase/crm";

type SubmissionWithForm = FormSubmission & { formName: string; formId: string };

type FormOption = { id: string; name: string };

interface SubmissionsListClientProps {
  forms: FormOption[];
  submissions: SubmissionWithForm[];
}

export function SubmissionsListClient({
  forms,
  submissions,
}: SubmissionsListClientProps) {
  const [formFilter, setFormFilter] = useState<string>("all");
  const filtered =
    formFilter === "all"
      ? submissions
      : submissions.filter((s) => s.formId === formFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">
          Filter by form:
        </label>
        <Select value={formFilter} onValueChange={setFormFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All forms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All forms</SelectItem>
            {forms.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {submissions.length} submissions
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {submissions.length === 0
            ? "No submissions yet."
            : "No submissions for this form."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Form</th>
                <th className="text-left py-2 pr-4 font-medium">Submitted</th>
                <th className="text-left py-2 pr-4 font-medium">Contact</th>
                <th className="text-left py-2 font-medium">Payload</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/crm/forms/${s.formId}/submissions`}
                      className="text-primary hover:underline"
                    >
                      {s.formName}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                    {new Date(s.submitted_at).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4">
                    {s.contact_id ? (
                      <Link
                        href={`/admin/crm/contacts/${s.contact_id}`}
                        className="text-primary hover:underline"
                      >
                        View contact
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-w-md">
                      {JSON.stringify(s.payload, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
