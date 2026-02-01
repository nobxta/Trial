import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from './env';

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseServiceRoleKey();
// Server-only: env validation ensures url/key are set when app runs.
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;
const supabaseClient = supabase!;

export interface ChatMessage {
  id: string;
  dispute_id: string;
  sender: 'user' | 'admin' | 'system';
  message: string;
  created_at: string;
  read_at: string | null;
}

export interface DisputeChat {
  id: string;
  chat_id: string;
  type: 'order_dispute' | 'live_chat';
  status: 'open' | 'investigating' | 'resolved' | 'closed' | 'waiting' | 'deleted';
  user_email: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  chat_id: string;
  ip_hash: string;
  user_agent: string | null;
  created_at: string;
  last_active_at: string;
}

/**
 * Hash IP address for privacy
 */
export function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Create a new live chat dispute
 */
export async function createLiveChat(userEmail?: string, userAgent?: string, ipHash?: string, issue?: string): Promise<DisputeChat> {
  const chatId = crypto.randomUUID();

  // Create dispute with issue as description
  const { data: dispute, error: disputeError } = await supabaseClient
    .from('disputes')
    .insert({
      type: 'live_chat',
      chat_id: chatId,
      status: 'open',
      user_email: userEmail || null,
      title: 'Live Chat Support',
      description: issue || 'Live chat conversation',
    })
    .select()
    .single();

  if (disputeError || !dispute) {
    throw new Error(`Failed to create chat: ${disputeError?.message}`);
  }

  // Create session if IP hash provided
  if (ipHash) {
    await supabaseClient
      .from('dispute_sessions')
      .insert({
        chat_id: chatId,
        ip_hash: ipHash,
        user_agent: userAgent || null,
      });
  }

  // Add the issue as the first user message if provided
  if (issue) {
    await addChatMessage(dispute.id, 'user', issue);
  }

  return dispute as DisputeChat;
}

/**
 * Get chat by chat_id
 * @param chatId - The chat ID to look up
 * @param includeDeleted - If true, include deleted chats (admin only). Default false for user access.
 */
export async function getChatByChatId(chatId: string, includeDeleted: boolean = false): Promise<DisputeChat | null> {
  let query = supabaseClient
    .from('disputes')
    .select('*')
    .eq('chat_id', chatId);

  // Filter out deleted chats for users (unless explicitly requested)
  if (!includeDeleted) {
    query = query.neq('status', 'deleted');
  }

  const { data, error } = await query.single();

  if (error || !data) return null;
  return data as DisputeChat;
}

/**
 * Get chat messages
 */
export async function getChatMessages(disputeId: string, limit = 100): Promise<ChatMessage[]> {
  const { data, error } = await supabaseClient
    .from('dispute_messages')
    .select('*')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to get messages: ${error.message}`);
  return (data || []) as ChatMessage[];
}

/**
 * Get chat messages by chat_id (for user side)
 * @param chatId - The chat ID
 * @param includeDeleted - If true, include deleted chats (admin only). Default false for user access.
 */
export async function getChatMessagesByChatId(chatId: string, includeDeleted: boolean = false): Promise<ChatMessage[]> {
  const chat = await getChatByChatId(chatId, includeDeleted);
  if (!chat) return [];
  return getChatMessages(chat.id);
}

/**
 * Add message to chat
 */
export async function addChatMessage(
  disputeId: string,
  sender: 'user' | 'admin' | 'system',
  message: string
): Promise<ChatMessage> {
  if (!message.trim() || message.length > 5000) {
    throw new Error('Invalid message');
  }

  const { data, error } = await supabaseClient
    .from('dispute_messages')
    .insert({
      dispute_id: disputeId,
      sender,
      message: message.trim(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to add message: ${error?.message}`);
  }

  return data as ChatMessage;
}

/**
 * Add message by chat_id (for user side)
 * @param chatId - The chat ID
 * @param sender - The sender type
 * @param message - The message content
 * @param includeDeleted - If true, allow messages to deleted chats (admin only). Default false.
 */
export async function addChatMessageByChatId(
  chatId: string,
  sender: 'user' | 'admin' | 'system',
  message: string,
  includeDeleted: boolean = false
): Promise<ChatMessage> {
  const chat = await getChatByChatId(chatId, includeDeleted);
  if (!chat) {
    throw new Error('Chat not found');
  }
  
  // Users cannot send messages to deleted chats
  if (!includeDeleted && chat.status === 'deleted') {
    throw new Error('This chat has been closed by support');
  }
  
  return addChatMessage(chat.id, sender, message);
}

/**
 * Update dispute status
 */
export async function updateDisputeStatus(
  disputeId: string,
  status: string,
  adminId?: string
): Promise<void> {
  // Validate status against database constraint
  const validStatuses = ['open', 'investigating', 'resolved', 'closed', 'waiting', 'deleted'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Trim and normalize status to ensure no whitespace issues
  const normalizedStatus = status.trim().toLowerCase();
  
  // Double-check the normalized status is valid
  if (!validStatuses.includes(normalizedStatus)) {
    throw new Error(`Invalid normalized status: ${normalizedStatus}. Must be one of: ${validStatuses.join(', ')}`);
  }

  console.log(`[updateDisputeStatus] Updating dispute ${disputeId} to status: "${normalizedStatus}"`);

  const { error } = await supabaseClient
    .from('disputes')
    .update({ status: normalizedStatus })
    .eq('id', disputeId);

  if (error) {
    console.error(`[updateDisputeStatus] Database error:`, error);
    console.error(`[updateDisputeStatus] Error details:`, JSON.stringify(error, null, 2));
    
    // Provide helpful error message for constraint violations
    if (error.message && error.message.includes('disputes_status_check')) {
      throw new Error(
        `Database constraint violation: The status '${normalizedStatus}' is not allowed. ` +
        `Please run migration 034_ensure_disputes_status_constraint.sql to update the database constraint. ` +
        `Original error: ${error.message}`
      );
    }
    
    throw new Error(`Failed to update status: ${error.message}`);
  }

  // Add system message for status changes (only for live chats or if chat_id exists)
  const dispute = await getDisputeById(disputeId);
  if (dispute && dispute.chat_id) {
    const statusMessages: Record<string, string> = {
      open: 'Chat status changed to Open',
      waiting: 'Chat status changed to Waiting for response',
      investigating: 'Dispute status changed to Investigating',
      resolved: 'Dispute has been resolved',
      closed: 'Chat has been closed',
      deleted: 'This chat has been closed by support',
    };

    if (statusMessages[status]) {
      await addChatMessage(disputeId, 'system', statusMessages[status]);
    }
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(disputeId: string, reader: 'user' | 'admin'): Promise<void> {
  const { error } = await supabaseClient
    .from('dispute_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('dispute_id', disputeId)
    .neq('sender', reader)
    .is('read_at', null);

  if (error) {
    console.error('Failed to mark messages as read:', error);
  }
}

/**
 * Get unread message count
 */
export async function getUnreadCount(disputeId: string, reader: 'user' | 'admin'): Promise<number> {
  const { count, error } = await supabaseClient
    .from('dispute_messages')
    .select('*', { count: 'exact', head: true })
    .eq('dispute_id', disputeId)
    .neq('sender', reader)
    .is('read_at', null);

  if (error) return 0;
  return count || 0;
}

/**
 * Update session last active
 */
export async function updateSessionLastActive(chatId: string, ipHash: string): Promise<void> {
  await supabaseClient
    .from('dispute_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .eq('ip_hash', ipHash);
}

/**
 * Validate chat access (soft check via IP hash)
 */
export async function validateChatAccess(chatId: string, ipHash: string): Promise<boolean> {
  const { data } = await supabaseClient
    .from('dispute_sessions')
    .select('id')
    .eq('chat_id', chatId)
    .eq('ip_hash', ipHash)
    .limit(1);

  return (data?.length || 0) > 0;
}

/**
 * Get all disputes with chat info (for admin)
 */
export async function getAllDisputesWithChatInfo(): Promise<(DisputeChat & { unread_count: number })[]> {
  const { data: disputes, error } = await supabaseClient
    .from('disputes')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error || !disputes) return [];

  // Get unread counts for each
  const disputesWithCounts = await Promise.all(
    disputes.map(async (dispute) => {
      const unreadCount = await getUnreadCount(dispute.id, 'admin');
      return { ...dispute, unread_count: unreadCount } as DisputeChat & { unread_count: number };
    })
  );

  return disputesWithCounts;
}

/**
 * Get dispute by ID (for admin)
 */
export async function getDisputeById(disputeId: string): Promise<DisputeChat | null> {
  const { data, error } = await supabaseClient
    .from('disputes')
    .select('*')
    .eq('id', disputeId)
    .single();

  if (error || !data) return null;
  return data as DisputeChat;
}

