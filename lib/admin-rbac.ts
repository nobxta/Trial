import { getAdminUser, AdminTokenPayload } from './admin-auth';
import { redirect } from 'next/navigation';

export type AdminRole = 'viewer' | 'operator' | 'super_admin';

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  viewer: 1,
  operator: 2,
  super_admin: 3,
};

/**
 * Check if a role has sufficient permissions
 */
export function hasRole(adminRole: AdminRole, requiredRole: AdminRole): boolean {
  return ROLE_HIERARCHY[adminRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Require admin authentication and optionally check role
 * Returns admin user or redirects to 404 (not found page)
 */
export async function requireAdmin(
  requiredRole?: AdminRole
): Promise<AdminTokenPayload> {
  const admin = await getAdminUser();
  
  if (!admin) {
    // Redirect to 404 page for non-admins
    redirect('/admin/not-found');
  }
  
  if (requiredRole && !hasRole(admin.role, requiredRole)) {
    redirect('/admin');
  }
  
  return admin;
}

/**
 * Check if admin can perform action (for API routes)
 * Throws error if not authorized
 */
export async function requireAdminRole(
  requiredRole: AdminRole
): Promise<AdminTokenPayload> {
  const admin = await getAdminUser();
  
  if (!admin) {
    throw new Error('Unauthorized: Admin authentication required');
  }
  
  if (!hasRole(admin.role, requiredRole)) {
    throw new Error(`Forbidden: Requires ${requiredRole} role`);
  }
  
  return admin;
}

/**
 * Check if admin can perform write operations
 */
export function canWrite(role: AdminRole): boolean {
  return role !== 'viewer';
}

/**
 * Check if admin can manage settings
 */
export function canManageSettings(role: AdminRole): boolean {
  return role === 'super_admin';
}

/**
 * Check if admin can manage other admins
 */
export function canManageAdmins(role: AdminRole): boolean {
  return role === 'super_admin';
}

