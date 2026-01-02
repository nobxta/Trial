export const metadata = {
  title: "Notifications - MintMove API Documentation",
  description: "Subscribe to email notifications for order status updates",
};

export default function NotificationsPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Subscribe to Notifications</h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-300">
          Set up email notifications for order status changes
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Overview</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          MintMove supports email notifications that are automatically sent when
          important order status changes occur. This provides an additional layer
          of communication beyond API polling and webhooks.
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-sm md:text-base text-slate-300">
            <strong className="text-white">Note:</strong> Email notifications are
            configured per order using the <code className="bg-slate-900 px-2 py-1 rounded text-sm">callback_url</code> parameter
            during order creation, or you can subscribe to notifications for all
            orders through your account settings in the dashboard.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">When Notifications Trigger</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            Email notifications are sent for the following events:
          </p>
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Order Created</strong> - Confirmation
                that your order was successfully created with deposit details
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Payment Received</strong> - Notification
                when your deposit is detected on the blockchain
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Order Completed</strong> - Confirmation
                that the exchange completed and funds were sent to your destination
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Order Failed</strong> - Alert when an
                order fails or enters emergency status
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Order Expired</strong> - Notification
                if an order expires without receiving payment
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Emergency Action Required</strong> -
                Alert when user action is needed to resolve an emergency situation
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Email Notification Content</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            Each notification email includes:
          </p>
          <ul className="space-y-2 text-slate-300">
            <li>• Order ID and current status</li>
            <li>• Transaction details (amounts, currencies, networks)</li>
            <li>• Transaction hashes (when available)</li>
            <li>• Links to view order details in dashboard</li>
            <li>• Links to blockchain explorers for transaction verification</li>
            <li>• Action buttons (for emergency situations)</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Setting Up Notifications</h2>
        <div className="space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Method 1: Per-Order (API)</h3>
            <p className="text-slate-300 mb-3">
              Include a callback URL when creating an order. The email will be sent
              to the address associated with your API key:
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`POST /v1/order/create
{
  "from": "BNB",
  "to": "USDT",
  "amount": 1.0,
  "rate_type": "fixed",
  "destination": "0x...",
  "callback_url": "https://your-app.com/webhook"
}`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Method 2: Account Settings (Dashboard)</h3>
            <p className="text-slate-300 mb-3">
              Enable notifications for all orders through your account settings:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 ml-4">
              <li>Log in to your MintMove account</li>
              <li>Go to Dashboard → Settings → Notifications</li>
              <li>Enable &quot;Email Notifications&quot;</li>
              <li>Select which events you want to be notified about</li>
              <li>Save your preferences</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">How to Unsubscribe</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            You can unsubscribe from email notifications in several ways:
          </p>
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Via Dashboard:</strong> Go to Settings →
                Notifications and disable email notifications
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Via Email:</strong> Click the unsubscribe
                link at the bottom of any notification email
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Per-Order:</strong> Don&apos;t include
                <code className="bg-slate-900 px-2 py-1 rounded text-xs">callback_url</code> when creating orders
                (only affects that specific order)
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Notification Preferences</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            You can customize which events trigger notifications:
          </p>
          <ul className="space-y-2 text-slate-300">
            <li>• Order created (always sent if enabled)</li>
            <li>• Payment received (optional)</li>
            <li>• Order completed (recommended)</li>
            <li>• Order failed/expired (recommended)</li>
            <li>• Emergency action required (always sent if enabled)</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Best Practices</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                Use email notifications as a backup to webhooks, not as the primary
                notification method
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                Enable notifications for critical events (completion, failures, emergencies)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                Monitor your email spam folder to ensure notifications are being received
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                For high-volume applications, prefer webhooks over email notifications
                to avoid email overload
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Webhooks vs Email</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            Both webhooks and email notifications serve similar purposes but have
            different use cases:
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <h4 className="text-white font-semibold mb-2">Webhooks</h4>
              <ul className="space-y-1 text-slate-300 text-sm">
                <li>• Real-time, instant delivery</li>
                <li>• Programmatic integration</li>
                <li>• Requires server endpoint</li>
                <li>• Best for automation</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Email</h4>
              <ul className="space-y-1 text-slate-300 text-sm">
                <li>• Human-readable format</li>
                <li>• No server required</li>
                <li>• May have delivery delays</li>
                <li>• Best for monitoring</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

