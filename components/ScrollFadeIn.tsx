"use client";

import { useEffect } from "react";

/**
 * Client component that handles scroll fade-in animations
 * Uses IntersectionObserver to add 'visible' class to elements with 'scroll-fade-in' class
 */
export default function ScrollFadeIn() {
  useEffect(() => {
    const elements = document.querySelectorAll('.scroll-fade-in');
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}

