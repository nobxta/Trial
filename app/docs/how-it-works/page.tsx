export const metadata = {
  title: "How It Works - MintMove API Documentation",
  description: "Complete flow of the cryptocurrency exchange process",
};

export default function HowItWorksPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">How It Works</h1>
        <p className="text-base md:text-lg lg:text-xl text-neutral-400">
          Complete flow of the cryptocurrency exchange process
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Overview</h2>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          The MintMove API enables seamless cryptocurrency exchanges across different
          blockchain networks. This guide walks through the complete order lifecycle
          from creation to completion.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Complete Exchange Flow</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  Fetch Available Currencies
                </h3>
                <p className="text-neutral-400">
                  First, retrieve the list of supported cryptocurrencies and networks
                  using the <code className="bg-white/[0.02] px-2 py-1 rounded text-sm">/v1/currencies</code> endpoint.
                  This shows you which pairs are available and their limits.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  Get Exchange Rate
                </h3>
                <p className="text-neutral-400">
                  Query the current exchange rate for your desired currency pair using
                  <code className="bg-white/[0.02] px-2 py-1 rounded text-sm">/v1/rate</code>. Choose between fixed
                  (locked for 15 minutes) or float (real-time) rates. The response
                  includes the rate, fees, and amount calculations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  Create Order
                </h3>
                <p className="text-neutral-400">
                  Create a new exchange order using <code className="bg-white/[0.02] px-2 py-1 rounded text-sm">/v1/order/create</code>.
                  Provide the source and destination currencies, networks, amount,
                  rate type, and destination address. You'll receive a unique order
                  ID and a deposit address where the user should send funds.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  User Sends Funds
                </h3>
                <p className="text-neutral-400">
                  The user sends cryptocurrency to the deposit address provided in the
                  order. You can display a QR code (generated via <code className="bg-white/[0.02] px-2 py-1 rounded text-sm">/v1/order/{`{id}`}/qr</code>)
                  to make this easier. The order status remains "NEW" until payment
                  is detected.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                5
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  System Confirms Payment
                </h3>
                <p className="text-neutral-400">
                  Our system monitors the blockchain and detects when payment is
                  received. The order status changes to "PENDING" and we begin
                  tracking blockchain confirmations. The number of required confirmations
                  depends on the network (e.g., 12 for ERC20, 20 for TRC20).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                6
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  Exchange Processing
                </h3>
                <p className="text-neutral-400">
                  Once confirmations are complete, the order status changes to "EXCHANGE".
                  Our system processes the exchange, converting the deposited currency
                  to the destination currency. For float rate orders, the final rate
                  is calculated at this stage.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                7
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  Withdrawal
                </h3>
                <p className="text-neutral-400">
                  After exchange, the order status becomes "WITHDRAW". Funds are sent
                  to the destination address provided during order creation. The
                  withdrawal transaction is broadcast to the destination blockchain.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                8
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  Completion
                </h3>
                <p className="text-neutral-400">
                  Once the withdrawal transaction is confirmed, the order status changes
                  to "DONE". The exchange is complete and funds are in the user's wallet.
                  You can verify the transaction using the withdrawal transaction hash.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Order Status Flow Diagram</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="bg-blue-600 px-4 py-2 rounded text-white font-semibold">
              NEW
            </div>
            <div className="text-blue-400">→</div>
            <div className="bg-yellow-600 px-4 py-2 rounded text-white font-semibold">
              PENDING
            </div>
            <div className="text-blue-400">→</div>
            <div className="bg-blue-600 px-4 py-2 rounded text-white font-semibold">
              EXCHANGE
            </div>
            <div className="text-blue-400">→</div>
            <div className="bg-indigo-600 px-4 py-2 rounded text-white font-semibold">
              WITHDRAW
            </div>
            <div className="text-blue-400">→</div>
            <div className="bg-green-600 px-4 py-2 rounded text-white font-semibold">
              DONE
            </div>
          </div>
          <div className="mt-6 space-y-2 text-neutral-400 text-sm">
            <p className="text-center">
              <strong className="text-white">Alternative paths:</strong>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="bg-blue-600 px-4 py-2 rounded text-white font-semibold">
                EXPIRED
              </div>
              <div className="text-slate-400">or</div>
              <div className="bg-orange-600 px-4 py-2 rounded text-white font-semibold">
                EMERGENCY
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Emergency Situations</h2>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          If an unexpected situation occurs (underpayment, overpayment, rate slippage,
          etc.), the order enters "EMERGENCY" status. The user must choose an action:
        </p>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <ul className="space-y-3 text-sm md:text-base text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Continue</strong> - Proceed with exchange
                using current conditions
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Refund</strong> - Cancel order and return
                funds to user
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Recalculate</strong> - Adjust exchange
                based on actual amount received
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Tracking Orders</h2>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          You can track order status in several ways:
        </p>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <ul className="space-y-3 text-sm md:text-base text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Polling</strong> - Periodically call
                <code className="bg-white/[0.02] px-2 py-1 rounded text-xs">/v1/order/{`{id}`}</code> to check status
                (recommended intervals: 10-60 seconds depending on status)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Webhooks</strong> - Subscribe to webhooks
                to receive real-time status updates (recommended for production)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Email Notifications</strong> - Enable
                email notifications for important status changes
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Timing Considerations</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <ul className="space-y-3 text-sm md:text-base text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Order Expiration:</strong> Orders expire
                after 15 minutes if no payment is received. Users must send funds before
                the expiration time.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Blockchain Confirmations:</strong> Time
                varies by network. Bitcoin can take 10-60 minutes, while ERC20/TRC20
                typically take 2-5 minutes.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Exchange Processing:</strong> Usually
                completes within 1-5 minutes after confirmations.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Withdrawal:</strong> Depends on destination
                network. Most networks confirm within 1-5 minutes.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Best Practices</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <ul className="space-y-3 text-sm md:text-base text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                Always check order status before displaying completion to users
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                Use webhooks instead of aggressive polling to reduce API calls
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                Display expiration time clearly to users so they know when to send funds
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                Handle emergency situations promptly to avoid delays
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                Verify transaction hashes on blockchain explorers for transparency
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

