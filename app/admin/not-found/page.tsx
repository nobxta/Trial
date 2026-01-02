import Link from 'next/link';
import Image from 'next/image';

export default function AdminNotFoundPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <Image
            src="/logo/logo.png"
            alt="MintMove"
            width={120}
            height={32}
            className="h-8 w-auto mx-auto mb-8"
          />
          <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-4">
            404
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Page Not Available</h1>
          <p className="text-neutral-400 mb-8">
            This page is only accessible to administrators. If you believe this is an error, please contact support.
          </p>
        </div>
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            Go to Homepage
          </Link>
          <div>
            <Link
              href="/sign-in"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Sign in as user
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

