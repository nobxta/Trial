export const metadata = {
  title: "XML Export of Rates - MintMove API Documentation",
  description: "Access exchange rates via XML feed for legacy systems and monitoring",
};

export default function XMLRatesPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">XML Export of Rates</h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-300">
          Access exchange rates in XML format for legacy systems and monitoring tools
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
                /v1/rates.xml
              </code>
            </div>
            <p className="text-slate-300 text-sm mt-2">
              This endpoint does not require authentication
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Query Parameters</h2>
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
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">rate_type</td>
                <td className="py-2 px-2 md:px-4">No</td>
                <td className="py-2 px-2 md:px-4">&quot;fixed&quot; or &quot;float&quot; (default: &quot;float&quot;)</td>
              </tr>
              <tr>
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">base</td>
                <td className="py-2 px-2 md:px-4">No</td>
                <td className="py-2 px-2 md:px-4">Base currency for rates (default: &quot;USDT&quot;)</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Fixed vs Float XML</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Fixed Rates</h3>
            <p className="text-slate-300 mb-3">
              Fixed rates are locked for 15 minutes and include expiration timestamps:
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`GET /v1/rates.xml?rate_type=fixed`}</code>
            </pre>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Float Rates</h3>
            <p className="text-slate-300 mb-3">
              Float rates are real-time market rates that update continuously:
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`GET /v1/rates.xml?rate_type=float`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">XML Schema</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          The XML response follows this structure:
        </p>
        <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
          <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`<?xml version="1.0" encoding="UTF-8"?>
<rates>
  <timestamp>1706284800</timestamp>
  <rate_type>float</rate_type>
  <base>USDT</base>
  <pairs>
    <pair>
      <from>BTC</from>
      <from_network>BTC</from_network>
      <to>USDT</to>
      <to_network>ERC20</to_network>
      <rate>83134.50</rate>
      <fee_percent>0.5</fee_percent>
      <min_amount>0.0001</min_amount>
      <max_amount>10.0</max_amount>
      <enabled>true</enabled>
    </pair>
    <pair>
      <from>BNB</from>
      <from_network>BEP20</from_network>
      <to>USDT</to>
      <to_network>ERC20</to_network>
      <rate>831.34</rate>
      <fee_percent>1.0</fee_percent>
      <min_amount>0.01</min_amount>
      <max_amount>1000.0</max_amount>
      <enabled>true</enabled>
    </pair>
  </pairs>
</rates>`}</code>
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Field-by-Field Explanation</h2>
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
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">timestamp</td>
                <td className="py-2 px-2 md:px-4">Unix timestamp when rates were generated</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">rate_type</td>
                <td className="py-2 px-2 md:px-4">Type of rates: &quot;fixed&quot; or &quot;float&quot;</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">base</td>
                <td className="py-2 px-2 md:px-4">Base currency for rate calculations</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">from / to</td>
                <td className="py-2 px-2 md:px-4">Source and destination currency codes</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">from_network / to_network</td>
                <td className="py-2 px-2 md:px-4">Blockchain networks for the currencies</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">rate</td>
                <td className="py-2 px-2 md:px-4">Exchange rate (1 from = rate to)</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">fee_percent</td>
                <td className="py-2 px-2 md:px-4">Exchange fee percentage</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">min_amount / max_amount</td>
                <td className="py-2 px-2 md:px-4">Minimum and maximum exchange amounts</td>
              </tr>
              <tr>
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">enabled</td>
                <td className="py-2 px-2 md:px-4">Whether this pair is currently available</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Request Examples</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Basic Request</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`curl -X GET "https://api.mintmove.io/v1/rates.xml" \\
  -H "Accept: application/xml"`}</code>
            </pre>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Fixed Rates</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`curl -X GET "https://api.mintmove.io/v1/rates.xml?rate_type=fixed" \\
  -H "Accept: application/xml"`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Use Cases</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Legacy Systems</strong> - Integrate with
                older systems that require XML format instead of JSON
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Monitoring Tools</strong> - Feed rates into
                monitoring and alerting systems that consume XML
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Data Aggregation</strong> - Collect rates
                for analysis or display on external dashboards
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Automated Trading</strong> - Monitor rates
                for automated trading strategies
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Update Frequency</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Float Rates:</strong> Updated every 30-60
                seconds based on market conditions
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Fixed Rates:</strong> Updated when new
                fixed rate periods begin (every 15 minutes)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Caching:</strong> Responses are cached for
                10 seconds to reduce server load
              </span>
            </li>
          </ul>
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4">
            <p className="text-yellow-200 text-xs md:text-sm">
              <strong>Note:</strong> Don&apos;t poll this endpoint more frequently than every
              10 seconds. Use the timestamp field to detect when rates have actually changed.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Parsing Example (Python)</h2>
        <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
          <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`import xml.etree.ElementTree as ET
import requests

response = requests.get('https://api.mintmove.io/v1/rates.xml')
root = ET.fromstring(response.content)

timestamp = root.find('timestamp').text
rate_type = root.find('rate_type').text

for pair in root.findall('pairs/pair'):
    from_curr = pair.find('from').text
    to_curr = pair.find('to').text
    rate = float(pair.find('rate').text)
    enabled = pair.find('enabled').text == 'true'
    
    if enabled:
        print(f'{from_curr}/{to_curr}: {rate}')`}</code>
        </pre>
      </section>
    </div>
  );
}

