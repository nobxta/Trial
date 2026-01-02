export const metadata = {
  title: "SDKs & Libraries - MintMove API Documentation",
  description: "Official SDKs and libraries for easy API integration",
};

export default function LibrariesPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">SDKs & Libraries</h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-300">
          Official SDKs and community libraries for easy integration
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Official SDKs</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          MintMove provides official SDKs for popular programming languages to
          simplify API integration. These SDKs handle authentication, request
          signing, error handling, and provide type-safe interfaces.
        </p>
      </section>

      <section className="space-y-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-semibold text-white mb-2">JavaScript / Node.js</h3>
              <p className="text-sm md:text-base text-slate-300">
                Official TypeScript/JavaScript SDK for Node.js and browser environments
              </p>
            </div>
            <div className="bg-red-600 px-3 py-1 rounded text-white text-sm font-semibold">
              Official
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Installation</h4>
              <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
                <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">npm install mintmove-api</code>
              </pre>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Usage Example</h4>
              <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
                <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`const { MintMoveAPI } = require('mintmove-api');

const client = new MintMoveAPI({
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret'
});

// Get exchange rate
const rate = await client.getRate({
  from: 'BTC',
  to: 'USDT',
  amount: 0.1
});

// Create order
const order = await client.createOrder({
  from: 'BNB',
  from_network: 'BEP20',
  to: 'USDT',
  to_network: 'ERC20',
  amount: 1.202887,
  rate_type: 'fixed',
  destination: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
});

console.log('Order ID:', order.order_id);`}</code>
              </pre>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">GitHub Repository</h4>
              <a
                href="https://github.com/mintmove/mintmove-js"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300 underline"
              >
                github.com/mintmove/mintmove-js
              </a>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-semibold text-white mb-2">Python</h3>
              <p className="text-sm md:text-base text-slate-300">
                Official Python SDK with full type hints and async support
              </p>
            </div>
            <div className="bg-red-600 px-3 py-1 rounded text-white text-sm font-semibold">
              Official
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Installation</h4>
              <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
                <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">pip install mintmove-api</code>
              </pre>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Usage Example</h4>
              <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
                <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`from mintmove import MintMoveAPI

client = MintMoveAPI(
    api_key='your_api_key',
    api_secret='your_api_secret'
)

# Get exchange rate
rate = client.get_rate(
    from_currency='BTC',
    to_currency='USDT',
    amount=0.1
)

# Create order
order = client.create_order(
    from_currency='BNB',
    from_network='BEP20',
    to_currency='USDT',
    to_network='ERC20',
    amount=1.202887,
    rate_type='fixed',
    destination='0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
)

print(f'Order ID: {order.order_id}')`}</code>
              </pre>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">GitHub Repository</h4>
              <a
                href="https://github.com/mintmove/mintmove-python"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300 underline"
              >
                github.com/mintmove/mintmove-python
              </a>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-semibold text-white mb-2">PHP</h3>
              <p className="text-sm md:text-base text-slate-300">
                Official PHP SDK with PSR standards compliance
              </p>
            </div>
            <div className="bg-red-600 px-3 py-1 rounded text-white text-sm font-semibold">
              Official
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Installation</h4>
              <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
                <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">composer require mintmove/mintmove-php</code>
              </pre>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Usage Example</h4>
              <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
                <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`<?php
require 'vendor/autoload.php';

use MintMove\\MintMoveAPI;

$client = new MintMoveAPI([
    'api_key' => 'your_api_key',
    'api_secret' => 'your_api_secret'
]);

// Get exchange rate
$rate = $client->getRate([
    'from' => 'BTC',
    'to' => 'USDT',
    'amount' => 0.1
]);

// Create order
$order = $client->createOrder([
    'from' => 'BNB',
    'from_network' => 'BEP20',
    'to' => 'USDT',
    'to_network' => 'ERC20',
    'amount' => 1.202887,
    'rate_type' => 'fixed',
    'destination' => '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
]);

echo 'Order ID: ' . $order['order_id'];
?>`}</code>
              </pre>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">GitHub Repository</h4>
              <a
                href="https://github.com/mintmove/mintmove-php"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300 underline"
              >
                github.com/mintmove/mintmove-php
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">SDK Features</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Automatic Authentication</strong> -
                Handles signature generation and header management automatically
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Type Safety</strong> - Full type
                definitions and IDE autocomplete support
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Error Handling</strong> - Consistent
                error handling with detailed error messages
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Rate Limit Management</strong> -
                Built-in rate limit tracking and automatic retry with backoff
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Request Validation</strong> -
                Validates request parameters before sending
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Webhook Support</strong> - Built-in
                webhook signature verification
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Community Contributions</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          All official SDKs are open-source and hosted on GitHub. We welcome
          community contributions, bug reports, and feature requests.
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Open Source</strong> - All SDKs are
                MIT licensed and available on GitHub
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Issue Tracking</strong> - Report bugs
                and request features through GitHub Issues
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Pull Requests</strong> - Contributions
                are welcome! Please read our contributing guidelines
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Documentation</strong> - Each SDK
                includes comprehensive documentation and examples
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Unofficial Libraries</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          Community-maintained libraries for other languages. These are not
          officially supported by MintMove, but may be useful for your needs:
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li>
              <strong className="text-white">Go / Golang</strong> - Community
              maintained Go client library
            </li>
            <li>
              <strong className="text-white">Ruby</strong> - Ruby gem for MintMove API
            </li>
            <li>
              <strong className="text-white">Rust</strong> - Rust crate for API integration
            </li>
            <li>
              <strong className="text-white">Java</strong> - Java client library
            </li>
          </ul>
          <p className="text-slate-400 text-sm mt-4">
            Note: Unofficial libraries may not be up-to-date with the latest API
            changes. Use at your own discretion.
          </p>
        </div>
      </section>
    </div>
  );
}

