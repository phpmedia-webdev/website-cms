"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, Bot } from "lucide-react";
import { DashboardActivityStream } from "@/components/dashboard/DashboardActivityStream";
import { RagKnowledgeCard } from "@/components/dashboard/RagKnowledgeCard";
import type { MessageCenterStreamItem } from "@/lib/message-center/admin-stream";

interface DashboardTabsClientProps {
  messageCenterItems: MessageCenterStreamItem[];
  messageCenterUnread?: number;
  ragStats: { totalTokens: number; partCount: number; totalChars: number };
  ragUrls: string[];
}

export function DashboardTabsClient({
  messageCenterItems,
  messageCenterUnread = 0,
  ragStats,
  ragUrls,
}: DashboardTabsClientProps) {
  const [tab, setTab] = useState<string>("messages");

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 gap-1 h-auto min-h-9 p-1">
        <TabsTrigger value="messages" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-1.5 whitespace-normal h-auto">
          <Activity className="h-3.5 w-3.5 shrink-0" />
          <span className="text-left leading-tight">
            Message Center
            {messageCenterUnread > 0 ? ` (${messageCenterUnread})` : ""}
          </span>
        </TabsTrigger>
        <TabsTrigger value="rag" className="flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5" />
          RAG
        </TabsTrigger>
      </TabsList>
      <TabsContent value="messages" className="mt-4">
        <DashboardActivityStream initialItems={messageCenterItems} />
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
