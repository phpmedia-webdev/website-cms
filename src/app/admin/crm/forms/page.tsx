import { getCrmCustomFields, getForms } from "@/lib/supabase/crm";
import { getSiteUrl } from "@/lib/supabase/settings";
import { CrmFormsClient } from "./CrmFormsClient";

export default async function CrmFormsPage() {
  const [customFields, forms, siteUrl] = await Promise.all([
    getCrmCustomFields(),
    getForms(),
    getSiteUrl(),
  ]);
  const baseUrl = siteUrl || "";

  return (
    <div className="p-6">
      <CrmFormsClient
        initialCustomFields={customFields}
        initialForms={forms}
        siteUrl={baseUrl}
      />
    </div>
  );
}
