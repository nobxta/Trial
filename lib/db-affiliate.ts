import { supabaseAdmin } from './supabase';
import crypto from 'crypto';

export interface Affiliate {
  id: string;
  userId: string;
  referralCode: string;
  totalEarnings: number;
  totalClicks: number;
  totalConversions: number;
  commissionRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface Referral {
  id: string;
  affiliateId: string;
  referredUserId: string;
  orderId: string | null;
  commissionAmount: number | null;
  status: string;
  clickedAt: string | null;
  signedUpAt: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

export async function getAffiliateByUserId(userId: string): Promise<Affiliate | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('affiliates')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    referralCode: data.referral_code,
    totalEarnings: parseFloat(data.total_earnings),
    totalClicks: data.total_clicks,
    totalConversions: data.total_conversions,
    commissionRate: parseFloat(data.commission_rate),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function createAffiliate(userId: string): Promise<Affiliate> {
  checkSupabase();

  // Generate unique referral code
  const referralCode = 'AFF' + crypto.randomBytes(4).toString('hex').toUpperCase();

  const { data, error } = await supabaseAdmin!
    .from('affiliates')
    .insert({
      user_id: userId,
      referral_code: referralCode,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create affiliate: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    referralCode: data.referral_code,
    totalEarnings: parseFloat(data.total_earnings),
    totalClicks: data.total_clicks,
    totalConversions: data.total_conversions,
    commissionRate: parseFloat(data.commission_rate),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function trackReferralClick(referralCode: string): Promise<{ affiliateId: string } | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('affiliates')
    .select('id')
    .eq('referral_code', referralCode)
    .single();

  if (error || !data) return null;

  // Increment click count
  const { data: affiliate } = await supabaseAdmin!
    .from('affiliates')
    .select('total_clicks')
    .eq('id', data.id)
    .single();
  
  if (affiliate) {
    await supabaseAdmin!
      .from('affiliates')
      .update({ total_clicks: (affiliate.total_clicks || 0) + 1 })
      .eq('id', data.id);
  }

  return { affiliateId: data.id };
}

export async function recordReferralSignup(referralCode: string, userId: string): Promise<string | null> {
  checkSupabase();

  const affiliate = await getAffiliateByReferralCode(referralCode);
  if (!affiliate) return null;

  const { data, error } = await supabaseAdmin!
    .from('referrals')
    .insert({
      affiliate_id: affiliate.id,
      referred_user_id: userId,
      signed_up_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return null;

  return data.id;
}

export async function recordReferralConversion(
  referralId: string,
  orderId: string,
  orderAmount: number
): Promise<boolean> {
  checkSupabase();

  // Get referral and affiliate
  const { data: referral, error: refError } = await supabaseAdmin!
    .from('referrals')
    .select('*, affiliates!inner(commission_rate)')
    .eq('id', referralId)
    .single();

  if (refError || !referral) return false;

  const commissionRate = parseFloat(referral.affiliates.commission_rate);
  const commissionAmount = orderAmount * commissionRate;

  // Update referral
  await supabaseAdmin!
    .from('referrals')
    .update({
      order_id: orderId,
      commission_amount: commissionAmount,
      status: 'completed',
      converted_at: new Date().toISOString(),
    })
    .eq('id', referralId);

  // Update affiliate stats
  const { data: affiliate } = await supabaseAdmin!
    .from('affiliates')
    .select('total_earnings, total_conversions')
    .eq('id', referral.affiliate_id)
    .single();
  
  if (affiliate) {
    await supabaseAdmin!
      .from('affiliates')
      .update({
        total_earnings: (parseFloat(affiliate.total_earnings) || 0) + commissionAmount,
        total_conversions: (affiliate.total_conversions || 0) + 1,
      })
      .eq('id', referral.affiliate_id);
  }

  return true;
}

export async function getReferrals(affiliateId: string): Promise<Referral[]> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('referrals')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(ref => ({
    id: ref.id,
    affiliateId: ref.affiliate_id,
    referredUserId: ref.referred_user_id,
    orderId: ref.order_id,
    commissionAmount: ref.commission_amount ? parseFloat(ref.commission_amount) : null,
    status: ref.status,
    clickedAt: ref.clicked_at,
    signedUpAt: ref.signed_up_at,
    convertedAt: ref.converted_at,
    createdAt: ref.created_at,
    updatedAt: ref.updated_at,
  }));
}

export async function getEarningsHistory(affiliateId: string): Promise<Referral[]> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('referrals')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .not('commission_amount', 'is', null)
    .order('converted_at', { ascending: false });

  if (error || !data) return [];

  return data.map(ref => ({
    id: ref.id,
    affiliateId: ref.affiliate_id,
    referredUserId: ref.referred_user_id,
    orderId: ref.order_id,
    commissionAmount: ref.commission_amount ? parseFloat(ref.commission_amount) : null,
    status: ref.status,
    clickedAt: ref.clicked_at,
    signedUpAt: ref.signed_up_at,
    convertedAt: ref.converted_at,
    createdAt: ref.created_at,
    updatedAt: ref.updated_at,
  }));
}

async function getAffiliateByReferralCode(referralCode: string): Promise<Affiliate | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('affiliates')
    .select('*')
    .eq('referral_code', referralCode)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    referralCode: data.referral_code,
    totalEarnings: parseFloat(data.total_earnings),
    totalClicks: data.total_clicks,
    totalConversions: data.total_conversions,
    commissionRate: parseFloat(data.commission_rate),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

