export const metadata = {
  title: "Authentication - MintMove API Documentation",
  description: "Learn how to authenticate API requests using API keys and signatures",
};

export default function AuthenticationPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Authentication</h1>
        <p className="text-base md:text-lg lg:text-xl text-neutral-400">
          Secure your API requests with API keys and HMAC signatures
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Overview</h2>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          MintMove API uses API key-based authentication with HMAC-SHA256
          signature verification. All private endpoints require authentication
          to ensure that only authorized applications can access sensitive
          operations like creating orders and accessing order details.
        </p>
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 md:p-4">
          <p className="text-yellow-200 text-xs md:text-sm">
            <strong>Security Note:</strong> Never expose your API secret in
            client-side code. API secrets should only be used in secure
            server-side environments.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">API Credentials</h2>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          You need two pieces of information to authenticate:
        </p>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5 space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">API Key</h3>
            <p className="text-sm md:text-base text-neutral-400">
              Your public API identifier. This is safe to include in client-side
              code if needed, though we recommend keeping it server-side.
            </p>
            <code className="block mt-2 p-2 md:p-3 bg-white/[0.02] rounded text-blue-300 text-xs md:text-sm break-all">
              mm_live_1234567890abcdef
            </code>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">API Secret</h3>
            <p className="text-sm md:text-base text-neutral-400">
              Your private secret key used to generate request signatures. This
              must never be exposed publicly.
            </p>
            <code className="block mt-2 p-2 md:p-3 bg-white/[0.02] rounded text-blue-300 text-xs md:text-sm break-all">
              sk_live_abcdef1234567890...
            </code>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Required Headers</h2>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          All authenticated requests must include the following headers:
        </p>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 md:p-6 border border-white/5 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-2 md:px-4 text-blue-400">Header</th>
                  <th className="text-left py-2 px-2 md:px-4 text-blue-400">Description</th>
                  <th className="text-left py-2 px-2 md:px-4 text-blue-400">Example</th>
                </tr>
              </thead>
              <tbody className="text-neutral-400">
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">X-API-KEY</td>
                  <td className="py-2 px-2 md:px-4">Your API key</td>
                  <td className="py-2 px-2 md:px-4 font-mono text-xs break-all">mm_live_1234...</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">X-API-SIGN</td>
                  <td className="py-2 px-2 md:px-4">HMAC-SHA256 signature</td>
                  <td className="py-2 px-2 md:px-4 font-mono text-xs break-all">a1b2c3d4...</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">X-API-TIMESTAMP</td>
                  <td className="py-2 px-2 md:px-4">Unix timestamp (seconds)</td>
                  <td className="py-2 px-2 md:px-4 font-mono text-xs">1706284800</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Signature Generation</h2>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          The signature is generated using HMAC-SHA256. Here&apos;s how it works:
        </p>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5 space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Step 1: Create the Sign String</h3>
            <p className="text-sm md:text-base text-neutral-400 mb-3">
              Concatenate the following values in order:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm md:text-base text-neutral-400 ml-4">
              <li>HTTP method (uppercase): <code className="bg-white/[0.02] px-2 py-1 rounded">GET</code> or <code className="bg-white/[0.02] px-2 py-1 rounded">POST</code></li>
              <li>Request path: <code className="bg-white/[0.02] px-2 py-1 rounded">/v1/order/create</code></li>
              <li>Query string (if GET): <code className="bg-white/[0.02] px-2 py-1 rounded">?from=BTC&to=USDT</code></li>
              <li>Request body (if POST, JSON stringified): <code className="bg-white/[0.02] px-2 py-1 rounded">{`{"from":"BTC"}`}</code></li>
              <li>Unix timestamp: <code className="bg-white/[0.02] px-2 py-1 rounded">1706284800</code></li>
            </ol>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Step 2: Generate HMAC-SHA256</h3>
            <p className="text-sm md:text-base text-neutral-400 mb-3">
              Use your API secret to create an HMAC-SHA256 hash of the sign string:
            </p>
            <code className="block p-2 md:p-3 bg-white/[0.02] rounded text-blue-300 text-xs md:text-sm break-all">
              signature = HMAC-SHA256(api_secret, sign_string)
            </code>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Step 3: Encode to Hex</h3>
            <p className="text-sm md:text-base text-neutral-400 mb-3">
              Convert the binary hash to a hexadecimal string (lowercase):
            </p>
            <code className="block p-2 md:p-3 bg-white/[0.02] rounded text-blue-300 text-xs md:text-sm break-all">
              hex_signature = signature.toString(&apos;hex&apos;)
            </code>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Code Examples</h2>
        
        <div className="space-y-4 md:space-y-6">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Node.js / JavaScript</h3>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto border border-white/5 -mx-3 md:mx-0">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`const crypto = require('crypto');

function generateSignature(method, path, body, timestamp, apiSecret) {
  const signString = method + path + (body ? JSON.stringify(body) : '') + timestamp;
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(signString)
    .digest('hex');
  return signature;
}

// Example usage
const method = 'POST';
const path = '/v1/order/create';
const body = { from: 'BTC', to: 'USDT', amount: 0.1 };
const timestamp = Math.floor(Date.now() / 1000);
const apiSecret = 'your_api_secret';

const signature = generateSignature(method, path, body, timestamp, apiSecret);

// Include in headers
const headers = {
  'X-API-KEY': 'your_api_key',
  'X-API-SIGN': signature,
  'X-API-TIMESTAMP': timestamp.toString(),
  'Content-Type': 'application/json'
};`}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Python</h3>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto border border-white/5 -mx-3 md:mx-0">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`import hmac
import hashlib
import json
import time

def generate_signature(method, path, body, timestamp, api_secret):
    sign_string = method + path
    if body:
        sign_string += json.dumps(body, separators=(',', ':'))
    sign_string += str(timestamp)
    
    signature = hmac.new(
        api_secret.encode('utf-8'),
        sign_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return signature

# Example usage
method = 'POST'
path = '/v1/order/create'
body = {'from': 'BTC', 'to': 'USDT', 'amount': 0.1}
timestamp = int(time.time())
api_secret = 'your_api_secret'

signature = generate_signature(method, path, body, timestamp, api_secret)

# Include in headers
headers = {
    'X-API-KEY': 'your_api_key',
    'X-API-SIGN': signature,
    'X-API-TIMESTAMP': str(timestamp),
    'Content-Type': 'application/json'
}`}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">PHP</h3>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto border border-white/5 -mx-3 md:mx-0">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`<?php
function generateSignature($method, $path, $body, $timestamp, $apiSecret) {
    $signString = $method . $path;
    if ($body) {
        $signString .= json_encode($body, JSON_UNESCAPED_SLASHES);
    }
    $signString .= $timestamp;
    
    $signature = hash_hmac('sha256', $signString, $apiSecret);
    return $signature;
}

// Example usage
$method = 'POST';
$path = '/v1/order/create';
$body = ['from' => 'BTC', 'to' => 'USDT', 'amount' => 0.1];
$timestamp = time();
$apiSecret = 'your_api_secret';

$signature = generateSignature($method, $path, $body, $timestamp, $apiSecret);

// Include in headers
$headers = [
    'X-API-KEY: your_api_key',
    'X-API-SIGN: ' . $signature,
    'X-API-TIMESTAMP: ' . $timestamp,
    'Content-Type: application/json'
];
?>`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Timestamp Validation</h2>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          Timestamps are validated to prevent replay attacks. Your request
          timestamp must be within 5 minutes of the server&apos;s current time.
          Requests with timestamps outside this window will be rejected.
        </p>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 md:p-4">
          <p className="text-red-200 text-xs md:text-sm">
            <strong>Important:</strong> Ensure your server&apos;s clock is synchronized
            with NTP to avoid timestamp validation failures.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Security Best Practices</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <ul className="space-y-3 text-sm md:text-base text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Never expose API secrets</strong> -
                Keep secrets in environment variables or secure key management
                systems
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Use HTTPS only</strong> - All API
                requests must use HTTPS to protect credentials in transit
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Rotate keys regularly</strong> -
                Periodically regenerate API keys to limit exposure if compromised
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Implement IP whitelisting</strong> -
                Restrict API key usage to specific IP addresses when possible
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Monitor API usage</strong> - Set up
                alerts for unusual activity or unexpected API calls
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

