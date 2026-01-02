export const metadata = {
  title: "Security & Best Practices - MintMove API Documentation",
  description: "Security guidelines and best practices for API integration",
};

export default function SecurityPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">Security & Best Practices</h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-300">
          Essential security guidelines for safe API integration
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">API Key Protection</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            Your API credentials are the keys to your account. Protect them at all costs:
          </p>
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Never expose API secrets in client-side code</strong> -
                JavaScript, mobile apps, or browser extensions can be reverse-engineered
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Use environment variables</strong> - Store
                credentials in <code className="bg-slate-900 px-2 py-1 rounded text-xs">.env</code> files or secure
                key management systems
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Never commit secrets to version control</strong> -
                Add <code className="bg-slate-900 px-2 py-1 rounded text-xs">.env</code> to <code className="bg-slate-900 px-2 py-1 rounded text-xs">.gitignore</code>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Use different keys per environment</strong> -
                Separate keys for development, staging, and production
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Rotate keys regularly</strong> - Regenerate
                API keys every 90 days or immediately if compromised
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">HTTPS Enforcement</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            All API communications must use HTTPS:
          </p>
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">HTTPS Only</strong> - All endpoints require
                HTTPS. HTTP requests are automatically rejected
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">TLS 1.2+ Required</strong> - Use modern TLS
                versions for secure connections
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Certificate Validation</strong> - Always
                validate SSL certificates (don&apos;t disable certificate verification)
              </span>
            </li>
          </ul>
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mt-4">
            <p className="text-red-200 text-xs md:text-sm">
              <strong>Warning:</strong> Never disable SSL certificate validation, even in
              development. This exposes you to man-in-the-middle attacks.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">IP Whitelisting</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            Restrict API key usage to specific IP addresses for enhanced security:
          </p>
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                Configure IP whitelist in Dashboard → API Management → Security Settings
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                Add your server&apos;s static IP addresses (both IPv4 and IPv6 if applicable)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                Requests from non-whitelisted IPs will be rejected with 403 Forbidden
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                Useful for server-to-server integrations but not for client-side applications
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Signature Validation</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            HMAC-SHA256 signatures prevent request tampering and replay attacks:
          </p>
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Always include timestamp</strong> - Timestamps
                prevent replay attacks (requests expire after 5 minutes)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Use correct sign string format</strong> -
                Method + Path + Body + Timestamp (in that exact order)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Validate server clock</strong> - Ensure your
                server&apos;s clock is synchronized with NTP to avoid timestamp errors
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Never reuse signatures</strong> - Generate
                a new signature for each request
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Timestamp Expiry</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            Request timestamps are validated to prevent replay attacks:
          </p>
          <ul className="space-y-2 text-slate-300">
            <li>• Timestamps must be within ±5 minutes of server time</li>
            <li>• Requests with expired timestamps are rejected</li>
            <li>• Use Unix timestamp in seconds (not milliseconds)</li>
            <li>• Ensure server clock is synchronized (use NTP)</li>
          </ul>
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4">
            <p className="text-yellow-200 text-xs md:text-sm">
              <strong>Tip:</strong> If you&apos;re getting timestamp errors, check your server&apos;s
              system time and timezone settings.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Key Rotation Policies</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            Regularly rotate your API keys to limit exposure:
          </p>
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Rotate every 90 days</strong> - Set a calendar
                reminder to regenerate keys quarterly
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Immediate rotation if compromised</strong> -
                If you suspect a key is leaked, revoke it immediately
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Gradual migration</strong> - Generate new key,
                update application, then revoke old key after verification
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Monitor key usage</strong> - Check dashboard
                regularly for unusual activity
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Webhook Verification (Future-Ready)</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            When implementing webhooks, always verify the signature:
          </p>
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                Webhook requests include an <code className="bg-slate-900 px-2 py-1 rounded text-xs">X-Webhook-Signature</code> header
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                Verify the signature using HMAC-SHA256 with your webhook secret
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                Reject requests with invalid signatures to prevent spoofing
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                Use HTTPS endpoints for webhook receivers
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Security Audit Recommendations</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Regular security audits</strong> - Review
                your integration code for security vulnerabilities
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Dependency scanning</strong> - Keep all
                dependencies up-to-date and scan for known vulnerabilities
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Access logging</strong> - Log all API
                requests for audit trails
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Monitor for anomalies</strong> - Set up
                alerts for unusual API usage patterns
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Penetration testing</strong> - Periodically
                test your integration for security weaknesses
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">OWASP Compliance</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            Follow OWASP security best practices:
          </p>
          <ul className="space-y-2 text-slate-300">
            <li>• <strong className="text-white">A01:2021 – Broken Access Control</strong> - Use proper authentication and authorization</li>
            <li>• <strong className="text-white">A02:2021 – Cryptographic Failures</strong> - Use HTTPS, proper encryption</li>
            <li>• <strong className="text-white">A03:2021 – Injection</strong> - Validate and sanitize all inputs</li>
            <li>• <strong className="text-white">A04:2021 – Insecure Design</strong> - Follow secure design principles</li>
            <li>• <strong className="text-white">A05:2021 – Security Misconfiguration</strong> - Secure default configurations</li>
            <li>• <strong className="text-white">A06:2021 – Vulnerable Components</strong> - Keep dependencies updated</li>
            <li>• <strong className="text-white">A07:2021 – Authentication Failures</strong> - Implement proper authentication</li>
            <li>• <strong className="text-white">A08:2021 – Data Integrity Failures</strong> - Verify data integrity</li>
            <li>• <strong className="text-white">A09:2021 – Logging Failures</strong> - Implement comprehensive logging</li>
            <li>• <strong className="text-white">A10:2021 – SSRF</strong> - Validate URLs and prevent SSRF attacks</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Additional Security Tips</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <ul className="space-y-3 text-sm md:text-base text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Validate all inputs</strong> - Never trust
                user input. Validate amounts, addresses, and all parameters
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Use rate limiting</strong> - Implement
                client-side rate limiting to avoid hitting API limits
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Implement request timeouts</strong> - Set
                reasonable timeouts to prevent hanging requests
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Sanitize error messages</strong> - Don&apos;t
                expose sensitive information in error messages to users
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">•</span>
              <span>
                <strong className="text-white">Use secure storage</strong> - Store API
                secrets in encrypted storage or secret management systems
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

