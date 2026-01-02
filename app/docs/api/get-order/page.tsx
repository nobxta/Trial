export const metadata = {
  title: "Get Order Details - MintMove API Documentation",
  description: "Retrieve detailed information about an exchange order",
};

export default function GetOrderPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Get Order Details</h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-300">
          Retrieve comprehensive information about a specific exchange order
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Endpoint</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-green-600 px-3 py-1 rounded text-white text-sm font-semibold">
                GET
              </span>
              <code className="text-lg text-red-300 font-mono">
                /v1/order/{`{order_id}`}
              </code>
            </div>
            <p className="text-slate-300 text-sm mt-2">
              This endpoint requires authentication
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Order Identification</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            Orders can be identified using either:
          </p>
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Order ID</strong> - The full order identifier
                (e.g., <code className="bg-slate-900 px-2 py-1 rounded text-xs">MM1234567890</code>)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Token + ID</strong> - Use the token from order
                creation along with a shorter ID for convenience
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Request Example</h2>
        <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
          <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`GET /v1/order/MM1234567890
Content-Type: application/json
X-API-KEY: your_api_key
X-API-SIGN: generated_signature
X-API-TIMESTAMP: 1706284800`}</code>
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Response Example</h2>
        <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
          <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "success": true,
  "data": {
    "order_id": "MM1234567890",
    "status": "PENDING",
    "deposit_address": "0x9876543210987654321098765432109876543210",
    "deposit_currency": "BNB",
    "deposit_network": "BEP20",
    "deposit_amount": 1.202887,
    "deposit_received": 1.202887,
    "deposit_confirmations": 3,
    "deposit_required_confirmations": 12,
    "receive_currency": "USDT",
    "receive_network": "ERC20",
    "receive_amount": 1000.00,
    "receive_final_amount": 1000.00,
    "rate": 831.34,
    "rate_type": "fixed",
    "fee": 10.00,
    "destination": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "deposit_tx_hash": "0xabc123...",
    "withdraw_tx_hash": null,
    "created_at": "2025-01-27T11:25:00Z",
    "updated_at": "2025-01-27T11:30:00Z",
    "expires_at": "2025-01-27T11:40:00Z",
    "completed_at": null
  }
}`}</code>
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Response Fields</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 md:p-6 border border-red-500/20 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-4 text-red-400">Field</th>
                <th className="text-left py-2 px-4 text-red-400">Description</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">status</td>
                <td className="py-2 px-2 md:px-4">Current order status (see statuses below)</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">deposit_received</td>
                <td className="py-2 px-2 md:px-4">Amount of deposit received (may be less than deposit_amount if underpaid)</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">deposit_confirmations</td>
                <td className="py-2 px-2 md:px-4">Number of blockchain confirmations received</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">deposit_required_confirmations</td>
                <td className="py-2 px-2 md:px-4">Required confirmations before processing</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">receive_final_amount</td>
                <td className="py-2 px-2 md:px-4">Final amount to be received (may differ for float rates)</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">deposit_tx_hash</td>
                <td className="py-2 px-2 md:px-4">Transaction hash of the deposit (null if not received)</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">withdraw_tx_hash</td>
                <td className="py-2 px-2 md:px-4">Transaction hash of the withdrawal (null if not sent)</td>
              </tr>
              <tr>
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">completed_at</td>
                <td className="py-2 px-2 md:px-4">Order completion timestamp (null if not completed)</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Order Statuses</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20 space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">NEW</h3>
            <p className="text-sm md:text-base text-slate-300">
              Order has been created and is waiting for the user to send funds to
              the deposit address. No payment has been received yet.
            </p>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">PENDING</h3>
            <p className="text-sm md:text-base text-slate-300">
              Deposit has been received and is waiting for blockchain confirmations.
              The system is monitoring the transaction until it reaches the required
              confirmation count.
            </p>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">EXCHANGE</h3>
            <p className="text-sm md:text-base text-slate-300">
              Confirmations complete. The system is now exchanging the funds. This
              typically happens very quickly but may take a few minutes during high
              network congestion.
            </p>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">WITHDRAW</h3>
            <p className="text-sm md:text-base text-slate-300">
              Exchange complete. Funds are being sent to the destination address.
              The withdrawal transaction has been broadcast to the blockchain.
            </p>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">DONE</h3>
            <p className="text-sm md:text-base text-slate-300">
              Order completed successfully. Funds have been sent to the destination
              address and the transaction has been confirmed on the blockchain.
            </p>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">EXPIRED</h3>
            <p className="text-sm md:text-base text-slate-300">
              Order expired without receiving payment. The deposit address is no
              longer valid. User must create a new order if they still want to exchange.
            </p>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">EMERGENCY</h3>
            <p className="text-sm md:text-base text-slate-300">
              An unexpected situation occurred that requires user action. The user
              must choose to continue, refund, or cancel the order. See the Emergency
              Action endpoint for details.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Polling Model</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          To track order status, you should poll this endpoint periodically. Here
          are recommended polling intervals:
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">NEW status:</strong> Poll every 10-30 seconds
                to detect when payment is received
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">PENDING status:</strong> Poll every 30-60 seconds
                to track confirmation progress
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">EXCHANGE/WITHDRAW status:</strong> Poll every
                15-30 seconds until DONE
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">DONE/EXPIRED/EMERGENCY:</strong> No need to
                poll further (final states)
              </span>
            </li>
          </ul>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 md:p-4">
          <p className="text-yellow-200 text-xs md:text-sm">
            <strong>Best Practice:</strong> Instead of polling, use webhooks to receive
            real-time status updates. This reduces API calls and provides instant
            notifications. See the Notifications endpoint for setup.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Confirmation Tracking</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          The <code className="bg-slate-900 px-2 py-1 rounded text-sm">deposit_confirmations</code> field shows
          how many blockchain confirmations have been received. Different networks
          require different confirmation counts:
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 md:p-6 border border-red-500/20 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-4 text-red-400">Network</th>
                <th className="text-left py-2 px-4 text-red-400">Required Confirmations</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">BTC</td>
                <td className="py-2 px-2 md:px-4">3-6 confirmations</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">ERC20</td>
                <td className="py-2 px-2 md:px-4">12 confirmations</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">TRC20</td>
                <td className="py-2 px-2 md:px-4">20 confirmations</td>
              </tr>
              <tr>
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">BEP20</td>
                <td className="py-2 px-2 md:px-4">12 confirmations</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Transaction Hashes</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            Transaction hashes allow you to verify transactions on blockchain explorers:
          </p>
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">deposit_tx_hash</strong> - Hash of the
                transaction where user sent funds (available once payment is detected)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">withdraw_tx_hash</strong> - Hash of the
                transaction sending funds to destination (available during WITHDRAW status)
              </span>
            </li>
          </ul>
          <p className="text-slate-300 mt-4 text-sm">
            Use these hashes to look up transactions on block explorers like Etherscan,
            BscScan, or Tronscan to verify transaction details independently.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Error Responses</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Order Not Found</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "ORDER_NOT_FOUND",
  "message": "Order MM1234567890 not found"
}`}</code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

