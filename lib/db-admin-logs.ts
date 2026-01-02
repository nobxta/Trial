import { supabaseAdmin } from './supabase';

export interface AdminActionLog {
  id: string;
  adminId: string;
  actionType: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

export async function logAdminAction(
  adminId: string,
  actionType: string,
  resourceType: string,
  options: {
    resourceId?: string;
    details?: Record<string, any>;
    previousState?: Record<string, any>;
    newState?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<void> {
  checkSupabase();
  
  const { error } = await supabaseAdmin!
    .from('admin_action_logs')
    .insert({
      admin_id: adminId,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: options.resourceId || null,
      entity_type: resourceType, // Unified field
      entity_id: options.resourceId || null, // Unified field
      details: options.details || null,
      previous_state: options.previousState || null,
      new_state: options.newState || null,
      ip_address: options.ipAddress || null,
      user_agent: options.userAgent || null,
    });

  if (error) {
    // Log but don't throw - action logging failure shouldn't break the operation
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Get admin event log for a specific entity (order-centric view)
 */
export async function getEntityEventLog(
  entityType: string,
  entityId: string
): Promise<AdminActionLog[]> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('admin_action_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch entity event log:', error);
    return [];
  }

  return (data || []).map(log => ({
    id: log.id,
    adminId: log.admin_id,
    actionType: log.action_type,
    resourceType: log.resource_type,
    resourceId: log.resource_id,
    details: log.details,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    createdAt: log.created_at,
  }));
}

export async function getAdminActionLogs(
  filters?: {
    adminId?: string;
    actionType?: string;
    resourceType?: string;
    resourceId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<AdminActionLog[]> {
  checkSupabase();
  
  let query = supabaseAdmin!
    .from('admin_action_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.adminId) {
    query = query.eq('admin_id', filters.adminId);
  }
  if (filters?.actionType) {
    query = query.eq('action_type', filters.actionType);
  }
  if (filters?.resourceType) {
    query = query.eq('resource_type', filters.resourceType);
  }
  if (filters?.resourceId) {
    query = query.eq('resource_id', filters.resourceId);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch admin action logs:', error);
    return [];
  }

  return (data || []).map(log => ({
    id: log.id,
    adminId: log.admin_id,
    actionType: log.action_type,
    resourceType: log.resource_type,
    resourceId: log.resource_id,
    details: log.details,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    createdAt: log.created_at,
  }));
}

