import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-white mb-4">Post Not Found</h1>
      <p className="text-neutral-400 mb-8">
        The blog post you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Blog</span>
      </Link>
    </div>
  );
}

