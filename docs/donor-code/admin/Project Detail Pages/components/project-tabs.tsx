"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TasksTable } from "./tasks-table";
import { EventsTable } from "./events-table";
import { TransactionsPanel } from "./transactions-panel";
import { AttachmentsPanel } from "./attachments-panel";
import { CheckSquare, CalendarDays, Receipt, Paperclip } from "lucide-react";

type Tab = "tasks" | "events" | "transactions" | "attachments";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "tasks",        label: "Tasks",        icon: CheckSquare },
  { id: "events",       label: "Events",       icon: CalendarDays },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "attachments",  label: "Attachments",  icon: Paperclip },
];

export function ProjectTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("tasks");

  return (
    <section className="glass-card rounded-2xl overflow-hidden flex flex-col">
      {/* Tab bar */}
      <div
        className="flex overflow-x-auto border-b border-border scrollbar-none"
        role="tablist"
        aria-label="Project details"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
                active
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div className="p-4 sm:p-6">
        {activeTab === "tasks" && (
          <div
            id="tabpanel-tasks"
            role="tabpanel"
            aria-labelledby="tab-tasks"
          >
            <TasksTable />
          </div>
        )}
        {activeTab === "events" && (
          <div
            id="tabpanel-events"
            role="tabpanel"
            aria-labelledby="tab-events"
          >
            <EventsTable />
          </div>
        )}
        {activeTab === "transactions" && (
          <div
            id="tabpanel-transactions"
            role="tabpanel"
            aria-labelledby="tab-transactions"
          >
            <TransactionsPanel />
          </div>
        )}
        {activeTab === "attachments" && (
          <div
            id="tabpanel-attachments"
            role="tabpanel"
            aria-labelledby="tab-attachments"
          >
            <AttachmentsPanel />
          </div>
        )}
      </div>
    </section>
  );
}
