import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { addContactsToTermBulk, removeContactsFromTermBulk } from "@/lib/supabase/crm-taxonomy";
import {
  getAllTaxonomyTerms,
  getSectionTaxonomyConfigs,
  getTermsForContentSection,
} from "@/lib/supabase/taxonomy";

/**
 * POST /api/crm/contacts/taxonomy/bulk
 * Add or remove a single term (category or tag) for selected contacts.
 * Body: { contactIds: string[], termId: string, operation: 'add' | 'remove' }.
 * termId must be a CRM section category or tag.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { contactIds, termId, operation } = body as {
      contactIds?: string[];
      termId?: string;
      operation?: string;
    };
    if (
      !Array.isArray(contactIds) ||
      contactIds.length === 0 ||
      typeof termId !== "string" ||
      !termId.trim() ||
      (operation !== "add" && operation !== "remove")
    ) {
      return NextResponse.json(
        { error: "contactIds (non-empty array), termId (string), and operation ('add' | 'remove') are required" },
        { status: 400 }
      );
    }
    const [terms, configs] = await Promise.all([
      getAllTaxonomyTerms(),
      getSectionTaxonomyConfigs(),
    ]);
    const { categories, tags } = getTermsForContentSection(terms, configs, "crm");
    const allowedIds = new Set([
      ...categories.map((c) => c.id),
      ...tags.map((t) => t.id),
    ]);
    if (!allowedIds.has(termId)) {
      return NextResponse.json(
        { error: "Term is not a valid CRM category or tag" },
        { status: 400 }
      );
    }
    const fn = operation === "add" ? addContactsToTermBulk : removeContactsFromTermBulk;
    const { success, error } = await fn(contactIds, termId);
    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update taxonomy" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error bulk taxonomy:", error);
    return NextResponse.json(
      { error: "Failed to update taxonomy" },
      { status: 500 }
    );
  }
}
