import BlogNavigation from "@/components/blog/BlogNavigation";
import BlogCard from "@/components/blog/BlogCard";
import { getBlogPostsByCategory, getBlogPostsByTag } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guides | MintMove Blog",
  description: "Educational guides and tutorials about cryptocurrency, blockchain, and trading",
};

interface GuidesPageProps {
  searchParams: {
    tag?: string;
  };
}

export default function GuidesPage({ searchParams }: GuidesPageProps) {
  const tag = searchParams.tag;

  // Get guides posts
  const guidesPosts = tag 
    ? getBlogPostsByTag(tag).filter(post => post.category === "guides")
    : getBlogPostsByCategory("guides");

  return (
    <>
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
          Guides
        </h1>
        {tag && (
          <p className="text-neutral-400 text-sm">
            Filtered by tag: <span className="text-blue-400">{tag}</span>
          </p>
        )}
      </div>

      {/* Navigation */}
      <BlogNavigation activeTab="guides" currentTag={tag} />

      {/* Guides Grid */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr">
          {guidesPosts.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
            />
          ))}
        </div>

        {guidesPosts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-neutral-400 text-lg">No guides found.</p>
          </div>
        )}
      </section>
    </>
  );
}

