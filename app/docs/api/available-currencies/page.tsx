export const metadata = {
  title: "Available Currencies - MintMove API Documentation",
  description: "Get list of supported cryptocurrencies and networks",
};

export default function AvailableCurrenciesPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Available Currencies</h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-300">
          Retrieve a list of all supported cryptocurrencies and their compatible networks
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
                /v1/currencies
              </code>
            </div>
            <p className="text-slate-300 text-sm mt-2">
              This endpoint does not require authentication
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Request Example</h2>
        <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
          <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`curl -X GET "https://api.mintmove.io/v1/currencies" \\
  -H "Content-Type: application/json"`}</code>
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Response Example</h2>
        <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
          <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "success": true,
  "data": {
    "BTC": {
      "networks": ["BTC"],
      "name": "Bitcoin",
      "logo": "https://api.mintmove.io/assets/btc.png",
      "color": "#F7931A",
      "precision": 8,
      "min_amount": 0.0001,
      "max_amount": 10.0,
      "enabled": true,
      "priority": 1
    },
    "USDT": {
      "networks": ["ERC20", "TRC20", "BEP20"],
      "name": "Tether",
      "logo": "https://api.mintmove.io/assets/usdt.png",
      "color": "#26A17B",
      "precision": 6,
      "min_amount": 1.0,
      "max_amount": 100000.0,
      "enabled": true,
      "priority": 1
    },
    "BNB": {
      "networks": ["BEP20"],
      "name": "BNB",
      "logo": "https://api.mintmove.io/assets/bnb.png",
      "color": "#F3BA2F",
      "precision": 8,
      "min_amount": 0.01,
      "max_amount": 1000.0,
      "enabled": true,
      "priority": 2
    }
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
                <th className="text-left py-2 px-4 text-red-400">Type</th>
                <th className="text-left py-2 px-4 text-red-400">Description</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">networks</td>
                <td className="py-2 px-2 md:px-4">Array</td>
                <td className="py-2 px-2 md:px-4">Supported blockchain networks (e.g., ERC20, TRC20, BEP20)</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">name</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">Full currency name</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">logo</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">URL to currency logo image</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">color</td>
                <td className="py-2 px-2 md:px-4">String</td>
                <td className="py-2 px-2 md:px-4">Brand color in hex format</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">precision</td>
                <td className="py-2 px-2 md:px-4">Number</td>
                <td className="py-2 px-2 md:px-4">Decimal precision for amounts</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">min_amount</td>
                <td className="py-2 px-2 md:px-4">Number</td>
                <td className="py-2 px-2 md:px-4">Minimum exchange amount</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">max_amount</td>
                <td className="py-2 px-2 md:px-4">Number</td>
                <td className="py-2 px-2 md:px-4">Maximum exchange amount</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">enabled</td>
                <td className="py-2 px-2 md:px-4">Boolean</td>
                <td className="py-2 px-2 md:px-4">Whether the currency is currently available</td>
              </tr>
              <tr>
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">priority</td>
                <td className="py-2 px-2 md:px-4">Number</td>
                <td className="py-2 px-2 md:px-4">Display priority (1 = highest, used for sorting)</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Supported Networks</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li>
              <strong className="text-white">ERC20</strong> - Ethereum network
              (Ethereum mainnet)
            </li>
            <li>
              <strong className="text-white">TRC20</strong> - Tron network
              (Tron mainnet)
            </li>
            <li>
              <strong className="text-white">BEP20</strong> - Binance Smart Chain
              (BSC mainnet)
            </li>
            <li>
              <strong className="text-white">BTC</strong> - Bitcoin native network
            </li>
            <li>
              <strong className="text-white">ETH</strong> - Ethereum native network
            </li>
            <li>
              <strong className="text-white">BNB</strong> - Binance Coin native network
            </li>
            <li>
              <strong className="text-white">SOL</strong> - Solana native network
            </li>
            <li>
              <strong className="text-white">TRX</strong> - Tron native network
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Usage Notes</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                The response is cached for 5 minutes. Currency availability may
                change, so refresh periodically for production applications.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                Only currencies with <code className="bg-slate-900 px-2 py-1 rounded text-xs">enabled: true</code>{" "}
                are available for exchange.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                Use the <code className="bg-slate-900 px-2 py-1 rounded text-xs">priority</code> field to sort
                currencies in your UI (lower numbers = higher priority).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                Network compatibility is important - ensure you select compatible
                networks when creating orders.
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

