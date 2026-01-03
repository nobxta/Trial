import BlogNavigation from "@/components/blog/BlogNavigation";
import BlogCard from "@/components/blog/BlogCard";
import { getBlogPostsByCategory, getBlogPostsByTag } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News | MintMove Blog",
  description: "Latest cryptocurrency news, market updates, and industry developments",
};

interface NewsPageProps {
  searchParams: {
    tag?: string;
  };
}

export default function NewsPage({ searchParams }: NewsPageProps) {
  const tag = searchParams.tag;

  // Get news posts (sorted by date, newest first)
  const newsPosts = tag 
    ? getBlogPostsByTag(tag).filter(post => post.category === "news")
    : getBlogPostsByCategory("news");

  return (
    <>
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
          News
        </h1>
        {tag && (
          <p className="text-neutral-400 text-sm">
            Filtered by tag: <span className="text-blue-400">{tag}</span>
          </p>
        )}
      </div>

      {/* Navigation */}
      <BlogNavigation activeTab="news" currentTag={tag} />

      {/* News Grid */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr">
          {newsPosts.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
            />
          ))}
        </div>

        {newsPosts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-neutral-400 text-lg">No news articles found.</p>
          </div>
        )}
      </section>
    </>
  );
}

