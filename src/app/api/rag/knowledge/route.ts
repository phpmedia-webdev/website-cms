/**
 * RAG Knowledge Export — public endpoint for chatbot training.
 * GET /api/rag/knowledge?part=1 (part is 1-based; omit or part=1 returns first segment).
 * Returns text/plain. Header X-RAG-Parts indicates total number of parts when multiple.
 */

import { getRagKnowledgePart, getRagStats } from "@/lib/rag";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const partParam = searchParams.get("part");
  const partNumber = partParam ? Math.max(1, parseInt(partParam, 10) || 1) : 1;

  const content = await getRagKnowledgePart(partNumber);
  if (content === null) {
    return new Response("Part not found or no content.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const { partCount } = await getRagStats();
  const headers: HeadersInit = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=60",
  };
  if (partCount > 1) {
    headers["X-RAG-Parts"] = String(partCount);
  }

  return new Response(content, { status: 200, headers });
}
