import { getCrmCustomFields, getForms } from "@/lib/supabase/crm";
import { CrmFormsClient } from "./CrmFormsClient";

export default async function CrmFormsPage() {
  const [customFields, forms] = await Promise.all([
    getCrmCustomFields(),
    getForms(),
  ]);

  return (
    <div className="p-6">
      <CrmFormsClient
        initialCustomFields={customFields}
        initialForms={forms}
      />
    </div>
  );
}
