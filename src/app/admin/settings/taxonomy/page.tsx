import { TaxonomySettings } from "@/components/settings/TaxonomySettings";

export default function TaxonomySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Taxonomy</h1>
        <p className="text-muted-foreground mt-2">
          Manage sections, categories, and tags for organizing content
        </p>
      </div>
      <TaxonomySettings />
    </div>
  );
}
