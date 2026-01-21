/**
 * Integration management utilities for third-party scripts.
 * Handles Google Analytics, VisitorTracking.com, and SimpleCommenter.com configuration.
 */

import { createServerSupabaseClient } from "./client";

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
 * 
 * @returns Array of integration configurations
 */
export async function getIntegrations(): Promise<Integration[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching integrations:", error);
    return [];
  }

  return data || [];
}

/**
 * Get a specific integration by name.
 * 
 * @param name - Integration name (e.g., 'google_analytics')
 * @returns Integration configuration or null
 */
export async function getIntegrationConfig(
  name: string
): Promise<Integration | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("name", name)
    .single();

  if (error) {
    console.error(`Error fetching integration ${name}:`, error);
    return null;
  }

  return data;
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
    .from("integrations")
    .update(updateData)
    .eq("name", name)
    .select()
    .single();

  if (error) {
    console.error(`Error updating integration ${name}:`, error);
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
