import { getContacts, getMags, getMarketingLists, getAllContactMags, getAllContactMarketingLists } from "@/lib/supabase/crm";
import { getAllTaxonomyTerms, getSectionTaxonomyConfigs } from "@/lib/supabase/taxonomy";
import { getContactTaxonomyTermIds } from "@/lib/supabase/crm-taxonomy";
import { ContactsListClient } from "./ContactsListClient";

export default async function ContactsPage() {
  const [
    contacts,
    mags,
    marketingLists,
    contactMags,
    contactLists,
    taxonomyTerms,
    sectionConfigs,
  ] = await Promise.all([
    getContacts(),
    getMags(),
    getMarketingLists(),
    getAllContactMags(),
    getAllContactMarketingLists(),
    getAllTaxonomyTerms(),
    getSectionTaxonomyConfigs(),
  ]);

  const contactIds = contacts.map((c) => c.id);
  const contactTermIds = await getContactTaxonomyTermIds(contactIds);

  return (
    <ContactsListClient
      contacts={contacts}
      contactMags={contactMags}
      contactLists={contactLists}
      contactTermIds={contactTermIds}
      mags={mags}
      marketingLists={marketingLists}
      taxonomyTerms={taxonomyTerms}
      sectionConfigs={sectionConfigs}
    />
  );
}
