/**
 * User management utilities for Supabase Auth.
 * Handles creation and management of users with proper metadata structure.
 */

import { createServerSupabaseClient } from "./client";
import type { UserMetadata } from "@/lib/auth/supabase-auth";

/**
 * Create a Superadmin user (cross-tenant access).
 * Superadmins can access any schema and have platform-wide permissions.
 * 
 * @param email - User email address
 * @param password - User password
 * @param options - Optional configuration
 * @returns Created user or error
 */
export async function createSuperadminUser(
  email: string,
  password: string,
  options?: {
    role?: string;
    allowed_schemas?: string[];
    displayName?: string;
  }
) {
  const supabase = createServerSupabaseClient();

  const metadata: UserMetadata = {
    type: "superadmin",
    role: options?.role || "superadmin",
    allowed_schemas: options?.allowed_schemas || ["*"], // "*" means all schemas
  };

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for admin users
    user_metadata: {
      ...metadata,
      display_name: options?.displayName || email.split("@")[0],
    },
  });

  if (error) {
    return { error, user: null };
  }

  return { user: data.user, error: null };
}

/**
 * Create a Client Admin user (single-tenant access).
 * Client admins can only access their assigned tenant schema.
 * 
 * @param email - User email address
 * @param password - User password
 * @param tenantId - Tenant schema name (must match NEXT_PUBLIC_CLIENT_SCHEMA)
 * @param options - Optional configuration
 * @returns Created user or error
 */
export async function createClientAdminUser(
  email: string,
  password: string,
  tenantId: string,
  options?: {
    role?: "client_admin" | "editor" | "viewer";
    displayName?: string;
  }
) {
  const supabase = createServerSupabaseClient();

  const metadata: UserMetadata = {
    type: "admin",
    role: options?.role || "client_admin",
    tenant_id: tenantId, // Required for client admin
  };

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for admin users
    user_metadata: {
      ...metadata,
      display_name: options?.displayName || email.split("@")[0],
    },
  });

  if (error) {
    return { error, user: null };
  }

  return { user: data.user, error: null };
}

/**
 * Create a Member user (GPUM - General Public User with Membership).
 * Members are site visitors who have registered and have membership access.
 * 
 * @param email - User email address
 * @param password - User password
 * @param tenantId - Tenant schema name (must match NEXT_PUBLIC_CLIENT_SCHEMA)
 * @param options - Optional configuration
 * @returns Created user or error
 */
export async function createMemberUser(
  email: string,
  password: string,
  tenantId: string,
  options?: {
    displayName?: string;
  }
) {
  const supabase = createServerSupabaseClient();

  const metadata: UserMetadata = {
    type: "member",
    tenant_id: tenantId, // Required for members
  };

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // Members should confirm their email
    user_metadata: {
      ...metadata,
      display_name: options?.displayName || email.split("@")[0],
    },
  });

  if (error) {
    return { error, user: null };
  }

  return { user: data.user, error: null };
}

/**
 * Update user metadata.
 * Useful for updating roles, tenant assignments, or other metadata.
 * 
 * @param userId - User ID (UUID)
 * @param metadata - Updated metadata
 * @returns Updated user or error
 */
export async function updateUserMetadata(
  userId: string,
  metadata: Partial<UserMetadata> & { display_name?: string }
) {
  const supabase = createServerSupabaseClient();

  // Get current user to merge metadata
  const { data: currentUser, error: getUserError } = await supabase.auth.admin.getUserById(userId);
  
  if (getUserError || !currentUser.user) {
    return { error: getUserError, user: null };
  }

  // Merge with existing metadata
  const existingMetadata = (currentUser.user.user_metadata || {}) as UserMetadata;
  const updatedMetadata: UserMetadata & { display_name?: string } = {
    ...existingMetadata,
    ...metadata,
  };

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: updatedMetadata,
  });

  if (error) {
    return { error, user: null };
  }

  return { user: data.user, error: null };
}

/**
 * Delete a user.
 * 
 * @param userId - User ID (UUID)
 * @returns Success or error
 */
export async function deleteUser(userId: string) {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return { error, success: false };
  }

  return { success: true, error: null };
}

/**
 * Get user by ID.
 * 
 * @param userId - User ID (UUID)
 * @returns User or error
 */
export async function getUserById(userId: string) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    return { error, user: null };
  }

  return { user: data.user, error: null };
}

/**
 * List all users (with pagination).
 * Note: This requires admin access and may be slow for large user bases.
 * 
 * @param page - Page number (1-based)
 * @param perPage - Users per page (default: 50, max: 1000)
 * @returns Users list or error
 */
export async function listUsers(page: number = 1, perPage: number = 50) {
  const supabase = createServerSupabaseClient();

  // Supabase Admin API doesn't have built-in pagination
  // This is a placeholder - in production, you might want to use
  // a database query on auth.users table with proper pagination
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    return { error, users: [], total: 0 };
  }

  // Manual pagination
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedUsers = data.users.slice(start, end);

  return {
    users: paginatedUsers,
    total: data.users.length,
    page,
    perPage,
    error: null,
  };
}

/**
 * Update user password.
 * 
 * @param userId - User ID (UUID)
 * @param newPassword - New password
 * @returns Success or error
 */
export async function updateUserPassword(userId: string, newPassword: string) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return { error, success: false };
  }

  return { success: true, user: data.user, error: null };
}
