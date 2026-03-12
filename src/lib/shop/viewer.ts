/**
 * Shop viewer context: who is viewing the shop (anonymous or member + MAGs).
 * Used by shop product list/detail to apply membership visibility.
 */

import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { getMemberMagIds } from "@/lib/auth/gallery-access";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { isMembershipEnabledForCurrentTenant } from "@/lib/supabase/tenant-sites";
import type { UserMetadata } from "@/lib/auth/supabase-auth";

export interface ShopViewer {
  userId: string | null;
  isMember: boolean;
  magIds: string[];
  bypass: boolean;
}

/**
 * Resolve current shop viewer and membership-enabled flag.
 * Call from shop API routes or server components.
 */
export async function getShopViewer(): Promise<{
  viewer: ShopViewer;
  membershipEnabled: boolean;
}> {
  const membershipEnabled = await isMembershipEnabledForCurrentTenant();
  const supabase = await createServerSupabaseClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = await getRoleForCurrentUser();
  const bypass =
    !!user && role !== null && (isSuperadminFromRole(role) || isAdminRole(role));

  const metadata = user?.user_metadata as UserMetadata | undefined;
  const isMember = metadata?.type === "member";
  const magIds =
    user && isMember ? await getMemberMagIds(supabase, user.id) : [];

  const viewer: ShopViewer = {
    userId: user?.id ?? null,
    isMember: !!isMember,
    magIds,
    bypass,
  };

  return { viewer, membershipEnabled };
}
