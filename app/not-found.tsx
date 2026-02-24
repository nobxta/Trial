import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Home, Search, HelpCircle, LogIn } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] selection:bg-blue-500/30 selection:text-blue-200 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center px-4 pt-24 pb-12">
        <div className="text-center max-w-lg mx-auto">
          {/* 404 number */}
          <div className="text-8xl sm:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500/80 via-cyan-500/80 to-blue-500/80 mb-2">
            404
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Page not available
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base mb-10">
            The link, page, or order you’re looking for doesn’t exist or was removed. 
            Check the URL or use the options below.
          </p>
          {/* Actions */}
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <Link
              href="/track-order"
              className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg border border-white/10 transition-colors"
            >
              <Search className="w-4 h-4" />
              Track order
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg border border-white/10 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Support
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 px-5 py-3 text-blue-400 hover:text-blue-300 font-medium rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </Link>
          </div>
          <p className="mt-8 text-xs text-neutral-500">
            Wrong URL? Wrong order ID? We’ve got you — use Track order or contact Support.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
