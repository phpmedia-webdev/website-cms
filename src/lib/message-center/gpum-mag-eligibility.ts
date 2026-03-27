/**
 * GPUM MAG visibility: strict gate for conversation picker / participation;
 * see plan-gpum-message-center-mvp.md.
 */

import { getContactMags } from "@/lib/supabase/crm";
import { getProfileByUserId } from "@/lib/supabase/profiles";
import { getMemberMagMessagingPrefsForUser } from "@/lib/supabase/member-mag-messaging";

/** MAG appears in conversation list / can post only when all are true (MVP rule). */
export async function memberCanSeeMagGroupThread(
  contactId: string,
  authUserId: string,
  magId: string
): Promise<boolean> {
  const cid = contactId.trim();
  const mid = magId.trim();
  if (!cid || !mid) return false;
  const mags = await getContactMags(cid);
  if (!mags.some((m) => m.mag_id === mid)) return false;
  const prefs = await getMemberMagMessagingPrefsForUser(authUserId);
  if (!prefs?.mag_community_messaging_enabled) return false;
  const row = prefs.mags.find((m) => m.mag_id === mid);
  if (!row?.opted_in) return false;
  const profile = await getProfileByUserId(authUserId);
  if (!profile?.handle?.trim()) return false;
  return true;
}

/** Read access to MAG room transcript: any enrolled member or stricter gate caller may layer on. */
export async function memberEnrolledInMag(contactId: string, magId: string): Promise<boolean> {
  const mags = await getContactMags(contactId.trim());
  return mags.some((m) => m.mag_id === magId.trim());
}
