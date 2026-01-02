export const metadata = {
  title: "Request Format & Examples - MintMove API Documentation",
  description: "Learn how to format API requests with JSON, headers, and signatures",
};

export default function RequestsPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Request Format & Examples</h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-300">
          Learn how to properly format and send API requests
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Base URL</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <code className="text-sm md:text-base lg:text-xl text-red-300 font-mono break-all">
            https://api.mintmove.io
          </code>
        </div>
        <p className="text-slate-300">
          All API endpoints are accessed through this base URL. The API version is
          included in the path (e.g., <code className="bg-slate-900 px-2 py-1 rounded text-sm">/v1/</code>).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">HTTP Methods</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li>
              <strong className="text-white">GET</strong> - Used for retrieving
              data (e.g., getting exchange rates, order details, available currencies)
            </li>
            <li>
              <strong className="text-white">POST</strong> - Used for creating
              resources or performing actions (e.g., creating orders, emergency actions)
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Request Headers</h2>
        <p className="text-sm md:text-base text-slate-300">
          All requests must include the following headers:
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 md:p-6 border border-red-500/20 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-2 md:px-4 text-red-400 whitespace-nowrap">Header</th>
                  <th className="text-left py-2 px-2 md:px-4 text-red-400 whitespace-nowrap">Required</th>
                  <th className="text-left py-2 px-2 md:px-4 text-red-400">Description</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">Content-Type</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">Yes</td>
                  <td className="py-2 px-2 md:px-4">application/json</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">X-API-KEY</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">Yes*</td>
                  <td className="py-2 px-2 md:px-4">Your API key (required for private endpoints)</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">X-API-SIGN</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">Yes*</td>
                  <td className="py-2 px-2 md:px-4">HMAC-SHA256 signature</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">X-API-TIMESTAMP</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">Yes*</td>
                  <td className="py-2 px-2 md:px-4">Unix timestamp in seconds</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 text-xs md:text-sm mt-4">
            * Required for authenticated endpoints only
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Request Body</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20 space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">JSON Format</h3>
            <p className="text-sm md:text-base text-slate-300 mb-3">
              All request bodies must be valid JSON with UTF-8 encoding:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-slate-300 ml-4">
              <li>Use double quotes for strings</li>
              <li>No trailing commas</li>
              <li>Valid JSON syntax</li>
              <li>UTF-8 character encoding</li>
            </ul>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Example Request Body</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto border border-red-500/20 -mx-3 md:mx-0">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "from": "BNB",
  "from_network": "BEP20",
  "to": "USDT",
  "to_network": "ERC20",
  "amount": 1.202887,
  "rate_type": "fixed",
  "destination": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Response Format</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20 space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Success Response</h3>
            <p className="text-sm md:text-base text-slate-300 mb-3">
              Successful requests return a JSON object with the requested data:
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto border border-red-500/20 -mx-3 md:mx-0">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "success": true,
  "data": {
    "rate": 831.34,
    "from": "BNB",
    "to": "USDT"
  }
}`}</code>
            </pre>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Error Response</h3>
            <p className="text-sm md:text-base text-slate-300 mb-3">
              Errors return a JSON object with error details:
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto border border-red-500/20 -mx-3 md:mx-0">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "INVALID_ADDRESS",
  "message": "Destination address is invalid"
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Code Examples</h2>
        
        <div className="space-y-4 md:space-y-6">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">cURL</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto border border-red-500/20 -mx-3 md:mx-0">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`# GET request example
curl -X GET "https://api.mintmove.io/v1/rate?from=BTC&to=USDT&amount=0.1" \\
  -H "Content-Type: application/json"

# POST request with authentication
curl -X POST "https://api.mintmove.io/v1/order/create" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: your_api_key" \\
  -H "X-API-SIGN: generated_signature" \\
  -H "X-API-TIMESTAMP: 1706284800" \\
  -d '{
    "from": "BNB",
    "from_network": "BEP20",
    "to": "USDT",
    "to_network": "ERC20",
    "amount": 1.202887,
    "rate_type": "fixed",
    "destination": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'`}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Python</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto border border-red-500/20 -mx-3 md:mx-0">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`import requests
import json
import time
import hmac
import hashlib

API_KEY = "your_api_key"
API_SECRET = "your_api_secret"
BASE_URL = "https://api.mintmove.io"

def make_request(method, endpoint, body=None):
    timestamp = str(int(time.time()))
    path = f"/v1{endpoint}"
    
    # Generate signature
    sign_string = method + path
    if body:
        sign_string += json.dumps(body, separators=(',', ':'))
    sign_string += timestamp
    
    signature = hmac.new(
        API_SECRET.encode('utf-8'),
        sign_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY,
        'X-API-SIGN': signature,
        'X-API-TIMESTAMP': timestamp
    }
    
    url = BASE_URL + path
    response = requests.request(method, url, headers=headers, json=body)
    return response.json()

# Example: Create order
order_data = {
    "from": "BNB",
    "from_network": "BEP20",
    "to": "USDT",
    "to_network": "ERC20",
    "amount": 1.202887,
    "rate_type": "fixed",
    "destination": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}

result = make_request('POST', '/order/create', order_data)
print(json.dumps(result, indent=2))`}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">PHP</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto border border-red-500/20 -mx-3 md:mx-0">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`<?php
$apiKey = 'your_api_key';
$apiSecret = 'your_api_secret';
$baseUrl = 'https://api.mintmove.io';

function makeRequest($method, $endpoint, $body = null) {
    global $apiKey, $apiSecret, $baseUrl;
    
    $timestamp = time();
    $path = '/v1' . $endpoint;
    
    // Generate signature
    $signString = $method . $path;
    if ($body) {
        $signString .= json_encode($body, JSON_UNESCAPED_SLASHES);
    }
    $signString .= $timestamp;
    
    $signature = hash_hmac('sha256', $signString, $apiSecret);
    
    $headers = [
        'Content-Type: application/json',
        'X-API-KEY: ' . $apiKey,
        'X-API-SIGN: ' . $signature,
        'X-API-TIMESTAMP: ' . $timestamp
    ];
    
    $ch = curl_init($baseUrl . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Example: Create order
$orderData = [
    'from' => 'BNB',
    'from_network' => 'BEP20',
    'to' => 'USDT',
    'to_network' => 'ERC20',
    'amount' => 1.202887,
    'rate_type' => 'fixed',
    'destination' => '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
];

$result = makeRequest('POST', '/order/create', $orderData);
echo json_encode($result, JSON_PRETTY_PRINT);
?>`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Encoding Requirements</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li>
              <strong className="text-white">UTF-8 Encoding</strong> - All text
              must be UTF-8 encoded to support international characters
            </li>
            <li>
              <strong className="text-white">URL Encoding</strong> - Query
              parameters must be properly URL-encoded
            </li>
            <li>
              <strong className="text-white">JSON Escaping</strong> - Special
              characters in JSON strings must be properly escaped
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

