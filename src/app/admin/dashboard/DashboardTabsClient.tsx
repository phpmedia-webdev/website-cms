"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, Bot } from "lucide-react";
import { DashboardActivityStream } from "@/components/dashboard/DashboardActivityStream";
import { RagKnowledgeCard } from "@/components/dashboard/RagKnowledgeCard";
import type { DashboardActivityItem } from "@/lib/supabase/crm";

interface DashboardTabsClientProps {
  activityItems: DashboardActivityItem[];
  ragStats: { totalTokens: number; partCount: number; totalChars: number };
  ragUrls: string[];
}

export function DashboardTabsClient({
  activityItems,
  ragStats,
  ragUrls,
}: DashboardTabsClientProps) {
  const [tab, setTab] = useState<string>("messages");

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 gap-1 h-auto min-h-9 p-1">
        <TabsTrigger value="messages" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-1.5 whitespace-normal h-auto">
          <Activity className="h-3.5 w-3.5 shrink-0" />
          <span className="text-left leading-tight">Messages and Notifications</span>
        </TabsTrigger>
        <TabsTrigger value="rag" className="flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5" />
          RAG
        </TabsTrigger>
      </TabsList>
      <TabsContent value="messages" className="mt-4">
        <DashboardActivityStream initialItems={activityItems} />
      </TabsContent>
      <TabsContent value="rag" className="mt-4 space-y-4">
        <RagKnowledgeCard
          totalTokens={ragStats.totalTokens}
          partCount={ragStats.partCount}
          totalChars={ragStats.totalChars}
          urls={ragUrls}
        />
      </TabsContent>
    </Tabs>
  );
}
