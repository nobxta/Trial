export const metadata = {
  title: "Introduction - MintMove API Documentation",
  description: "Learn about MintMove API and what it can do",
};

export default function IntroductionPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Introduction</h1>
        <p className="text-base md:text-lg lg:text-xl text-neutral-400">
          Welcome to the MintMove API documentation
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">What is MintMove API?</h2>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          MintMove API is a RESTful web service that provides programmatic access
          to cryptocurrency exchange functionality. It enables developers to
          integrate cryptocurrency exchange capabilities into their applications,
          automate trading workflows, and build custom exchange interfaces.
        </p>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
          The API allows you to retrieve real-time exchange rates, create and
          manage exchange orders, track order status, handle emergency situations,
          and generate payment QR codes—all through simple HTTP requests.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Technology Stack</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <ul className="space-y-3 text-sm md:text-base text-neutral-400">
            <li>
              <strong className="text-white">REST API</strong> - Standard HTTP
              methods (GET, POST) following RESTful principles
            </li>
            <li>
              <strong className="text-white">JSON</strong> - All requests and
              responses use JSON format for easy parsing and integration
            </li>
            <li>
              <strong className="text-white">HTTPS Only</strong> - All API
              endpoints require secure HTTPS connections to protect your data
              and API credentials
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Who is This For?</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">
              Cryptocurrency Exchanges
            </h3>
            <p className="text-neutral-400">
              Integrate MintMove's exchange engine into your platform to offer
              instant cryptocurrency swaps to your users.
            </p>
          </div>
          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">
              Trading Bots
            </h3>
            <p className="text-neutral-400">
              Automate your trading strategies by programmatically creating and
              managing exchange orders through the API.
            </p>
          </div>
          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">
              Payment Flows
            </h3>
            <p className="text-neutral-400">
              Accept payments in any cryptocurrency and automatically convert to
              your preferred currency using our exchange infrastructure.
            </p>
          </div>
          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">
              DeFi Applications
            </h3>
            <p className="text-neutral-400">
              Build decentralized finance applications that leverage
              cross-chain exchange capabilities for seamless asset transfers.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Core Capabilities</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <ul className="space-y-3 text-sm md:text-base text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Retrieve Exchange Rates</strong> -
                Get real-time and fixed exchange rates for any cryptocurrency pair
                across multiple blockchain networks
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">View Available Currencies</strong> -
                Discover all supported cryptocurrencies and their compatible
                networks with minimum and maximum exchange amounts
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Create and Track Orders</strong> -
                Programmatically create exchange orders and monitor their status
                through the complete lifecycle
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Subscribe to Order Updates</strong> -
                Receive real-time notifications via webhooks when order status
                changes occur
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Generate QR Codes</strong> -
                Automatically generate QR codes for payment addresses with
                embedded amounts for easy mobile payments
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>
                <strong className="text-white">Handle Emergency Actions</strong> -
                Manage unexpected situations with options to refund, recalculate,
                or cancel orders
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Next Steps</h2>
        <div className="bg-gradient-to-r from-blue-600/20 to-blue-700/20 rounded-lg p-6 border border-white/5">
          <p className="text-neutral-400 mb-4">
            Ready to get started? Follow these steps:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-neutral-400">
            <li>Read the <a href="/docs/authentication" className="text-blue-400 hover:text-blue-300 underline">Authentication</a> guide to understand how API security works</li>
            <li>Get your <a href="/docs/get-api-key" className="text-blue-400 hover:text-blue-300 underline">API Key</a> from the dashboard</li>
            <li>Review the <a href="/docs/requests" className="text-blue-400 hover:text-blue-300 underline">Request Format</a> documentation</li>
            <li>Make your first API call using the <a href="/docs/api/available-currencies" className="text-blue-400 hover:text-blue-300 underline">Available Currencies</a> endpoint</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

