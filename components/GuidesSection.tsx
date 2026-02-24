"use client";

import Link from "next/link";
import Image from "next/image";
import type { BlogPost } from "@/lib/blog";

const FALLBACK_GRADIENTS = [
  "from-blue-600/50 via-indigo-600/40 to-violet-700/50",
  "from-amber-500/50 via-yellow-600/40 to-orange-600/50",
  "from-orange-500/50 via-amber-600/40 to-yellow-600/50",
  "from-violet-600/50 via-purple-600/40 to-fuchsia-600/50",
];

interface GuidesSectionProps {
  posts: BlogPost[];
}

export default function GuidesSection({ posts }: GuidesSectionProps) {
  if (posts.length === 0) {
    return (
      <section className="relative py-12 sm:py-16 md:py-20 px-4 bg-[#050505] border-t border-white/5 overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-8 sm:mb-10 text-left">
            Guides and tutorials
          </h2>
          <p className="text-neutral-400">No guides yet.</p>
          <Link
            href="/blog/guides"
            className="inline-block mt-4 rounded-lg border border-sky-500 text-sky-400 px-4 py-2 text-sm font-medium hover:bg-sky-500/10 transition-colors"
          >
            Go to guides
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-12 sm:py-16 md:py-20 px-4 bg-[#050505] border-t border-white/5 overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-8 sm:mb-10 text-left">
          Guides and tutorials
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {posts.map((post, i) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group relative block rounded-xl overflow-hidden border border-white/10 bg-[#0a0a12] min-h-[220px] sm:min-h-[260px]"
            >
              {/* Background: cover image or gradient */}
              {post.coverImage ? (
                <>
                  <Image
                    src={post.coverImage}
                    alt=""
                    fill
                    className="object-cover opacity-70 group-hover:scale-105 transition-all duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-[#0a0a12]/40 group-hover:bg-[#0a0a12]/20 transition-colors" aria-hidden />
                </>
              ) : (
                <>
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length]} opacity-70 transition-transform duration-300 group-hover:scale-105`}
                    aria-hidden
                  />
                  <div className="absolute inset-0 bg-[#0a0a12]/50" aria-hidden />
                </>
              )}

              {/* Bottom gradient + content */}
              <div className="absolute inset-0 flex items-end pointer-events-none">
                <div className="w-full p-4 sm:p-5 bg-gradient-to-t from-black/80 to-transparent group-hover:from-black/90 transition-colors duration-300">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1 line-clamp-2 group-hover:text-sky-200 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 line-clamp-2 group-hover:text-white/90 transition-colors">
                    {post.excerpt}
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-sky-950/0 group-hover:bg-sky-950/20 transition-colors duration-300 pointer-events-none" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
