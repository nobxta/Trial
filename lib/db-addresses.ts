import { supabaseAdmin } from './supabase';

export interface Address {
  id: string;
  userId: string;
  label: string;
  address: string;
  currency: string;
  network: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

export async function getUserAddresses(userId: string): Promise<Address[]> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(addr => ({
    id: addr.id,
    userId: addr.user_id,
    label: addr.label,
    address: addr.address,
    currency: addr.currency,
    network: addr.network,
    isDefault: addr.is_default,
    createdAt: addr.created_at,
    updatedAt: addr.updated_at,
  }));
}

export async function createAddress(userId: string, addressData: {
  label: string;
  address: string;
  currency: string;
  network?: string;
  isDefault?: boolean;
}): Promise<Address> {
  checkSupabase();

  // If setting as default, unset other defaults
  if (addressData.isDefault) {
    await supabaseAdmin!
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);
  }

  const { data, error } = await supabaseAdmin!
    .from('addresses')
    .insert({
      user_id: userId,
      label: addressData.label,
      address: addressData.address,
      currency: addressData.currency,
      network: addressData.network || null,
      is_default: addressData.isDefault || false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create address: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    label: data.label,
    address: data.address,
    currency: data.currency,
    network: data.network,
    isDefault: data.is_default,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateAddress(addressId: string, updates: Partial<Address>): Promise<Address | null> {
  checkSupabase();

  const updateData: any = {};
  if (updates.label !== undefined) updateData.label = updates.label;
  if (updates.address !== undefined) updateData.address = updates.address;
  if (updates.currency !== undefined) updateData.currency = updates.currency;
  if (updates.network !== undefined) updateData.network = updates.network;
  if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

  // If setting as default, unset other defaults
  if (updates.isDefault) {
    const { data: address } = await supabaseAdmin!
      .from('addresses')
      .select('user_id')
      .eq('id', addressId)
      .single();

    if (address) {
      await supabaseAdmin!
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', address.user_id)
        .eq('is_default', true)
        .neq('id', addressId);
    }
  }

  const { data, error } = await supabaseAdmin!
    .from('addresses')
    .update(updateData)
    .eq('id', addressId)
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    label: data.label,
    address: data.address,
    currency: data.currency,
    network: data.network,
    isDefault: data.is_default,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deleteAddress(addressId: string): Promise<boolean> {
  checkSupabase();

  const { error } = await supabaseAdmin!
    .from('addresses')
    .delete()
    .eq('id', addressId);

  return !error;
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<boolean> {
  checkSupabase();

  // Unset all defaults for this user
  await supabaseAdmin!
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', userId);

  // Set this address as default
  const { error } = await supabaseAdmin!
    .from('addresses')
    .update({ is_default: true })
    .eq('id', addressId)
    .eq('user_id', userId);

  return !error;
}

