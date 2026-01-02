export const metadata = {
  title: "Errors & Status Codes - MintMove API Documentation",
  description: "Complete guide to error handling and HTTP status codes",
};

export default function ErrorsPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Errors & Status Codes</h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-300">
          Complete guide to error handling and HTTP status codes
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Error Object Format</h2>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          All error responses follow a consistent format:
        </p>
        <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
          <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Optional additional error details
  }
}`}</code>
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">HTTP Status Codes</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 md:p-6 border border-red-500/20 overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-full inline-block">
            <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-4 text-red-400">Status Code</th>
                <th className="text-left py-2 px-4 text-red-400">Meaning</th>
                <th className="text-left py-2 px-4 text-red-400">Common Causes</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">200</td>
                <td className="py-2 px-2 md:px-4">Success</td>
                <td className="py-2 px-2 md:px-4">Request completed successfully</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">400</td>
                <td className="py-2 px-2 md:px-4">Bad Request</td>
                <td className="py-2 px-2 md:px-4">Invalid parameters, missing required fields</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">401</td>
                <td className="py-2 px-2 md:px-4">Unauthorized</td>
                <td className="py-2 px-2 md:px-4">Invalid or missing API key, invalid signature</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">403</td>
                <td className="py-2 px-2 md:px-4">Forbidden</td>
                <td className="py-2 px-2 md:px-4">API key lacks required permissions</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">404</td>
                <td className="py-2 px-2 md:px-4">Not Found</td>
                <td className="py-2 px-2 md:px-4">Invalid endpoint or resource not found</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">429</td>
                <td className="py-2 px-2 md:px-4">Too Many Requests</td>
                <td className="py-2 px-2 md:px-4">Rate limit exceeded</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">500</td>
                <td className="py-2 px-2 md:px-4">Internal Server Error</td>
                <td className="py-2 px-2 md:px-4">Server-side error, try again later</td>
              </tr>
              <tr>
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">503</td>
                <td className="py-2 px-2 md:px-4">Service Unavailable</td>
                <td className="py-2 px-2 md:px-4">Service temporarily unavailable, maintenance</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Common Error Codes</h2>
        <div className="space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">LIMIT_MIN</h3>
            <p className="text-slate-300 mb-3">
              The requested amount is below the minimum exchange limit for this currency pair.
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "LIMIT_MIN",
  "message": "Amount is below minimum limit",
  "min_amount": 0.01,
  "requested_amount": 0.005
}`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">LIMIT_MAX</h3>
            <p className="text-slate-300 mb-3">
              The requested amount exceeds the maximum exchange limit for this currency pair.
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "LIMIT_MAX",
  "message": "Amount exceeds maximum limit",
  "max_amount": 1000.0,
  "requested_amount": 1500.0
}`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">OFFLINE</h3>
            <p className="text-slate-300 mb-3">
              The requested currency pair is temporarily unavailable for exchange.
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "OFFLINE",
  "message": "Currency pair BTC/USDT is temporarily offline"
}`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">RESERVE</h3>
            <p className="text-slate-300 mb-3">
              Insufficient reserves to complete the exchange. The requested amount exceeds
              available liquidity.
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "RESERVE",
  "message": "Insufficient reserves for this exchange",
  "available_amount": 500.0,
  "requested_amount": 1000.0
}`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">MAINTENANCE</h3>
            <p className="text-slate-300 mb-3">
              The service is undergoing scheduled maintenance. Check status page for updates.
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "MAINTENANCE",
  "message": "Service is under maintenance",
  "estimated_resume": "2025-01-27T12:00:00Z"
}`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">INVALID_ADDRESS</h3>
            <p className="text-slate-300 mb-3">
              The provided destination address is invalid for the specified network.
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "INVALID_ADDRESS",
  "message": "Destination address is invalid for network ERC20"
}`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">RATE_EXPIRED</h3>
            <p className="text-slate-300 mb-3">
              The fixed rate has expired. Request a new rate before creating the order.
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "RATE_EXPIRED",
  "message": "Fixed rate has expired. Please request a new rate."
}`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">INVALID_SIGNATURE</h3>
            <p className="text-slate-300 mb-3">
              The request signature is invalid. Check your signature generation algorithm.
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "INVALID_SIGNATURE",
  "message": "Request signature is invalid"
}`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">TIMESTAMP_EXPIRED</h3>
            <p className="text-slate-300 mb-3">
              The request timestamp is too old or too far in the future. Ensure your
              server clock is synchronized.
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`{
  "error": true,
  "error_code": "TIMESTAMP_EXPIRED",
  "message": "Request timestamp is outside acceptable range"
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Best Practices for Error Handling</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Check error_code, not just HTTP status</strong> -
                The error_code provides specific information about what went wrong
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Handle rate limits gracefully</strong> -
                Implement exponential backoff when receiving 429 responses
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Validate before sending</strong> -
                Check amounts against min/max limits before creating orders
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Log errors for debugging</strong> -
                Include error_code and message in your error logs
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Provide user-friendly messages</strong> -
                Translate technical error codes into user-friendly messages
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Retry transient errors</strong> -
                Retry 500 and 503 errors with exponential backoff
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Error Handling Example</h2>
        <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
          <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`async function handleApiError(response) {
  if (!response.ok) {
    const error = await response.json();
    
    switch (error.error_code) {
      case 'LIMIT_MIN':
      case 'LIMIT_MAX':
        // Show user-friendly message with limits
        return \`Amount must be between \${error.min_amount} and \${error.max_amount}\`;
      
      case 'RATE_EXPIRED':
        // Request a new rate
        return 'Rate expired. Please try again.';
      
      case 'INVALID_ADDRESS':
        // Ask user to check address
        return 'Invalid destination address. Please check and try again.';
      
      case 'RESERVE':
        // Suggest lower amount
        return \`Insufficient liquidity. Maximum available: \${error.available_amount}\`;
      
      case 'OFFLINE':
      case 'MAINTENANCE':
        // Show maintenance message
        return 'Service temporarily unavailable. Please try again later.';
      
      case 'RATE_LIMIT_EXCEEDED':
        // Implement backoff
        const retryAfter = error.retry_after || 60;
        await sleep(retryAfter * 1000);
        return null; // Retry
      
      default:
        return error.message || 'An unexpected error occurred';
    }
  }
  
  return null;
}`}</code>
        </pre>
      </section>
    </div>
  );
}

