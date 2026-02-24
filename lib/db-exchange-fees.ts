/**
 * Exchange fee settings: fixed_fee_percent and floating_fee_percent.
 * Single row (id=1) in exchange_fee_settings table.
 * Used by payment route and exposed to frontend via API.
 */

import { supabaseAdmin } from './supabase';
import { wrapDbError } from './db-errors';

const ROW_ID = 1;

export interface ExchangeFeeSettings {
  fixedFeePercent: number;
  floatingFeePercent: number;
  updatedAt: string;
}

export const DEFAULT_FIXED_FEE_PERCENT = 1.0;
export const DEFAULT_FLOATING_FEE_PERCENT = 0.5;

export async function getExchangeFeeSettings(): Promise<ExchangeFeeSettings> {
  if (!supabaseAdmin) {
    return {
      fixedFeePercent: DEFAULT_FIXED_FEE_PERCENT,
      floatingFeePercent: DEFAULT_FLOATING_FEE_PERCENT,
      updatedAt: new Date().toISOString(),
    };
  }

  const { data, error } = await supabaseAdmin
    .from('exchange_fee_settings')
    .select('fixed_fee_percent, floating_fee_percent, updated_at')
    .eq('id', ROW_ID)
    .single();

  if (error || !data) {
    return {
      fixedFeePercent: DEFAULT_FIXED_FEE_PERCENT,
      floatingFeePercent: DEFAULT_FLOATING_FEE_PERCENT,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    fixedFeePercent: Number(data.fixed_fee_percent) || DEFAULT_FIXED_FEE_PERCENT,
    floatingFeePercent: Number(data.floating_fee_percent) || DEFAULT_FLOATING_FEE_PERCENT,
    updatedAt: data.updated_at ?? new Date().toISOString(),
  };
}

export async function updateExchangeFeeSettings(updates: {
  fixedFeePercent?: number;
  floatingFeePercent?: number;
}): Promise<ExchangeFeeSettings> {
  if (!supabaseAdmin) {
    throw new Error('Database not configured');
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.fixedFeePercent !== undefined) {
    if (updates.fixedFeePercent < 0 || updates.fixedFeePercent > 100) {
      throw new Error('fixedFeePercent must be between 0 and 100');
    }
    updateData.fixed_fee_percent = updates.fixedFeePercent;
  }
  if (updates.floatingFeePercent !== undefined) {
    if (updates.floatingFeePercent < 0 || updates.floatingFeePercent > 100) {
      throw new Error('floatingFeePercent must be between 0 and 100');
    }
    updateData.floating_fee_percent = updates.floatingFeePercent;
  }

  const { data, error } = await supabaseAdmin
    .from('exchange_fee_settings')
    .update(updateData)
    .eq('id', ROW_ID)
    .select('fixed_fee_percent, floating_fee_percent, updated_at')
    .single();

  if (error) {
    throw wrapDbError(error, 'updateExchangeFeeSettings');
  }

  if (!data) {
    throw new Error('Exchange fee settings not found');
  }

  return {
    fixedFeePercent: Number(data.fixed_fee_percent),
    floatingFeePercent: Number(data.floating_fee_percent),
    updatedAt: data.updated_at ?? new Date().toISOString(),
  };
}
