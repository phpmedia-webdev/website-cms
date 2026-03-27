/**
 * Resolve staff role + real name and CRM contact names for thread message rows (admin Message Center transcript).
 */

import { getRealNameLabelForUser } from "@/lib/blog-comments/author-name";
import { getAdminRoleDisplayLabel } from "@/lib/php-auth/role-mapping";
import { getUserById } from "@/lib/supabase/users";
import {
  getTenantUserByAuthUserId,
  getRoleForUserOnSite,
} from "@/lib/supabase/tenant-users";
import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import { getClientSchema } from "@/lib/supabase/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server-service";

const CRM_SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export type ThreadMessageAuthorMeta = { roleLabel: string; displayName: string };

type MessageAuthorRow = {
  author_user_id: string | null;
  author_contact_id: string | null;
};

/**
 * Batch-resolve auth users (role on current tenant site + real name) and CRM contacts (display name).
 */
export async function enrichThreadMessageAuthors(
  messages: MessageAuthorRow[]
): Promise<{
  authors: Record<string, ThreadMessageAuthorMeta>;
  contactNames: Record<string, string>;
  /** GPUM / member-facing: "First Last" when present, else full_name, else email (admin `contactNames` prefers full_name first). */
  memberContactNames: Record<string, string>;
}> {
  const staffIds = [
    ...new Set(
      messages
        .map((m) => m.author_user_id?.trim())
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ];
  const contactIds = [
    ...new Set(
      messages
        .map((m) => m.author_contact_id?.trim())
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ];

  const schema = getClientSchema();
  const site = await getTenantSiteBySchema(schema);
  const tenantSiteId = site?.id ?? null;

  const authors: Record<string, ThreadMessageAuthorMeta> = {};
  await Promise.all(
    staffIds.map(async (uid) => {
      const displayName = await getRealNameLabelForUser(uid);
      let roleLabel = "Team";
      const tenantUser = await getTenantUserByAuthUserId(uid);
      if (tenantUser && tenantSiteId) {
        const slug = await getRoleForUserOnSite(tenantUser.id, tenantSiteId);
        roleLabel = getAdminRoleDisplayLabel(slug);
      } else {
        const { user } = await getUserById(uid);
        const meta = user?.user_metadata as Record<string, unknown> | undefined;
        if (meta?.type === "superadmin" || meta?.role === "superadmin") {
          roleLabel = "SuperAdmin";
        }
      }
      authors[uid] = { roleLabel, displayName };
    })
  );

  const contactNames: Record<string, string> = {};
  const memberContactNames: Record<string, string> = {};
  if (contactIds.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .schema(CRM_SCHEMA)
      .from("crm_contacts")
      .select("id, full_name, first_name, last_name, email")
      .in("id", contactIds);
    for (const row of (data ?? []) as Array<{
      id: string;
      full_name: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }>) {
      const firstLast = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
      const adminOrder =
        row.full_name?.trim() ||
        firstLast ||
        row.email?.trim() ||
        "Contact";
      contactNames[row.id] = adminOrder;
      const memberOrder = firstLast || row.full_name?.trim() || row.email?.trim() || "Contact";
      memberContactNames[row.id] = memberOrder;
    }
  }

  return { authors, contactNames, memberContactNames };
}
