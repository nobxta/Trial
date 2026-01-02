export const metadata = {
  title: "Getting the API Key - MintMove API Documentation",
  description: "Step-by-step guide to generate and manage your API keys",
};

export default function GetApiKeyPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Getting the API Key</h1>
        <p className="text-base md:text-lg lg:text-xl text-neutral-400">
          Generate your API credentials to start integrating with MintMove
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Step-by-Step Guide</h2>
        <div className="space-y-6">
          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  Sign In or Register
                </h3>
                <p className="text-neutral-400">
                  If you don&apos;t have a MintMove account, visit{" "}
                  <a href="/" className="text-blue-400 hover:text-blue-300 underline">
                    mintmove.io
                  </a>{" "}
                  and create a new account. If you already have an account, sign
                  in with your credentials.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  Navigate to API Management
                </h3>
                <p className="text-neutral-400">
                  Once logged in, go to your Dashboard and click on{" "}
                  <strong className="text-white">API Management</strong> in the
                  navigation menu. This section allows you to manage all your API
                  credentials.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  Generate API Key
                </h3>
                <p className="text-neutral-400">
                  Click the <strong className="text-white">Generate API Key</strong>{" "}
                  button. You&apos;ll be prompted to give your API key a name (e.g.,
                  &quot;Production Server&quot; or &quot;Trading Bot&quot;). This helps you identify
                  different keys if you create multiple ones.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                  Save Your Credentials Securely
                </h3>
                <p className="text-neutral-400 mb-3">
                  After generation, you&apos;ll see two important values:
                </p>
                <ul className="list-disc list-inside space-y-2 text-neutral-400 ml-4">
                  <li>
                    <strong className="text-white">API Key</strong> - Your public
                    identifier (starts with <code className="bg-white/[0.02] px-2 py-1 rounded text-sm">mm_</code>)
                  </li>
                  <li>
                    <strong className="text-white">API Secret</strong> - Your private
                    key (starts with <code className="bg-white/[0.02] px-2 py-1 rounded text-sm">sk_</code>)
                  </li>
                </ul>
                <div className="mt-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-200 text-xs md:text-sm">
                    <strong>⚠️ Critical:</strong> The API Secret is only shown once
                    during generation. If you lose it, you&apos;ll need to generate a new
                    API key. Make sure to copy and store it securely immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Security Warnings</h2>
        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-200 mb-3">
              Never Expose Secrets on Frontend
            </h3>
            <p className="text-red-100 mb-3">
              Your API secret must never be included in client-side code (JavaScript,
              mobile apps, browser extensions). Anyone can view the source code and
              extract your secret, leading to unauthorized access to your account.
            </p>
            <p className="text-red-100">
              Always use API keys server-side only. If you need to make API calls
              from a frontend application, create a backend proxy that handles
              authentication securely.
            </p>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">
              Secure Storage Recommendations
            </h3>
            <ul className="space-y-2 text-neutral-400">
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">✓</span>
                <span>
                  Store API secrets in environment variables (e.g., <code className="bg-white/[0.02] px-2 py-1 rounded text-sm">.env</code> files)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">✓</span>
                <span>
                  Use secret management services (AWS Secrets Manager, HashiCorp Vault, etc.)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">✓</span>
                <span>
                  Never commit secrets to version control (add <code className="bg-white/[0.02] px-2 py-1 rounded text-sm">.env</code> to <code className="bg-white/[0.02] px-2 py-1 rounded text-sm">.gitignore</code>)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">✓</span>
                <span>
                  Use different API keys for development, staging, and production environments
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">✓</span>
                <span>
                  Rotate API keys periodically (every 90 days recommended)
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">API Key Management</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <p className="text-neutral-400 mb-4">
            In the API Management section, you can:
          </p>
          <ul className="space-y-2 text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>View all your active API keys and their creation dates</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>See the last usage timestamp for each key</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>Revoke API keys that are no longer needed</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>Set IP whitelist restrictions for enhanced security</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">•</span>
              <span>Monitor API usage and rate limit status</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Next Steps</h2>
        <div className="bg-gradient-to-r from-blue-600/20 to-blue-700/20 rounded-lg p-6 border border-white/5">
          <p className="text-neutral-400 mb-4">
            Now that you have your API key, you&apos;re ready to start making API calls:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-neutral-400">
            <li>Review the <a href="/docs/requests" className="text-blue-400 hover:text-blue-300 underline">Request Format</a> documentation</li>
            <li>Learn about <a href="/docs/authentication" className="text-blue-400 hover:text-blue-300 underline">signature generation</a> if you haven&apos;t already</li>
            <li>Try the <a href="/docs/api/available-currencies" className="text-blue-400 hover:text-blue-300 underline">Available Currencies</a> endpoint to get started</li>
            <li>Check out our <a href="/docs/libraries" className="text-blue-400 hover:text-blue-300 underline">official SDKs</a> for easier integration</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

