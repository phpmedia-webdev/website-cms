import { getContacts, getTrashedContacts, getMags, getMarketingLists, getAllContactMags, getAllContactMarketingLists } from "@/lib/supabase/crm";
import { getAllTaxonomyTerms, getSectionTaxonomyConfigs } from "@/lib/supabase/taxonomy";
import { getContactTaxonomyTermIds } from "@/lib/supabase/crm-taxonomy";
import { getCrmContactStatuses } from "@/lib/supabase/settings";
import { ContactsListClient } from "./ContactsListClient";

export default async function ContactsPage() {
  const [
    contacts,
    trashedContacts,
    mags,
    marketingLists,
    contactMags,
    contactLists,
    taxonomyTerms,
    sectionConfigs,
    contactStatuses,
  ] = await Promise.all([
    getContacts(),
    getTrashedContacts(),
    getMags(true),
    getMarketingLists(),
    getAllContactMags(),
    getAllContactMarketingLists(),
    getAllTaxonomyTerms(),
    getSectionTaxonomyConfigs(),
    getCrmContactStatuses(),
  ]);

  const contactIds = [...contacts.map((c) => c.id), ...trashedContacts.map((c) => c.id)];
  const contactTermIds = contactIds.length > 0 ? await getContactTaxonomyTermIds(contactIds) : [];

  return (
    <ContactsListClient
      contacts={contacts}
      trashedContacts={trashedContacts}
      contactMags={contactMags}
      contactLists={contactLists}
      contactTermIds={contactTermIds}
      mags={mags}
      marketingLists={marketingLists}
      taxonomyTerms={taxonomyTerms}
      sectionConfigs={sectionConfigs}
      contactStatuses={contactStatuses}
    />
  );
}
