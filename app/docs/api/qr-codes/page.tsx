export const metadata = {
  title: "QR Code Images - MintMove API Documentation",
  description: "Generate QR codes for payment addresses",
};

export default function QRCodesPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">QR Code Images</h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-300">
          Generate QR codes for easy mobile payments
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
                /v1/order/{`{order_id}`}/qr
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
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">format</td>
                <td className="py-2 px-2 md:px-4">No</td>
                <td className="py-2 px-2 md:px-4">Image format: "png" (default), "svg", or "base64"</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">size</td>
                <td className="py-2 px-2 md:px-4">No</td>
                <td className="py-2 px-2 md:px-4">Image size in pixels (default: 256, max: 1024)</td>
              </tr>
              <tr>
                <td className="py-2 px-2 md:px-4 font-mono text-white text-xs md:text-sm break-all">include_amount</td>
                <td className="py-2 px-2 md:px-4">No</td>
                <td className="py-2 px-2 md:px-4">Include amount in QR code: "true" (default) or "false"</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">With Amount vs Address Only</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">With Amount (Default)</h3>
            <p className="text-slate-300 mb-3">
              QR code contains the payment URI with embedded amount:
            </p>
            <code className="block p-3 bg-slate-900 rounded text-red-300 text-sm">
              bnb:0x9876...?amount=1.202887
            </code>
            <p className="text-slate-300 text-sm mt-3">
              <strong>Benefits:</strong> User's wallet automatically fills in the
              amount, reducing errors
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Address Only</h3>
            <p className="text-slate-300 mb-3">
              QR code contains only the address:
            </p>
            <code className="block p-3 bg-slate-900 rounded text-red-300 text-sm">
              0x9876543210987654321098765432109876543210
            </code>
            <p className="text-slate-300 text-sm mt-3">
              <strong>Use case:</strong> When user wants to manually enter the amount
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Format Options</h2>
        <div className="space-y-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">PNG (Default)</h3>
            <p className="text-slate-300 mb-3">
              Returns a PNG image that can be directly displayed or downloaded:
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`GET /v1/order/MM1234567890/qr?format=png&size=512

Response: Binary PNG image
Content-Type: image/png`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">SVG</h3>
            <p className="text-slate-300 mb-3">
              Returns a scalable vector graphic that can be resized without quality loss:
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`GET /v1/order/MM1234567890/qr?format=svg

Response: SVG XML
Content-Type: image/svg+xml`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Base64</h3>
            <p className="text-slate-300 mb-3">
              Returns a JSON response with base64-encoded image data:
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`GET /v1/order/MM1234567890/qr?format=base64

Response: {
  "success": true,
  "data": {
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "format": "png"
  }
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Request Examples</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Basic PNG QR Code</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`curl -X GET "https://api.mintmove.io/v1/order/MM1234567890/qr" \\
  -H "Accept: image/png" \\
  --output qr-code.png`}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Large SVG QR Code</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`curl -X GET "https://api.mintmove.io/v1/order/MM1234567890/qr?format=svg&size=512" \\
  -H "Accept: image/svg+xml"`}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Base64 for Embedding</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`curl -X GET "https://api.mintmove.io/v1/order/MM1234567890/qr?format=base64" \\
  -H "Content-Type: application/json"`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Display Usage Examples</h2>
        <div className="space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">HTML Image Tag</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`<img 
  src="https://api.mintmove.io/v1/order/MM1234567890/qr?size=256" 
  alt="Payment QR Code"
/>`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">React Component</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`function QRCodeDisplay({ orderId }) {
  const qrUrl = \`https://api.mintmove.io/v1/order/\${orderId}/qr?size=256\`;
  
  return (
    <div>
      <img src={qrUrl} alt="Scan to pay" />
      <p>Scan with your wallet app to pay</p>
    </div>
  );
}`}</code>
            </pre>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Base64 Data URI</h3>
            <pre className="bg-slate-900 rounded-lg p-3 md:p-4 overflow-x-auto -mx-3 md:mx-0 border border-red-500/20">
              <code className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words">{`// Fetch base64 QR code
const response = await fetch(
  'https://api.mintmove.io/v1/order/MM1234567890/qr?format=base64'
);
const data = await response.json();

// Use in img tag
<img src={data.data.qr_code} alt="QR Code" />`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Error Correction Levels</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-red-500/20">
          <p className="text-slate-300 mb-4">
            QR codes use automatic error correction levels based on the data size:
          </p>
          <ul className="space-y-2 text-slate-300">
            <li>• <strong className="text-white">Level L (Low):</strong> ~7% error correction</li>
            <li>• <strong className="text-white">Level M (Medium):</strong> ~15% error correction (default)</li>
            <li>• <strong className="text-white">Level Q (Quartile):</strong> ~25% error correction</li>
            <li>• <strong className="text-white">Level H (High):</strong> ~30% error correction</li>
          </ul>
          <p className="text-slate-300 text-sm mt-4">
            Higher error correction allows the QR code to be scanned even if partially
            damaged or obscured, but increases the QR code size.
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
                Use PNG format for web display (good balance of quality and file size)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                Use SVG format when you need to scale the QR code to different sizes
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                Include amount in QR code (default) to reduce user errors
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                Display QR code at least 256x256 pixels for easy scanning
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✓</span>
              <span>
                Provide a fallback text address in case QR scanning fails
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

