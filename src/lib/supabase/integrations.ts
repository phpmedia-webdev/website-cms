/**
 * Integration management utilities for third-party scripts.
 * Handles Google Analytics, VisitorTracking.com, and SimpleCommenter.com configuration.
 *
 * SimpleCommenter is a hybrid tenant feedback tool for iterative updates: script is always
 * deployed on forked tenant sites; tenant turns it on via a special URL, adds comments, turns off when not needed. Not a blog comment system.
 *
 * Per prd-technical: read operations use RPC (not .from()); RPCs in public schema query client schema.
 */

import { createServerSupabaseClient } from "./client";

const INTEGRATIONS_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export interface IntegrationConfig {
  google_analytics?: {
    enabled: boolean;
    measurement_id?: string;
  };
  visitor_tracking?: {
    enabled: boolean;
    vendor_uid?: string;
  };
  simple_commenter?: {
    enabled: boolean;
    vendor_uid?: string;
  };
}

export interface Integration {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Get all integration settings.
 * Uses RPC per prd-technical (read operations use .rpc(), not .from()).
 *
 * @returns Array of integration configurations
 */
export async function getIntegrations(): Promise<Integration[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc("get_integrations_dynamic", {
    schema_name: INTEGRATIONS_SCHEMA,
  });

  if (error) {
    console.error("Error fetching integrations:", { message: error.message, code: error.code });
    return [];
  }

  return (data as Integration[]) || [];
}

/**
 * Get a specific integration by name.
 * Uses RPC per prd-technical (read operations use .rpc(), not .from()).
 *
 * @param name - Integration name (e.g., 'google_analytics')
 * @returns Integration configuration or null
 */
export async function getIntegrationConfig(
  name: string
): Promise<Integration | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc("get_integration_by_name_dynamic", {
    schema_name: INTEGRATIONS_SCHEMA,
    name_param: name,
  });

  if (error) {
    console.error(`Error fetching integration ${name}:`, { message: error.message, code: error.code });
    return null;
  }

  const rows = (data as Integration[] | null) ?? [];
  return rows[0] ?? null;
}

/**
 * Update integration configuration.
 * Superadmin only - should be validated by calling code.
 * 
 * @param name - Integration name
 * @param config - Updated configuration
 * @param enabled - Whether integration is enabled
 * @returns Updated integration or error
 */
export async function updateIntegration(
  name: string,
  config: Record<string, any>,
  enabled?: boolean
): Promise<{ integration: Integration | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();

  const updateData: Partial<Integration> = {
    config,
  };

  if (enabled !== undefined) {
    updateData.enabled = enabled;
  }

  const { data, error } = await supabase
    .schema(INTEGRATIONS_SCHEMA)
    .from("integrations")
    .update(updateData)
    .eq("name", name)
    .select()
    .single();

  if (error) {
    console.error(`Error updating integration ${name}:`, { message: error.message, code: error.code });
    return { integration: null, error: new Error(error.message) };
  }

  return { integration: data, error: null };
}

/**
 * Get all integrations as a keyed object for easy access.
 * 
 * @returns Object with integration names as keys
 */
export async function getIntegrationsMap(): Promise<Record<string, Integration>> {
  const integrations = await getIntegrations();
  const map: Record<string, Integration> = {};

  for (const integration of integrations) {
    map[integration.name] = integration;
  }

  return map;
}

/**
 * Check if a specific integration is enabled and configured.
 * 
 * @param name - Integration name
 * @returns true if enabled and has required config
 */
export async function isIntegrationActive(name: string): Promise<boolean> {
  const integration = await getIntegrationConfig(name);

  if (!integration || !integration.enabled) {
    return false;
  }

  // Check if required config fields are present
  switch (name) {
    case "google_analytics":
      return !!integration.config.measurement_id;
    case "visitor_tracking":
      return !!integration.config.websiteId;
    case "simple_commenter":
      return !!integration.config.domain;
    default:
      return false;
  }
}
