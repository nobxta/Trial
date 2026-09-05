/**
 * Checksum verification for crypto addresses.
 *
 * Shape-only regexes accept typos: a single changed character keeps the length and
 * character set intact, so the address looks fine locally and is only rejected later
 * by the payment provider with a vague message. Every address format below carries a
 * checksum precisely so corruption can be detected before submitting.
 *
 * Implemented without dependencies: Base58Check (legacy/P2SH), Bech32 and Bech32m
 * (SegWit v0 and Taproot).
 */

import crypto from 'crypto';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Decode Base58 into bytes, or null if a character is outside the alphabet. */
function base58Decode(input: string): Uint8Array | null {
  const bytes: number[] = [0];

  for (const char of input) {
    const value = BASE58_ALPHABET.indexOf(char);
    if (value === -1) return null;

    let carry = value;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Leading '1's are leading zero bytes.
  for (const char of input) {
    if (char !== '1') break;
    bytes.push(0);
  }

  return new Uint8Array(bytes.reverse());
}

const sha256 = (data: Uint8Array): Uint8Array =>
  new Uint8Array(crypto.createHash('sha256').update(Buffer.from(data)).digest());

/**
 * Verify a Base58Check address: the last 4 bytes must equal the first 4 bytes of
 * the double-SHA256 of everything before them.
 */
export function isValidBase58Check(address: string): boolean {
  const decoded = base58Decode(address);
  if (!decoded || decoded.length < 5) return false;

  const payload = decoded.slice(0, -4);
  const checksum = decoded.slice(-4);
  const expected = sha256(sha256(payload)).slice(0, 4);

  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== expected[i]) return false;
  }
  return true;
}

const BECH32_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

/**
 * Verify a Bech32/Bech32m address. SegWit v0 (bc1q...) uses the Bech32 constant and
 * Taproot v1 (bc1p...) uses Bech32m, so the expected constant depends on the witness
 * version carried in the first data character.
 */
export function isValidBech32(address: string, expectedHrp: string): boolean {
  // Mixed case is invalid per BIP-173.
  if (address !== address.toLowerCase() && address !== address.toUpperCase()) return false;

  const lower = address.toLowerCase();
  const sep = lower.lastIndexOf('1');
  if (sep < 1 || sep + 7 > lower.length || lower.length > 90) return false;

  const hrp = lower.slice(0, sep);
  if (hrp !== expectedHrp) return false;

  const data: number[] = [];
  for (const char of lower.slice(sep + 1)) {
    const value = BECH32_ALPHABET.indexOf(char);
    if (value === -1) return false;
    data.push(value);
  }

  const witnessVersion = data[0];
  if (witnessVersion > 16) return false;

  const expected = witnessVersion === 0 ? BECH32_CONST : BECH32M_CONST;
  return bech32Polymod(bech32HrpExpand(hrp).concat(data)) === expected;
}

/** True if the address passes the checksum for its detected format. */
export function isValidBitcoinAddress(address: string): boolean {
  if (/^(bc1|BC1)/.test(address)) return isValidBech32(address, 'bc');
  if (/^[13]/.test(address)) return isValidBase58Check(address);
  return false;
}

/** Litecoin: legacy/P2SH are Base58Check, native SegWit uses the "ltc" prefix. */
export function isValidLitecoinAddress(address: string): boolean {
  if (/^(ltc1|LTC1)/.test(address)) return isValidBech32(address, 'ltc');
  if (/^[LM3]/.test(address)) return isValidBase58Check(address);
  return false;
}

/** Tron addresses are Base58Check over a 21-byte payload starting with 0x41. */
export function isValidTronAddress(address: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address) && isValidBase58Check(address);
}
