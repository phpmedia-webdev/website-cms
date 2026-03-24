"use client";

import { mockTransactions, type Transaction } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const TYPE_MAP: Record<Transaction["type"], { label: string; className: string; icon: React.ElementType }> = {
  expense: { label: "Expense", className: "bg-red-100 text-red-700 border border-red-200", icon: TrendingDown },
  invoice: { label: "Invoice", className: "bg-amber-100 text-amber-700 border border-amber-200", icon: DollarSign },
  payment: { label: "Payment", className: "bg-emerald-100 text-emerald-700 border border-emerald-200", icon: TrendingUp },
};

const STATUS_MAP: Record<Transaction["status"], { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-amber-50 text-amber-600 border border-amber-200" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-700 border border-blue-200" },
  paid:     { label: "Paid",     className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 border border-red-200" },
};

function fmt(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function TransactionsPanel() {
  const txns = mockTransactions;
  const total = txns.reduce((s, t) => s + (t.type === "payment" ? t.amount : -t.amount), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {(["expense", "invoice", "payment"] as Transaction["type"][]).map((type) => {
          const cfg = TYPE_MAP[type];
          const Icon = cfg.icon;
          const sum = txns
            .filter((t) => t.type === type)
            .reduce((s, t) => s + t.amount, 0);
          return (
            <div key={type} className="glass-card rounded-xl p-3 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide font-medium">
                <Icon className="size-3.5" />{cfg.label}s
              </span>
              <span className="font-bold text-foreground text-sm">{fmt(sum)}</span>
            </div>
          );
        })}
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block overflow-x-auto rounded-xl">
        <table className="w-full text-sm border-collapse" aria-label="Project transactions">
          <thead>
            <tr className="glass-card border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t, i) => {
              const typeCfg = TYPE_MAP[t.type];
              const statusCfg = STATUS_MAP[t.status];
              const TypeIcon = typeCfg.icon;
              return (
                <tr
                  key={t.id}
                  className={cn(
                    "border-b border-border/50 hover:bg-primary/5 transition-colors",
                    i % 2 === 0 ? "bg-card/40" : "bg-card/20"
                  )}
                >
                  <td className="pl-4 pr-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{t.description}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{t.id}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", typeCfg.className)}>
                      <TypeIcon className="size-3" />{typeCfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{t.category}</td>
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{t.date}</td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full", statusCfg.className)}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="pl-3 pr-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                    {fmt(t.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="glass-card border-t border-border">
              <td colSpan={5} className="pl-4 py-3 text-sm font-semibold text-foreground">Net Cash Flow</td>
              <td className={cn("pr-4 py-3 text-right font-bold text-sm", total >= 0 ? "text-emerald-600" : "text-red-600")}>
                {total >= 0 ? "+" : ""}{fmt(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {txns.map((t) => {
          const typeCfg = TYPE_MAP[t.type];
          const statusCfg = STATUS_MAP[t.status];
          return (
            <div key={t.id} className="glass-card rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-foreground text-sm">{t.description}</span>
                <span className="font-bold text-foreground text-sm whitespace-nowrap">{fmt(t.amount)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={cn("inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full", typeCfg.className)}>{typeCfg.label}</span>
                <span className={cn("inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full", statusCfg.className)}>{statusCfg.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t.category}</span>
                <span>{t.date}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
