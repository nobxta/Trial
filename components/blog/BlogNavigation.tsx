"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { BlogTab, getAllTags } from "@/lib/blog";

interface BlogNavigationProps {
  activeTab?: BlogTab;
  currentTag?: string;
}

const tabs: { id: BlogTab; label: string; href: string }[] = [
  { id: "recent", label: "Recent", href: "/blog" },
  { id: "guides", label: "Guides", href: "/blog/guides" },
  { id: "news", label: "News", href: "/blog/news" },
  { id: "about-cryptocurrencies", label: "About cryptocurrencies", href: "/blog/currencies" },
  { id: "exchange-tutorials", label: "Exchange tutorials", href: "/blog/guides?filter=tutorials" },
];

export default function BlogNavigation({ activeTab, currentTag }: BlogNavigationProps) {
  const pathname = usePathname();
  const [tagsOpen, setTagsOpen] = useState(false);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);
  const allTags = getAllTags();

  // Determine active tab from pathname
  const getActiveTabFromPath = (): BlogTab => {
    if (pathname === "/blog/guides") return "guides";
    if (pathname === "/blog/news") return "news";
    if (pathname === "/blog/currencies") return "about-cryptocurrencies";
    return "recent";
  };

  const currentActiveTab = activeTab || getActiveTabFromPath();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setTagsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTagClick = () => {
    setTagsOpen(false);
  };

  const createTagUrl = (tag: string) => {
    const params = new URLSearchParams();
    if (currentTag === tag) {
      // Remove tag if already selected
      return pathname;
    } else {
      params.set("tag", tag);
      return `${pathname}?${params.toString()}`;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const isActive = currentActiveTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-neutral-400 hover:text-neutral-300"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tags Dropdown */}
      <div className="relative" ref={tagsDropdownRef}>
        <button
          onClick={() => setTagsOpen(!tagsOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-neutral-400 hover:text-neutral-300 transition-colors duration-150"
        >
          <span>Tags</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${tagsOpen ? "rotate-180" : ""}`} />
        </button>

        {tagsOpen && (
          <div className="absolute right-0 top-full mt-2 w-44 glass-panel border border-white/10 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto custom-scrollbar">
            <div className="p-1.5">
              {allTags.map((tag) => {
                const isSelected = currentTag === tag;
                return (
                  <Link
                    key={tag}
                    href={createTagUrl(tag)}
                    onClick={handleTagClick}
                    className={`block px-2.5 py-1.5 rounded text-sm transition-colors ${
                      isSelected
                        ? "bg-white/10 text-white"
                        : "text-neutral-400 hover:text-neutral-300 hover:bg-white/5"
                    }`}
                  >
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

