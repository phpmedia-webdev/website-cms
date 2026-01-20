"use client";

import { useState, useEffect } from "react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Download, MessageSquare } from "lucide-react";

interface FormSubmissionsTableProps {
  formId: string;
}

export function FormSubmissionsTable({ formId }: FormSubmissionsTableProps) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "contacted" | "archived">("all");

  useEffect(() => {
    loadSubmissions();
  }, [formId, filter]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const supabase = createClientSupabaseClient();
      let query = supabase
        .from("form_submissions")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error loading submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const supabase = createClientSupabaseClient();
      const { error } = await supabase
        .from("form_submissions")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      loadSubmissions();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  const exportCSV = () => {
    if (submissions.length === 0) return;

    const headers = Object.keys(submissions[0].data || {});
    const csv = [
      ["Date", "Status", ...headers].join(","),
      ...submissions.map((sub) => {
        const date = format(new Date(sub.created_at), "yyyy-MM-dd HH:mm:ss");
        const status = sub.status;
        const values = headers.map((h) => {
          const value = sub.data[h];
          return typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value;
        });
        return [date, status, ...values].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-submissions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Submissions ({submissions.length})</CardTitle>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as typeof filter)
              }
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="archived">Archived</option>
            </select>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(submission.created_at), "PPpp")}
                      </p>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                          submission.status === "new"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : submission.status === "contacted"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {submission.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={submission.status}
                        onChange={(e) =>
                          updateStatus(submission.id, e.target.value)
                        }
                        className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {Object.entries(submission.data || {}).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="font-medium text-sm w-32">{key}:</span>
                        <span className="text-sm flex-1">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {submission.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm">
                        <span className="font-medium">Notes:</span> {submission.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
