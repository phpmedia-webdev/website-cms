/**
 * GPUM MAG community messaging preferences (global + per-MAG opt-in).
 * Requires migration 214 columns/tables.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server-service";
import { getClientSchema } from "@/lib/supabase/schema";
import { getMemberByUserId } from "@/lib/supabase/members";
import { getContactMags } from "@/lib/supabase/crm";

export interface MemberMagMessagingRow {
  mag_id: string;
  mag_name: string;
  opted_in: boolean;
}

export async function getMemberMagMessagingPrefsForUser(authUserId: string): Promise<{
  mag_community_messaging_enabled: boolean;
  mags: MemberMagMessagingRow[];
} | null> {
  const member = await getMemberByUserId(authUserId);
  if (!member) return null;
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data: contactRow, error: cErr } = await supabase
    .schema(schema)
    .from("crm_contacts")
    .select("mag_community_messaging_enabled")
    .eq("id", member.contact_id)
    .maybeSingle();
  if (cErr) {
    console.error("getMemberMagMessagingPrefsForUser contact:", cErr.message);
    return null;
  }
  const raw = (contactRow as { mag_community_messaging_enabled?: boolean } | null)
    ?.mag_community_messaging_enabled;
  const globalOn = raw === true;

  const mags = await getContactMags(member.contact_id);
  const { data: optRows, error: oErr } = await supabase
    .schema(schema)
    .from("crm_contact_mag_community_opt_in")
    .select("mag_id")
    .eq("contact_id", member.contact_id);
  if (oErr) {
    console.error("getMemberMagMessagingPrefsForUser opt-in:", oErr.message);
  }
  const opted = new Set((optRows as { mag_id: string }[] | null)?.map((r) => r.mag_id) ?? []);

  return {
    mag_community_messaging_enabled: globalOn,
    mags: mags.map((m) => ({
      mag_id: m.mag_id,
      mag_name: m.mag_name,
      opted_in: opted.has(m.mag_id),
    })),
  };
}

export async function updateMemberMagMessagingPrefsForUser(
  authUserId: string,
  input: { mag_community_messaging_enabled: boolean; opt_in_mag_ids: string[] }
): Promise<{ ok: boolean; error: string | null }> {
  const member = await getMemberByUserId(authUserId);
  if (!member) return { ok: false, error: "Not a member" };
  const allowedMags = new Set((await getContactMags(member.contact_id)).map((m) => m.mag_id));
  for (const id of input.opt_in_mag_ids) {
    if (!allowedMags.has(id)) {
      return { ok: false, error: "Invalid MAG in opt-in list" };
    }
  }

  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const { error: uErr } = await supabase
    .schema(schema)
    .from("crm_contacts")
    .update({
      mag_community_messaging_enabled: input.mag_community_messaging_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.contact_id);

  if (uErr) {
    return { ok: false, error: uErr.message };
  }

  const { error: dErr } = await supabase
    .schema(schema)
    .from("crm_contact_mag_community_opt_in")
    .delete()
    .eq("contact_id", member.contact_id);

  if (dErr) {
    return { ok: false, error: dErr.message };
  }

  if (input.opt_in_mag_ids.length > 0) {
    const { error: iErr } = await supabase.schema(schema).from("crm_contact_mag_community_opt_in").insert(
      input.opt_in_mag_ids.map((mag_id) => ({
        contact_id: member.contact_id,
        mag_id,
      }))
    );
    if (iErr) {
      return { ok: false, error: iErr.message };
    }
  }

  return { ok: true, error: null };
}
