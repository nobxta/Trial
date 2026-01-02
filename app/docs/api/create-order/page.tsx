export const metadata = {
  title: "Create Order - MintMove API Documentation",
  description: "Create a new cryptocurrency exchange order",
};

export default function CreateOrderPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Create Order</h1>
        <p className="text-base md:text-lg lg:text-xl text-neutral-400">
          Create a new cryptocurrency exchange order with specified parameters
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Endpoint</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 px-3 py-1 rounded text-white text-sm font-semibold">
                POST
              </span>
              <code className="text-lg text-blue-300 font-mono">
                /v1/order/create
              </code>
            </div>
            <p className="text-neutral-400 text-sm mt-2">
              This endpoint requires authentication
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Required Parameters</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 md:p-6 border border-white/5 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 px-2 md:px-4 text-blue-400">Parameter</th>
                <th className="text-left py-2 px-2 md:px-4 text-blue-400">Type</th>
                <th className="text-left py-2 px-2 md:px-4 text-blue-400">Description</th>
              </tr>
            </thead>
            <tbody className="text-neutral-400">
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">from</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">Source currency code (e.g., BTC, USDT, BNB)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">from_network</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">Source blockchain network (ERC20, TRC20, BEP20, or native)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">to</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">Destination currency code</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">to_network</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">Destination blockchain network</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">amount</td>
                <td className="py-2 px-2 md:px-4">Number</td>
                <td className="py-2 px-2 md:px-4">Amount to exchange (must be within min/max limits)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">rate_type</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">"fixed" or "float" - rate type for the order</td>
              </tr>
              <tr>
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">destination</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">Destination wallet address to receive exchanged funds</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Optional Parameters</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 md:p-6 border border-white/5 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 px-2 md:px-4 text-blue-400">Parameter</th>
                <th className="text-left py-2 px-2 md:px-4 text-blue-400">Type</th>
                <th className="text-left py-2 px-2 md:px-4 text-blue-400">Description</th>
              </tr>
            </thead>
            <tbody className="text-neutral-400">
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">destination_tag</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">Memo/tag for currencies that require it (XRP, XLM, etc.)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">refund_address</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">Address to refund to if order fails (defaults to source)</td>
              </tr>
              <tr>
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">callback_url</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">Webhook URL to receive order status updates</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Address & Tag Handling</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <p className="text-neutral-400 mb-4">
            Some cryptocurrencies require additional information beyond the wallet address:
          </p>
          <ul className="space-y-3 text-sm md:text-base text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">XRP (Ripple)</strong> - Requires destination_tag
                (also called memo or destination tag)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">XLM (Stellar)</strong> - Requires destination_tag
                (memo)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">EOS</strong> - Requires destination_tag (memo)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Other currencies</strong> - destination_tag is
                optional and ignored if provided
              </span>
            </li>
          </ul>
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4">
            <p className="text-yellow-200 text-xs md:text-sm">
              <strong>Important:</strong> If a tag is required but not provided, the order
              will fail. Always check currency requirements before creating orders.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Request Example</h2>
        <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
          <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`POST /v1/order/create
Content-Type: application/json
X-API-KEY: your_api_key
X-API-SIGN: generated_signature
X-API-TIMESTAMP: 1706284800

{
  "from": "BNB",
  "from_network": "BEP20",
  "to": "USDT",
  "to_network": "ERC20",
  "amount": 1.202887,
  "rate_type": "fixed",
  "destination": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "refund_address": "0x1234567890123456789012345678901234567890",
  "callback_url": "https://your-app.com/webhook"
}`}</code>
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Response Example</h2>
        <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
          <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`{
  "success": true,
  "data": {
    "order_id": "MM1234567890",
    "status": "NEW",
    "deposit_address": "0x9876543210987654321098765432109876543210",
    "deposit_currency": "BNB",
    "deposit_network": "BEP20",
    "deposit_amount": 1.202887,
    "receive_currency": "USDT",
    "receive_network": "ERC20",
    "receive_amount": 1000.00,
    "rate": 831.34,
    "rate_type": "fixed",
    "fee": 10.00,
    "destination": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "created_at": "2025-01-27T11:25:00Z",
    "expires_at": "2025-01-27T11:40:00Z",
    "qr_code_url": "https://api.mintmove.io/v1/order/MM1234567890/qr"
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
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">order_id</td>
                <td className="py-2 px-2 md:px-4">Unique order identifier (format: MM followed by numbers)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">status</td>
                <td className="py-2 px-2 md:px-4">Current order status (NEW, PENDING, EXCHANGE, etc.)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">deposit_address</td>
                <td className="py-2 px-2 md:px-4">Address where user should send funds</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">deposit_amount</td>
                <td className="py-2 px-2 md:px-4">Exact amount to deposit (may include network fees)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">receive_amount</td>
                <td className="py-2 px-2 md:px-4">Amount user will receive after exchange</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">rate</td>
                <td className="py-2 px-2 md:px-4">Exchange rate used for this order</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">expires_at</td>
                <td className="py-2 px-2 md:px-4">Order expiration time (ISO 8601). Payment must be sent before this time</td>
              </tr>
              <tr>
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">qr_code_url</td>
                <td className="py-2 px-2 md:px-4">URL to QR code image for easy payment</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Order Lifecycle</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <p className="text-neutral-400 mb-4">
            After creating an order, it follows this lifecycle:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-neutral-400 ml-4">
            <li>
              <strong className="text-white">NEW</strong> - Order created, waiting for deposit
            </li>
            <li>
              <strong className="text-white">PENDING</strong> - Deposit received, waiting for confirmations
            </li>
            <li>
              <strong className="text-white">EXCHANGE</strong> - Funds being exchanged
            </li>
            <li>
              <strong className="text-white">WITHDRAW</strong> - Sending funds to destination address
            </li>
            <li>
              <strong className="text-white">DONE</strong> - Order completed successfully
            </li>
            <li>
              <strong className="text-white">EXPIRED</strong> - Order expired without payment
            </li>
            <li>
              <strong className="text-white">EMERGENCY</strong> - Requires user action
            </li>
          </ol>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Validation Rules</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <ul className="space-y-3 text-sm md:text-base text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                Amount must be within min/max limits for the currency pair
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                Destination address must be valid for the destination network
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                Currency pair must be supported and enabled
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                Network compatibility must be valid (e.g., can't use TRC20 for BTC)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                For fixed rate orders, the rate must not have expired
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Error Responses</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5 space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Invalid Address</h3>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "INVALID_ADDRESS",
  "message": "Destination address is invalid for network ERC20"
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
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Rate Expired</h3>
            <pre className="bg-white/[0.02] rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-white/5">
              <code className="text-xs md:text-sm text-neutral-400 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "RATE_EXPIRED",
  "message": "Fixed rate has expired. Please request a new rate."
}`}</code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

