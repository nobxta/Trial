export const metadata = {
  title: "Exchange Rate - MintMove API Documentation",
  description: "Get real-time and fixed exchange rates for cryptocurrency pairs",
};

export default function ExchangeRatePage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Exchange Rate</h1>
        <p className="text-base md:text-lg lg:text-xl text-neutral-400">
          Retrieve exchange rates for cryptocurrency pairs with fixed or floating rates
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Endpoint</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-green-600 px-3 py-1 rounded text-white text-sm font-semibold">
                GET
              </span>
              <code className="text-lg text-blue-300 font-mono">
                /v1/rate
              </code>
            </div>
            <p className="text-neutral-400 text-sm mt-2">
              This endpoint does not require authentication
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Purpose</h2>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          The exchange rate endpoint allows you to retrieve current exchange rates
          between any two supported cryptocurrencies. You can choose between fixed
          rates (locked for a period) or floating rates (real-time market rates).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Fixed vs Float Rates</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Fixed Rate</h3>
            <ul className="space-y-2 text-neutral-400">
              <li>• Rate is locked for 15 minutes</li>
              <li>• Higher fee (typically 1%)</li>
              <li>• Guaranteed exchange amount</li>
              <li>• Best for users who want certainty</li>
              <li>• Rate expires if not used</li>
            </ul>
          </div>
          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Float Rate</h3>
            <ul className="space-y-2 text-neutral-400">
              <li>• Real-time market rate</li>
              <li>• Lower fee (typically 0.5%)</li>
              <li>• Final amount may vary</li>
              <li>• Best for users who want best rate</li>
              <li>• Rate updates continuously</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Query Parameters</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 md:p-6 border border-white/5 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-2 md:px-4 text-blue-400">Parameter</th>
                  <th className="text-left py-2 px-2 md:px-4 text-blue-400">Required</th>
                  <th className="text-left py-2 px-2 md:px-4 text-blue-400">Description</th>
                </tr>
              </thead>
              <tbody className="text-neutral-400">
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">from</td>
                  <td className="py-2 px-2 md:px-4">Yes</td>
                  <td className="py-2 px-2 md:px-4">Source currency code (e.g., BTC, USDT, BNB)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">to</td>
                  <td className="py-2 px-2 md:px-4">Yes</td>
                  <td className="py-2 px-2 md:px-4">Destination currency code</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">from_network</td>
                  <td className="py-2 px-2 md:px-4">Yes*</td>
                  <td className="py-2 px-2 md:px-4">Source network (required for tokens, e.g., ERC20, TRC20)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">to_network</td>
                  <td className="py-2 px-2 md:px-4">Yes*</td>
                  <td className="py-2 px-2 md:px-4">Destination network (required for tokens)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">amount</td>
                  <td className="py-2 px-2 md:px-4">Yes</td>
                  <td className="py-2 px-2 md:px-4">Amount to exchange (numeric)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">rate_type</td>
                  <td className="py-2 px-2 md:px-4">No</td>
                  <td className="py-2 px-2 md:px-4">Rate type: &quot;fixed&quot; or &quot;float&quot; (default: &quot;float&quot;)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">direction</td>
                  <td className="py-2 px-2 md:px-4">No</td>
                  <td className="py-2 px-2 md:px-4">&quot;from&quot; (default) or &quot;to&quot; - direction of amount calculation</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-neutral-500 text-sm mt-4">
            * Network parameters are required for ERC20, TRC20, BEP20 tokens. Not required for native currencies like BTC, ETH.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Direction Parameter</h2>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          The <code className="bg-white/[0.02] px-2 py-1 rounded text-sm">direction</code> parameter determines how the amount is interpreted:
        </p>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5 space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">direction=from (Default)</h3>
            <p className="text-neutral-400 mb-2">
              Calculate how much you&apos;ll receive when sending a specific amount:
            </p>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`GET /v1/rate?from=BTC&to=USDT&amount=0.1&direction=from

Response: {
  "rate": 83134.00,
  "from_amount": 0.1,
  "to_amount": 8313.40,
  "fee": 83.13,
  "fee_percent": 1.0
}`}</code>
            </pre>
            <p className="text-neutral-400 text-sm mt-2">
              &quot;If I send 0.1 BTC, how much USDT will I receive?&quot;
            </p>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">direction=to</h3>
            <p className="text-neutral-400 mb-2">
              Calculate how much you need to send to receive a specific amount:
            </p>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`GET /v1/rate?from=BTC&to=USDT&amount=1000&direction=to

Response: {
  "rate": 83134.00,
  "from_amount": 0.01204,
  "to_amount": 1000.00,
  "fee": 10.00,
  "fee_percent": 1.0
}`}</code>
            </pre>
            <p className="text-neutral-400 text-sm mt-2">
              &quot;How much BTC do I need to send to receive 1000 USDT?&quot;
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Request Examples</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Basic Rate Query</h3>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`curl -X GET "https://api.mintmove.io/v1/rate?from=BTC&to=USDT&amount=0.1&rate_type=fixed" \\
  -H "Content-Type: application/json"`}</code>
            </pre>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">With Networks</h3>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`curl -X GET "https://api.mintmove.io/v1/rate?from=USDT&from_network=ERC20&to=USDT&to_network=TRC20&amount=1000" \\
  -H "Content-Type: application/json"`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Response Example</h2>
        <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
          <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`{
  "success": true,
  "data": {
    "rate": 831.34,
    "from": "BNB",
    "from_network": "BEP20",
    "to": "USDT",
    "to_network": "ERC20",
    "from_amount": 1.202887,
    "to_amount": 1000.00,
    "rate_type": "fixed",
    "fee": 10.00,
    "fee_percent": 1.0,
    "expires_at": "2025-01-27T11:40:00Z",
    "min_amount": 0.01,
    "max_amount": 1000.0
  }
}`}</code>
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Response Fields</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 md:p-6 border border-white/5 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-2 md:px-4 text-blue-400">Field</th>
                  <th className="text-left py-2 px-2 md:px-4 text-blue-400">Description</th>
                </tr>
              </thead>
              <tbody className="text-neutral-400">
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">rate</td>
                  <td className="py-2 px-2 md:px-4">Exchange rate (1 from = rate to)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">from_amount</td>
                  <td className="py-2 px-2 md:px-4">Amount to send (in source currency)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">to_amount</td>
                  <td className="py-2 px-2 md:px-4">Amount to receive (in destination currency)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">fee</td>
                  <td className="py-2 px-2 md:px-4">Exchange fee amount</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">fee_percent</td>
                  <td className="py-2 px-2 md:px-4">Exchange fee percentage</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">expires_at</td>
                  <td className="py-2 px-2 md:px-4">Rate expiration time (ISO 8601, fixed rates only)</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">min_amount / max_amount</td>
                  <td className="py-2 px-2 md:px-4">Minimum and maximum exchange amounts</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Error Responses</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5 space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Invalid Currency Pair</h3>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "INVALID_PAIR",
  "message": "Currency pair BTC/INVALID is not supported"
}`}</code>
            </pre>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Amount Out of Range</h3>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "AMOUNT_OUT_OF_RANGE",
  "message": "Amount must be between 0.01 and 1000.0",
  "min_amount": 0.01,
  "max_amount": 1000.0
}`}</code>
            </pre>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Network Mismatch</h3>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "NETWORK_MISMATCH",
  "message": "Network TRC20 is not supported for currency BTC"
}`}</code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

