export const metadata = {
  title: "Emergency Action - MintMove API Documentation",
  description: "Handle emergency situations that require user action",
};

export default function EmergencyPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Emergency Action</h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-300">
          Handle emergency situations that require user intervention
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">When EMERGENCY Happens</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          An order enters EMERGENCY status when an unexpected situation occurs that
          requires user action. This can happen due to various reasons:
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Underpayment</strong> - User sent less than
                the required amount
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Overpayment</strong> - User sent more than
                the required amount
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Rate Slippage</strong> - For float rate orders,
                the rate changed significantly during processing
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Network Issues</strong> - Temporary blockchain
                network problems affecting the exchange
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Address Issues</strong> - Problems with the
                destination address
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Endpoint</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 px-3 py-1 rounded text-white text-sm font-semibold">
                POST
              </span>
              <code className="text-lg text-red-300 font-mono">
                /v1/order/{`{order_id}`}/emergency
              </code>
            </div>
            <p className="text-slate-300 text-sm mt-2">
              This endpoint requires authentication
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">User Options</h2>
        <div className="space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-xl font-semibold text-white mb-3">Continue Exchange</h3>
            <p className="text-slate-300 mb-3">
              Proceed with the exchange using the current conditions. This is typically
              used when the user accepts the current state (e.g., accepts the new rate
              after slippage, or accepts receiving less due to underpayment).
            </p>
            <div className="bg-slate-900 rounded-lg p-4 mt-4">
              <p className="text-slate-400 text-sm mb-2">Action: <code className="text-red-300">continue</code></p>
              <p className="text-slate-300 text-sm">
                The order will proceed to completion with the adjusted amounts.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-xl font-semibold text-white mb-3">Refund</h3>
            <p className="text-slate-300 mb-3">
              Cancel the order and refund the deposited amount back to the user&apos;s
              refund address (or the original sending address if no refund address
              was specified).
            </p>
            <div className="bg-slate-900 rounded-lg p-4 mt-4">
              <p className="text-slate-400 text-sm mb-2">Action: <code className="text-red-300">refund</code></p>
              <p className="text-slate-300 text-sm">
                The order will be cancelled and funds will be returned. This may take
                1-24 hours depending on the network.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-xl font-semibold text-white mb-3">Recalculate</h3>
            <p className="text-slate-300 mb-3">
              Recalculate the exchange based on the actual amount received. This is
              useful for underpayment or overpayment scenarios where you want to
              adjust the exchange amount.
            </p>
            <div className="bg-slate-900 rounded-lg p-4 mt-4">
              <p className="text-slate-400 text-sm mb-2">Action: <code className="text-red-300">recalculate</code></p>
              <p className="text-slate-300 text-sm">
                The order will be recalculated with the actual received amount and
                a new rate will be applied.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Request Parameters</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 md:p-6 border border-red-500/20 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-4 text-red-400">Parameter</th>
                <th className="text-left py-2 px-4 text-red-400">Required</th>
                <th className="text-left py-2 px-4 text-red-400">Description</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">action</td>
                <td className="py-2 px-2 md:px-4">Yes</td>
                <td className="py-2 px-2 md:px-4">One of: &quot;continue&quot;, &quot;refund&quot;, &quot;recalculate&quot;</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">refund_address</td>
                <td className="py-2 px-2 md:px-4">No*</td>
                <td className="py-2 px-2 md:px-4">Refund address (required if action is &quot;refund&quot; and no refund_address was set during order creation)</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Request Example</h2>
        <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
          <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`POST /v1/order/MM1234567890/emergency
Content-Type: application/json
X-API-KEY: your_api_key
X-API-SIGN: generated_signature
X-API-TIMESTAMP: 1706284800

{
  "action": "continue"
}`}</code>
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Response Example</h2>
        <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
          <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "success": true,
  "data": {
    "order_id": "MM1234567890",
    "status": "EXCHANGE",
    "message": "Order will continue with adjusted amounts",
    "updated_at": "2025-01-27T11:35:00Z"
  }
}`}</code>
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Example Flows</h2>
        <div className="space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Underpayment Scenario</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 ml-4">
              <li>User sends 0.09 BTC instead of required 0.1 BTC</li>
              <li>Order status changes to EMERGENCY</li>
              <li>User can choose:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li><strong>Refund</strong> - Get 0.09 BTC back</li>
                  <li><strong>Recalculate</strong> - Exchange 0.09 BTC for proportional USDT</li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Rate Slippage Scenario</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 ml-4">
              <li>Float rate order created at rate 831.34</li>
              <li>During processing, rate drops to 800.00 (3.8% slippage)</li>
              <li>Order status changes to EMERGENCY</li>
              <li>User can choose:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li><strong>Continue</strong> - Accept the new rate and receive less</li>
                  <li><strong>Refund</strong> - Cancel and get original deposit back</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Processing Timeframes</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Continue:</strong> Order proceeds immediately
                (usually completes within minutes)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Recalculate:</strong> Recalculation happens
                immediately, then order proceeds (usually completes within minutes)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Refund:</strong> Refunds typically process
                within 1-24 hours depending on network congestion and the currency
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Error Responses</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20 space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Order Not in Emergency</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "NOT_EMERGENCY",
  "message": "Order is not in EMERGENCY status"
}`}</code>
            </pre>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Invalid Action</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "INVALID_ACTION",
  "message": "Action must be one of: continue, refund, recalculate"
}`}</code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

