"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export function IntegrationsManager() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state for each integration
  const [formData, setFormData] = useState<Record<string, { enabled: boolean; config: Record<string, string> }>>({});

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await fetch("/api/admin/integrations");
      if (!response.ok) {
        throw new Error("Failed to load integrations");
      }
      const data = await response.json();
      setIntegrations(data);

      // Initialize form data
      const initialFormData: Record<string, { enabled: boolean; config: Record<string, string> }> = {};
      for (const integration of data) {
        initialFormData[integration.name] = {
          enabled: integration.enabled,
          config: { ...integration.config },
        };
      }
      setFormData(initialFormData);
    } catch (error) {
      console.error("Error loading integrations:", error);
      setErrors({ general: "Failed to load integrations" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (integrationName: string) => {
    setSaving((prev) => ({ ...prev, [integrationName]: true }));
    setErrors((prev) => ({ ...prev, [integrationName]: "" }));

    try {
      const integration = integrations.find((i) => i.name === integrationName);
      if (!integration) return;

      const data = formData[integrationName];
      const response = await fetch("/api/admin/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: integrationName,
          enabled: data.enabled,
          config: data.config,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update integration");
      }

      const updated = await response.json();
      setIntegrations((prev) =>
        prev.map((i) => (i.name === integrationName ? updated : i))
      );

      // Update form data to match saved state
      setFormData((prev) => ({
        ...prev,
        [integrationName]: {
          enabled: updated.enabled,
          config: { ...updated.config },
        },
      }));
    } catch (error: any) {
      console.error(`Error updating ${integrationName}:`, error);
      setErrors((prev) => ({
        ...prev,
        [integrationName]: error.message || "Failed to update",
      }));
    } finally {
      setSaving((prev) => ({ ...prev, [integrationName]: false }));
    }
  };

  const handleInputChange = (integrationName: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [integrationName]: {
        ...prev[integrationName],
        config: {
          ...prev[integrationName].config,
          [field]: value,
        },
      },
    }));
  };

  const handleToggle = (integrationName: string, enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [integrationName]: {
        ...prev[integrationName],
        enabled,
      },
    }));
  };

  const getIntegrationDisplayName = (name: string) => {
    const names: Record<string, string> = {
      google_analytics: "Google Analytics",
      visitor_tracking: "VisitorTracking.com",
      simple_commenter: "SimpleCommenter.com",
    };
    return names[name] || name;
  };

  const getIntegrationDescription = (name: string) => {
    const descriptions: Record<string, string> = {
      google_analytics: "Website analytics and visitor tracking via Google Analytics 4 (GA4)",
      visitor_tracking: "Visitor tracking and analytics service",
      simple_commenter: "Hybrid tenant feedback tool: tenant turns on via special URL, adds pinpoint comments for iterative updates, turns off when not needed. Script always deployed on forked sites. Not for blog comments.",
    };
    return descriptions[name] || "";
  };

  const getConfigFieldLabel = (name: string) => {
    const labels: Record<string, string> = {
      google_analytics: "Measurement ID",
      visitor_tracking: "Website ID",
      simple_commenter: "Domain",
    };
    return labels[name] || "Configuration";
  };

  const getConfigFieldPlaceholder = (name: string) => {
    const placeholders: Record<string, string> = {
      google_analytics: "G-XXXXXXXXXX",
      visitor_tracking: "db56eb76-3e22-4504-9ded-70654eb4c77b",
      simple_commenter: "soncountry.com",
    };
    return placeholders[name] || "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errors.general && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {errors.general}
        </div>
      )}

      {integrations.map((integration) => {
        const formState = formData[integration.name];
        const hasChanges =
          formState.enabled !== integration.enabled ||
          JSON.stringify(formState.config) !== JSON.stringify(integration.config);
        const isConfigured = 
          formState.config.measurement_id || 
          formState.config.websiteId || 
          formState.config.domain ||
          formState.config.vendor_uid;

        return (
          <Card key={integration.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {getIntegrationDisplayName(integration.name)}
                    {isConfigured && formState.enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {getIntegrationDescription(integration.name)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formState.enabled}
                      onChange={(e) => handleToggle(integration.name, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span>Enabled</span>
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {getConfigFieldLabel(integration.name)}
                </label>
                <Input
                  type="text"
                  placeholder={getConfigFieldPlaceholder(integration.name)}
                  value={
                    integration.name === "google_analytics"
                      ? formState.config.measurement_id || ""
                      : integration.name === "visitor_tracking"
                      ? formState.config.websiteId || ""
                      : integration.name === "simple_commenter"
                      ? formState.config.domain || ""
                      : formState.config.vendor_uid || ""
                  }
                  onChange={(e) => {
                    const fieldName =
                      integration.name === "google_analytics"
                        ? "measurement_id"
                        : integration.name === "visitor_tracking"
                        ? "websiteId"
                        : integration.name === "simple_commenter"
                        ? "domain"
                        : "vendor_uid";
                    handleInputChange(integration.name, fieldName, e.target.value);
                  }}
                />
              </div>

              {errors[integration.name] && (
                <div className="text-sm text-destructive">{errors[integration.name]}</div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {(formState.config.measurement_id || formState.config.websiteId || formState.config.domain || formState.config.vendor_uid) && formState.enabled
                    ? "Configured and active"
                    : (formState.config.measurement_id || formState.config.websiteId || formState.config.domain || formState.config.vendor_uid)
                    ? "Configured but disabled"
                    : "Not configured"}
                </div>
                <Button
                  onClick={() => handleUpdate(integration.name)}
                  disabled={!hasChanges || saving[integration.name]}
                >
                  {saving[integration.name] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
