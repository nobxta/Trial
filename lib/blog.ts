import blogPostsData from '@/data/blog-posts.json';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: 'guides' | 'news' | 'currencies';
  tags: string[];
  coverImage: string;
  publishedAt: string;
  featured?: boolean;
  popular?: boolean;
  source?: string;
}

export type BlogCategory = 'guides' | 'news' | 'currencies' | 'all';
export type BlogTab = 'recent' | 'guides' | 'news' | 'about-cryptocurrencies' | 'exchange-tutorials';

// Convert dates and ensure type safety
const blogPosts: BlogPost[] = blogPostsData.map(post => ({
  ...post,
  category: post.category as BlogPost['category'],
}));

/**
 * Get all blog posts
 */
export function getAllBlogPosts(): BlogPost[] {
  return blogPosts.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

/**
 * Get blog post by slug
 */
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}

/**
 * Get blog posts by category
 */
export function getBlogPostsByCategory(category: BlogCategory): BlogPost[] {
  if (category === 'all') {
    return getAllBlogPosts();
  }
  return blogPosts
    .filter(post => post.category === category)
    .sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
}

/**
 * Get blog posts by tag
 */
export function getBlogPostsByTag(tag: string): BlogPost[] {
  return blogPosts
    .filter(post => post.tags.includes(tag.toLowerCase()))
    .sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
}

/**
 * Get featured blog posts
 */
export function getFeaturedBlogPosts(limit?: number): BlogPost[] {
  const featured = blogPosts
    .filter(post => post.featured)
    .sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  
  return limit ? featured.slice(0, limit) : featured;
}

/**
 * Get popular blog posts (for Popular Guides section)
 */
export function getPopularBlogPosts(limit?: number): BlogPost[] {
  const popular = blogPosts
    .filter(post => post.popular)
    .sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  
  return limit ? popular.slice(0, limit) : popular;
}

/**
 * Get all unique tags from all blog posts
 */
export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  blogPosts.forEach(post => {
    post.tags.forEach(tag => tagSet.add(tag.toLowerCase()));
  });
  return Array.from(tagSet).sort();
}

/**
 * Map blog tab to category
 */
export function getCategoryFromTab(tab: BlogTab): BlogCategory {
  switch (tab) {
    case 'guides':
      return 'guides';
    case 'news':
      return 'news';
    case 'about-cryptocurrencies':
      return 'currencies';
    case 'exchange-tutorials':
      return 'guides';
    case 'recent':
    default:
      return 'all';
  }
}

/**
 * Get related blog posts (same category, excluding current post)
 */
export function getRelatedBlogPosts(currentSlug: string, limit: number = 3): BlogPost[] {
  const currentPost = getBlogPostBySlug(currentSlug);
  if (!currentPost) return [];
  
  return blogPosts
    .filter(post => 
      post.slug !== currentSlug && 
      post.category === currentPost.category
    )
    .sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, limit);
}

