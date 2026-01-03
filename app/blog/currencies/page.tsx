import BlogNavigation from "@/components/blog/BlogNavigation";
import BlogCard from "@/components/blog/BlogCard";
import { getBlogPostsByCategory, getBlogPostsByTag } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Currencies | MintMove Blog",
  description: "In-depth articles about cryptocurrencies, blockchain networks, and digital assets",
};

interface CurrenciesPageProps {
  searchParams: {
    tag?: string;
  };
}

export default function CurrenciesPage({ searchParams }: CurrenciesPageProps) {
  const tag = searchParams.tag;

  // Get currency posts
  const currencyPosts = tag 
    ? getBlogPostsByTag(tag).filter(post => post.category === "currencies")
    : getBlogPostsByCategory("currencies");

  return (
    <>
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
          About cryptocurrencies
        </h1>
        {tag && (
          <p className="text-neutral-400 text-sm">
            Filtered by tag: <span className="text-blue-400">{tag}</span>
          </p>
        )}
      </div>

      {/* Navigation */}
      <BlogNavigation activeTab="about-cryptocurrencies" currentTag={tag} />

      {/* Currencies Grid */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr">
          {currencyPosts.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
            />
          ))}
        </div>

        {currencyPosts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-neutral-400 text-lg">No currency articles found.</p>
          </div>
        )}
      </section>
    </>
  );
}

