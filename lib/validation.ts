/**
 * Server-side validation utilities
 * Validates exchange/payment requests before processing
 */

import { isValidAssetNetworkId, getAssetNetworkById } from './supportedAssets';

/**
 * Validate cryptocurrency address format
 */
export function validateCryptoAddress(address: string, network: string): { valid: boolean; error?: string } {
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return { valid: false, error: 'Address is required' };
  }

  const trimmedAddress = address.trim();
  const networkUpper = network.toUpperCase();

  // Ethereum-based addresses (ERC20, BEP20, etc.)
  if (networkUpper === 'ERC20' || networkUpper === 'ETH' || networkUpper === 'BEP20' || networkUpper === 'BSC' || networkUpper === 'BASE' || networkUpper === 'ARB' || networkUpper === 'OPTIMISM' || networkUpper === 'POLYGON') {
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
      return { valid: false, error: 'Invalid Ethereum address format. Must start with 0x and be 42 characters long.' };
    }
  }

  // Tron addresses (TRC20)
  if (networkUpper === 'TRC20' || networkUpper === 'TRX') {
    if (!/^T[A-Za-z1-9]{33}$/.test(trimmedAddress)) {
      return { valid: false, error: 'Invalid Tron address format. Must start with T and be 34 characters long.' };
    }
  }

  // Bitcoin addresses
  if (networkUpper === 'BTC') {
    // Legacy (P2PKH): starts with 1, 25-34 chars
    // SegWit (P2SH): starts with 3, 25-34 chars
    // Bech32 (native SegWit): starts with bc1, 39-59 chars
    if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/i.test(trimmedAddress)) {
      return { valid: false, error: 'Invalid Bitcoin address format.' };
    }
  }

  // Solana addresses
  if (networkUpper === 'SOL') {
    // Base58 encoded, 32-44 characters
    if (trimmedAddress.length < 32 || trimmedAddress.length > 44) {
      return { valid: false, error: 'Invalid Solana address format. Must be 32-44 characters long.' };
    }
  }

  // Litecoin addresses
  if (networkUpper === 'LTC') {
    // Similar to Bitcoin but can start with L, M, or 3
    if (!/^[LM3][a-km-zA-HJ-NP-Z1-9]{25,34}$/i.test(trimmedAddress)) {
      return { valid: false, error: 'Invalid Litecoin address format.' };
    }
  }

  // For other networks, do basic length check
  if (trimmedAddress.length < 10 || trimmedAddress.length > 200) {
    return { valid: false, error: 'Address length is invalid.' };
  }

  return { valid: true };
}

/**
 * Validate exchange request payload
 */
export function validateExchangeRequest(body: any): { valid: boolean; error?: string } {
  // Required fields
  if (!body.send_asset || typeof body.send_asset !== 'string') {
    return { valid: false, error: 'send_asset is required and must be a string' };
  }

  if (!body.receive_asset || typeof body.receive_asset !== 'string') {
    return { valid: false, error: 'receive_asset is required and must be a string' };
  }

  if (!body.destination || typeof body.destination !== 'string') {
    return { valid: false, error: 'destination address is required and must be a string' };
  }

  // Validate amounts
  const sendAmount = parseFloat(body.send_amount);
  if (isNaN(sendAmount) || sendAmount <= 0) {
    return { valid: false, error: 'send_amount must be a positive number greater than 0' };
  }

  const expectedReceive = parseFloat(body.expected_receive);
  if (isNaN(expectedReceive) || expectedReceive <= 0) {
    return { valid: false, error: 'expected_receive must be a positive number greater than 0' };
  }

  // Minimum amount validation is now done server-side using real NOWPayments limits
  // This validation happens in app/api/payment/route.ts after fetching limits from NOWPayments API

  // Validate supported assets
  if (!isValidAssetNetworkId(body.send_asset)) {
    return { valid: false, error: `Unsupported send asset: ${body.send_asset}` };
  }

  if (!isValidAssetNetworkId(body.receive_asset)) {
    return { valid: false, error: `Unsupported receive asset: ${body.receive_asset}` };
  }

  // Get asset network info for address validation
  const sendAsset = getAssetNetworkById(body.send_asset);
  const receiveAsset = getAssetNetworkById(body.receive_asset);

  if (!sendAsset) {
    return { valid: false, error: `Invalid send asset: ${body.send_asset}` };
  }

  if (!receiveAsset) {
    return { valid: false, error: `Invalid receive asset: ${body.receive_asset}` };
  }

  // Validate destination address format
  const addressValidation = validateCryptoAddress(body.destination, receiveAsset.networkCode);
  if (!addressValidation.valid) {
    return { valid: false, error: `Invalid destination address: ${addressValidation.error}` };
  }

  // Validate networks if provided
  if (body.send_network && typeof body.send_network !== 'string') {
    return { valid: false, error: 'send_network must be a string if provided' };
  }

  if (body.receive_network && typeof body.receive_network !== 'string') {
    return { valid: false, error: 'receive_network must be a string if provided' };
  }

  // Validate order_id format if provided
  if (body.order_id && (typeof body.order_id !== 'string' || body.order_id.trim().length === 0)) {
    return { valid: false, error: 'order_id must be a non-empty string if provided' };
  }

  return { valid: true };
}

/**
 * Validate payment request payload (legacy payment orders)
 */
export function validatePaymentRequest(body: any): { valid: boolean; error?: string } {
  if (!body.asset || typeof body.asset !== 'string') {
    return { valid: false, error: 'asset is required and must be a string' };
  }

  const expectedAmount = parseFloat(body.expected_amount);
  if (isNaN(expectedAmount) || expectedAmount <= 0) {
    return { valid: false, error: 'expected_amount must be a positive number greater than 0' };
  }

  if (!isValidAssetNetworkId(body.asset)) {
    return { valid: false, error: `Unsupported asset: ${body.asset}` };
  }

  return { valid: true };
}

