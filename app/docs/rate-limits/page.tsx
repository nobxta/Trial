export const metadata = {
  title: "Request Limits - MintMove API Documentation",
  description: "Understand rate limiting, weight system, and how to handle limits",
};

export default function RateLimitsPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Request Limits</h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-300">
          Learn about rate limiting and how to manage API usage
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Weight System</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          MintMove API uses a weight-based rate limiting system. Each endpoint
          has an associated weight, and you have a limited number of weight units
          available per time period.
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <div className="space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-3">Rate Limit</h3>
              <p className="text-xl md:text-2xl font-bold text-red-400 mb-2">250 units per minute</p>
              <p className="text-slate-300 text-xs md:text-sm">
                Your weight allowance resets every 60 seconds
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Endpoint Weights</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 md:p-6 border border-red-500/20 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-2 md:px-4 text-red-400">Endpoint</th>
                  <th className="text-left py-2 px-2 md:px-4 text-red-400 whitespace-nowrap">Method</th>
                  <th className="text-left py-2 px-2 md:px-4 text-red-400 whitespace-nowrap">Weight</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-2 md:px-4 font-mono text-xs md:text-sm break-all">/v1/order/create</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">POST</td>
                  <td className="py-2 px-2 md:px-4 font-bold text-yellow-400 whitespace-nowrap">50 units</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-2 md:px-4 font-mono text-xs md:text-sm break-all">/v1/rate</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">GET</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">1 unit</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-2 md:px-4 font-mono text-xs md:text-sm break-all">/v1/currencies</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">GET</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">1 unit</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-2 md:px-4 font-mono text-xs md:text-sm break-all">/v1/order/{`{id}`}</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">GET</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">1 unit</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-2 md:px-4 font-mono text-xs md:text-sm break-all">/v1/order/{`{id}`}/emergency</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">POST</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">1 unit</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 md:px-4 font-mono text-xs md:text-sm break-all">/v1/order/{`{id}`}/qr</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">GET</td>
                  <td className="py-2 px-2 md:px-4 whitespace-nowrap">1 unit</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 md:p-4 mt-4">
          <p className="text-yellow-200 text-xs md:text-sm">
            <strong>Note:</strong> Creating orders consumes significantly more
            weight (50 units) due to the computational resources required for
            order processing and address generation.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Rate Limit Headers</h2>
        <p className="text-sm md:text-base text-slate-300">
          Every API response includes headers that show your current rate limit status:
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 md:p-6 border border-red-500/20 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-2 md:px-4 text-red-400">Header</th>
                  <th className="text-left py-2 px-2 md:px-4 text-red-400">Description</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">X-RateLimit-Limit</td>
                  <td className="py-2 px-2 md:px-4">Total weight units per minute (250)</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">X-RateLimit-Remaining</td>
                  <td className="py-2 px-2 md:px-4">Remaining weight units in current window</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">X-RateLimit-Reset</td>
                  <td className="py-2 px-2 md:px-4">Unix timestamp when the limit resets</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">HTTP 429 Response</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          When you exceed the rate limit, the API returns a <code className="bg-slate-900 px-2 py-1 rounded text-xs md:text-sm">429 Too Many Requests</code> status code.
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3">Error Response</h3>
          <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto border border-red-500/20 -mx-3 md:mx-0">
            <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Please try again later.",
  "retry_after": 45
}`}</code>
          </pre>
          <p className="text-slate-300 mt-4 text-xs md:text-sm">
            The <code className="bg-slate-900 px-2 py-1 rounded text-xs">retry_after</code> field
            indicates how many seconds you should wait before making another request.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Burst Protection</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          In addition to the per-minute limit, burst protection prevents sudden
          spikes in API usage. This ensures fair resource allocation and system
          stability.
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Burst Limit:</strong> Maximum 10
                requests per second, regardless of weight
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Sliding Window:</strong> Limits are
                enforced using a sliding window algorithm
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Automatic Recovery:</strong> Limits
                reset automatically, no manual intervention needed
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Temporary Bans</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          Repeatedly exceeding rate limits may result in temporary IP bans:
        </p>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 md:p-6">
          <ul className="space-y-3 text-sm md:text-base text-red-100">
            <li>
              <strong>First violation:</strong> Warning, no ban
            </li>
            <li>
              <strong>Multiple violations:</strong> 5-minute ban
            </li>
            <li>
              <strong>Persistent violations:</strong> 1-hour ban
            </li>
            <li>
              <strong>Severe abuse:</strong> 24-hour ban or permanent restriction
            </li>
          </ul>
          <p className="text-red-200 text-xs md:text-sm mt-4">
            To avoid bans, implement proper rate limit handling in your application.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Best Practices</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Monitor Rate Limit Headers</strong> -
                Check <code className="bg-slate-900 px-2 py-1 rounded text-xs">X-RateLimit-Remaining</code> before
                making requests
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Implement Exponential Backoff</strong> -
                When you receive a 429 response, wait with exponential backoff before
                retrying
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Cache Responses</strong> - Cache
                frequently accessed data (like exchange rates) to reduce API calls
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Batch Operations</strong> - When
                possible, batch multiple operations to reduce request count
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Use Webhooks</strong> - Subscribe to
                webhooks instead of polling for order status updates
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Exponential Backoff Example</h2>
        <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto border border-red-500/20 -mx-3 md:mx-0">
          <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
      const backoffTime = Math.min(
        retryAfter * 1000 * Math.pow(2, attempt),
        60000 // Max 60 seconds
      );
      
      console.log(\`Rate limited. Waiting \${backoffTime}ms before retry...\`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      continue;
    }
    
    if (!response.ok) {
      throw new Error(\`Request failed: \${response.status}\`);
    }
    
    return response.json();
  }
  
  throw new Error('Max retries exceeded');
}`}</code>
        </pre>
      </section>
    </div>
  );
}

