import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Calendar, ArrowLeft, Tag, ExternalLink } from "lucide-react";
import { getBlogPostBySlug, getRelatedBlogPosts } from "@/lib/blog";
import BlogCard from "@/components/blog/BlogCard";
import ContentRenderer from "@/components/blog/ContentRenderer";
import type { Metadata } from "next";

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = getBlogPostBySlug(params.slug);
  
  if (!post) {
    return {
      title: "Post Not Found | MintMove Blog",
    };
  }

  return {
    title: `${post.title} | MintMove Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const categoryLabels: Record<string, string> = {
    guides: "Guide",
    news: "News",
    currencies: "Currency",
  };

  const categoryColors: Record<string, string> = {
    guides: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    news: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    currencies: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  };

  const relatedPosts = getRelatedBlogPosts(post.slug, 3);

  return (
    <>
      {/* Back Button */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Blog</span>
      </Link>

      {/* Article Header */}
      <article className="mb-16">
        {/* Category Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${categoryColors[post.category]}`}>
            {categoryLabels[post.category]}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
          {post.title}
        </h1>

        {/* Meta Information */}
        <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-neutral-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <time dateTime={post.publishedAt}>{formattedDate}</time>
          </div>
          {post.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4" />
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${tag}`}
                  className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Featured Image */}
        {post.coverImage && (
          <div className="relative w-full max-w-3xl mx-auto mb-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10 shadow-lg">
            <div className="relative aspect-video w-full">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 900px"
                quality={90}
                priority
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="glass-panel border border-white/5 rounded-xl p-8 md:p-12 shadow-xl animate-fade-in-up">
            <div className="text-neutral-300 leading-relaxed space-y-6">
              <p className="text-xl text-neutral-200 font-medium mb-6">
                {post.excerpt}
              </p>

              {/* Render formatted content with icons, tables, and animations */}
              <ContentRenderer content={post.content || ""} animated />
              
              {/* Source attribution if available */}
              {post.source && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-sm text-neutral-400 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    <span>Source: </span>
                    <a 
                      href={post.source} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      {post.source}
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="mt-16 pt-16 border-t border-white/10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">
            Related Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedPosts.map((relatedPost) => (
              <BlogCard
                key={relatedPost.id}
                post={relatedPost}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

