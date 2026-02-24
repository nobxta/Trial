"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog";

const FALLBACK_GRADIENTS = [
  "from-amber-500/40 via-orange-600/30 to-yellow-700/40",
  "from-cyan-500/40 via-teal-600/30 to-blue-700/40",
  "from-green-500/40 via-emerald-600/30 to-teal-700/40",
  "from-violet-500/40 via-purple-600/30 to-fuchsia-700/40",
  "from-rose-500/40 via-pink-600/30 to-red-700/40",
];

interface NewsSectionProps {
  posts: BlogPost[];
}

export default function NewsSection({ posts }: NewsSectionProps) {
  const [index, setIndex] = useState(0);
  const total = Math.max(1, posts.length);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % total);
  }, [total]);

  useEffect(() => {
    if (posts.length <= 1) return;
    const t = setInterval(goNext, 6000);
    return () => clearInterval(t);
  }, [goNext, posts.length]);

  if (posts.length === 0) {
    return (
      <section className="relative py-12 sm:py-16 md:py-20 px-4 bg-[#050505] border-t border-white/5 overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-8 sm:mb-10 text-left">
            News
          </h2>
          <p className="text-neutral-400">No news posts yet.</p>
          <Link
            href="/blog"
            className="inline-block mt-4 rounded-lg border border-sky-500 text-sky-400 px-4 py-2 text-sm font-medium hover:bg-sky-500/10 transition-colors"
          >
            Go to blog
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-12 sm:py-16 md:py-20 px-4 bg-[#050505] border-t border-white/5 overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-8 sm:mb-10 text-left">
          News
        </h2>

        <div className="relative">
          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {posts.map((post, i) => (
                <div
                  key={post.id}
                  className="w-full flex-shrink-0 rounded-2xl overflow-hidden"
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="block relative min-h-[280px] sm:min-h-[320px] p-6 sm:p-8 bg-[#0a0a12] border border-white/10 rounded-2xl group"
                  >
                    {/* Background: cover image or gradient */}
                    {post.coverImage ? (
                      <>
                        <Image
                          src={post.coverImage}
                          alt=""
                          fill
                          className="object-cover rounded-2xl opacity-50 group-hover:opacity-60 transition-opacity"
                          sizes="(max-width: 1024px) 100vw, 1152px"
                          unoptimized
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/90 via-black/50 to-black/30" aria-hidden />
                      </>
                    ) : (
                      <>
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length]} opacity-60 rounded-2xl`}
                          aria-hidden
                        />
                        <div className="absolute inset-0 rounded-2xl bg-[#0a0a12]/70" aria-hidden />
                      </>
                    )}

                    <div className="relative z-10 flex flex-col h-full min-h-[240px] sm:min-h-[280px] justify-end">
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 line-clamp-2 group-hover:text-sky-200 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-white/80 line-clamp-2 mb-4">
                        {post.excerpt}
                      </p>
                      <span className="inline-flex items-center justify-center w-24 h-10 rounded-lg bg-sky-500 text-white text-sm font-medium group-hover:bg-sky-400 transition-colors">
                        Read
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Carousel controls */}
          <div className="flex items-center justify-between mt-6 gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goPrev}
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                aria-label="Previous news"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-1.5">
                {posts.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${i === index ? "w-8 bg-sky-500" : "w-2 bg-white/30"
                      }`}
                    aria-hidden
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={goNext}
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                aria-label="Next news"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <Link
              href="/blog/news"
              className="rounded-lg border border-sky-500 text-sky-400 px-4 py-2 text-sm font-medium hover:bg-sky-500/10 transition-colors"
            >
              All news
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
