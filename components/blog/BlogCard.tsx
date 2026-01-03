"use client";

import Link from "next/link";
import Image from "next/image";
import { BlogPost } from "@/lib/blog";

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
  size?: "default" | "small";
}

export default function BlogCard({ post, size = "default" }: BlogCardProps) {
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link 
      href={`/blog/${post.slug}`}
      className="group relative block h-full"
    >
      <article className="h-full flex flex-col glass-panel border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors duration-200">
        {/* Image Container */}
        <div className="relative w-full aspect-video overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10">
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes={size === "small" ? "(max-width: 768px) 100vw, 33vw" : "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"}
              quality={85}
              unoptimized
            />
          ) : (
            <>
              {/* Placeholder gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-cyan-600/20" />
              {/* Decorative crypto-style pattern overlay */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-400 rounded-full blur-3xl"></div>
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-5">
          <h3 className={`font-semibold text-white mb-2 line-clamp-2 ${
            size === "small" ? "text-base" : "text-lg"
          }`}>
            {post.title}
          </h3>
          
          <p className={`text-neutral-400 mb-3 line-clamp-2 flex-1 ${
            size === "small" ? "text-sm" : "text-sm"
          }`}>
            {post.excerpt}
          </p>

          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-auto">
            <time dateTime={post.publishedAt}>{formattedDate}</time>
          </div>
        </div>
      </article>
    </Link>
  );
}

