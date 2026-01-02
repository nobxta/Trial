import { supabaseAdmin } from './supabase';
import { AdminUser } from './admin-auth';

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

export async function createAdminUser(adminData: {
  email: string;
  password: string;
  role: 'viewer' | 'operator' | 'super_admin';
}): Promise<AdminUser> {
  checkSupabase();
  
  const { hashPassword } = await import('./admin-auth');
  const hashedPassword = await hashPassword(adminData.password);
  
  const { data, error } = await supabaseAdmin!
    .from('admin_users')
    .insert({
      email: adminData.email.toLowerCase().trim(),
      password: hashedPassword,
      role: adminData.role,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create admin user: ${error.message}`);
  }

  return {
    id: data.id,
    email: data.email,
    password: data.password,
    role: data.role,
    twoFactorEnabled: data.two_factor_enabled,
    twoFactorSecret: data.two_factor_secret,
    lastLogin: data.last_login,
    createdAt: data.created_at,
  };
}

export async function getAllAdminUsers(): Promise<AdminUser[]> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch admin users: ${error.message}`);
  }

  return (data || []).map(admin => ({
    id: admin.id,
    email: admin.email,
    password: admin.password,
    role: admin.role,
    twoFactorEnabled: admin.two_factor_enabled,
    twoFactorSecret: admin.two_factor_secret,
    lastLogin: admin.last_login,
    createdAt: admin.created_at,
  }));
}

export async function updateAdminUser(
  adminId: string,
  updates: {
    email?: string;
    role?: 'viewer' | 'operator' | 'super_admin';
    password?: string;
  }
): Promise<AdminUser | null> {
  checkSupabase();
  
  const updateData: any = {};
  
  if (updates.email !== undefined) updateData.email = updates.email.toLowerCase().trim();
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.password !== undefined) {
    const { hashPassword } = await import('./admin-auth');
    updateData.password = await hashPassword(updates.password);
  }

  const { data, error } = await supabaseAdmin!
    .from('admin_users')
    .update(updateData)
    .eq('id', adminId)
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    password: data.password,
    role: data.role,
    twoFactorEnabled: data.two_factor_enabled,
    twoFactorSecret: data.two_factor_secret,
    lastLogin: data.last_login,
    createdAt: data.created_at,
  };
}

export async function deleteAdminUser(adminId: string): Promise<boolean> {
  checkSupabase();
  
  const { error } = await supabaseAdmin!
    .from('admin_users')
    .delete()
    .eq('id', adminId);

  return !error;
}

