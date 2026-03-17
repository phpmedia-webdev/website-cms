import { getProjectStatusTerms, getProjectTypeTerms } from "@/lib/supabase/projects";
import { ProjectNewClient } from "./ProjectNewClient";

export default async function NewProjectPage() {
  const [statusTerms, typeTerms] = await Promise.all([
    getProjectStatusTerms(),
    getProjectTypeTerms(),
  ]);
  return (
    <ProjectNewClient statusTerms={statusTerms} typeTerms={typeTerms} />
  );
}
