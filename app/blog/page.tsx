import BlogNavigation from "@/components/blog/BlogNavigation";
import BlogCard from "@/components/blog/BlogCard";
import { getAllBlogPosts, getBlogPostsByTag, getPopularBlogPosts, BlogPost } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | MintMove",
  description: "Latest cryptocurrency news, guides, and educational content from MintMove",
};

interface BlogPageProps {
  searchParams: {
    tag?: string;
  };
}

export default function BlogPage({ searchParams }: BlogPageProps) {
  const tag = searchParams.tag;

  // Get posts based on tag filter
  const allPosts = tag 
    ? getBlogPostsByTag(tag)
    : getAllBlogPosts();

  const featuredPosts = allPosts.filter(post => post.featured).slice(0, 3);
  const regularPosts = allPosts.filter(post => !post.featured);
  const popularPosts = getPopularBlogPosts(6);

  // Organize posts: featured first, then regular - uniform grid
  const displayPosts: BlogPost[] = [...featuredPosts, ...regularPosts].slice(0, 9);

  return (
    <>
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
          Blog
        </h1>
        {tag && (
          <p className="text-neutral-400 text-sm">
            Filtered by tag: <span className="text-blue-400">{tag}</span>
          </p>
        )}
      </div>

      {/* Navigation */}
      <BlogNavigation activeTab="recent" currentTag={tag} />

      {/* Main Blog Grid */}
      <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr">
          {displayPosts.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
            />
          ))}
        </div>

        {displayPosts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-neutral-400 text-lg">No posts found.</p>
          </div>
        )}
      </section>

      {/* Popular Guides Section */}
      {!tag && popularPosts.length > 0 && (
        <section className="mt-12 pt-12 border-t border-white/5">
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-6">
            Popular guides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {popularPosts.map((post) => (
              <BlogCard
                key={post.id}
                post={post}
                size="small"
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

