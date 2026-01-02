"use client";

import { useEffect, useState } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleDelay: number;
}

export default function BackgroundElements() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const starArray: Star[] = [];
    for (let i = 0; i < 80; i++) {
      starArray.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 60,
        size: 0.5 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.7,
        twinkleDelay: Math.random() * 3,
      });
    }
    setStars(starArray);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="star absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.twinkleDelay}s`,
            boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.8)`,
          }}
        />
      ))}

      {/* Mountains/Hills */}
      <svg
        className="absolute bottom-0 w-full h-2/5 opacity-30"
        viewBox="0 0 1200 500"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="mountainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4c1d95" />
            <stop offset="50%" stopColor="#5b21b6" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        <path
          d="M0,500 L150,350 L300,400 L450,250 L600,350 L750,200 L900,300 L1050,250 L1200,320 L1200,500 Z"
          fill="url(#mountainGradient)"
        />
        <path
          d="M0,500 L100,420 L250,450 L400,380 L550,420 L700,360 L850,400 L1000,380 L1200,420 L1200,500 Z"
          fill="#5b21b6"
          opacity="0.6"
        />
      </svg>

      {/* Large Christmas Tree - Left */}
      <div className="absolute bottom-0 left-[5%] w-40 h-52 opacity-40 hidden md:block">
        <svg viewBox="0 0 120 180" className="w-full h-full">
          <defs>
            <linearGradient id="treeGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          {/* Tree layers */}
          <path
            d="M60,10 L40,70 L45,65 L60,45 L75,65 L80,70 Z"
            fill="url(#treeGradient1)"
            opacity="0.8"
          />
          <path
            d="M60,45 L35,110 L42,103 L60,80 L78,103 L85,110 Z"
            fill="url(#treeGradient1)"
            opacity="0.8"
          />
          <path
            d="M60,80 L30,150 L60,180 L90,150 Z"
            fill="url(#treeGradient1)"
            opacity="0.8"
          />
          {/* Decorations - Orange lights */}
          <circle cx="50" cy="50" r="2.5" fill="#f97316" opacity="0.9" />
          <circle cx="70" cy="60" r="2.5" fill="#f97316" opacity="0.9" />
          <circle cx="45" cy="75" r="2.5" fill="#f97316" opacity="0.9" />
          <circle cx="75" cy="85" r="2.5" fill="#f97316" opacity="0.9" />
          <circle cx="55" cy="95" r="2.5" fill="#f97316" opacity="0.9" />
          <circle cx="65" cy="110" r="2.5" fill="#f97316" opacity="0.9" />
          {/* White garland */}
          <path
            d="M50,50 Q60,55 70,60 T90,70"
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
          />
          <path
            d="M45,75 Q55,85 65,95 T85,115"
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Large Christmas Tree - Right */}
      <div className="absolute bottom-0 right-[8%] w-44 h-56 opacity-35 hidden lg:block">
        <svg viewBox="0 0 120 180" className="w-full h-full">
          <defs>
            <linearGradient id="treeGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <path
            d="M60,8 L35,72 L42,65 L60,42 L78,65 L85,72 Z"
            fill="url(#treeGradient2)"
            opacity="0.8"
          />
          <path
            d="M60,42 L30,112 L40,102 L60,75 L80,102 L90,112 Z"
            fill="url(#treeGradient2)"
            opacity="0.8"
          />
          <path
            d="M60,75 L25,150 L60,180 L95,150 Z"
            fill="url(#treeGradient2)"
            opacity="0.8"
          />
          {/* Decorations */}
          <circle cx="48" cy="48" r="2.5" fill="#f97316" opacity="0.9" />
          <circle cx="72" cy="58" r="2.5" fill="#f97316" opacity="0.9" />
          <circle cx="42" cy="72" r="2.5" fill="#f97316" opacity="0.9" />
          <circle cx="78" cy="88" r="2.5" fill="#f97316" opacity="0.9" />
          <circle cx="52" cy="95" r="2.5" fill="#f97316" opacity="0.9" />
          <circle cx="68" cy="108" r="2.5" fill="#f97316" opacity="0.9" />
          <path
            d="M48,48 Q60,52 72,58 T96,68"
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
          />
          <path
            d="M42,72 Q55,82 68,92 T92,112"
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Floating Tree - Upper Right */}
      <div className="absolute top-[15%] right-[12%] w-32 h-40 opacity-30 hidden xl:block">
        <svg viewBox="0 0 100 130" className="w-full h-full">
          <defs>
            <radialGradient id="planetGradient1" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#4c1d95" />
            </radialGradient>
          </defs>
          {/* Floating planet/island */}
          <ellipse cx="50" cy="120" rx="45" ry="15" fill="url(#planetGradient1)" opacity="0.7" />
          {/* Tree on planet */}
          <path
            d="M50,20 L35,75 L40,70 L50,55 L60,70 L65,75 Z M50,55 L35,105 L40,100 L50,85 L60,100 L65,105 Z M50,85 L35,130 L50,140 L65,130 Z"
            fill="#047857"
            opacity="0.7"
          />
          <circle cx="42" cy="65" r="2" fill="#f97316" opacity="0.9" />
          <circle cx="58" cy="75" r="2" fill="#f97316" opacity="0.9" />
          <circle cx="45" cy="90" r="2" fill="#f97316" opacity="0.9" />
        </svg>
      </div>

      {/* Small Tree - Mid Left */}
      <div className="absolute bottom-0 left-[15%] w-24 h-32 opacity-30 hidden sm:block">
        <svg viewBox="0 0 80 120" className="w-full h-full">
          <path
            d="M40,10 L25,60 L30,55 L40,40 L50,55 L55,60 Z M40,40 L25,90 L30,85 L40,70 L50,85 L55,90 Z M40,70 L25,120 L40,130 L55,120 Z"
            fill="#047857"
            opacity="0.7"
          />
          <circle cx="35" cy="50" r="2" fill="#f97316" opacity="0.8" />
          <circle cx="45" cy="65" r="2" fill="#f97316" opacity="0.8" />
        </svg>
      </div>

      {/* Glowing Crystals - Multiple */}
      <div className="absolute bottom-24 left-[20%] w-20 h-24 opacity-40 hidden md:block">
        <svg viewBox="0 0 100 120" className="w-full h-full">
          <defs>
            <linearGradient id="crystalGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <filter id="glow1">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M50,0 L70,40 L50,60 L30,40 Z M50,60 L65,90 L50,120 L35,90 Z"
            fill="url(#crystalGradient1)"
            opacity="0.8"
            filter="url(#glow1)"
            className="animate-pulse"
          />
        </svg>
      </div>

      <div className="absolute bottom-36 right-[25%] w-16 h-20 opacity-35 hidden lg:block">
        <svg viewBox="0 0 100 120" className="w-full h-full">
          <defs>
            <linearGradient id="crystalGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <filter id="glow2">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M50,0 L65,35 L50,50 L35,35 Z M50,50 L60,75 L50,100 L40,75 Z"
            fill="url(#crystalGradient2)"
            opacity="0.7"
            filter="url(#glow2)"
            className="animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </svg>
      </div>

      <div className="absolute bottom-16 left-[35%] w-14 h-18 opacity-30 hidden sm:block">
        <svg viewBox="0 0 100 120" className="w-full h-full">
          <defs>
            <filter id="glow3">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M50,0 L62,30 L50,45 L38,30 Z M50,45 L58,65 L50,85 L42,65 Z"
            fill="#60a5fa"
            opacity="0.6"
            filter="url(#glow3)"
            className="animate-pulse"
            style={{ animationDelay: "2s" }}
          />
        </svg>
      </div>

      <div className="absolute bottom-28 right-[15%] w-18 h-22 opacity-35 hidden md:block">
        <svg viewBox="0 0 100 120" className="w-full h-full">
          <defs>
            <linearGradient id="crystalGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <filter id="glow4">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M50,0 L68,38 L50,58 L32,38 Z M50,58 L64,88 L50,110 L36,88 Z"
            fill="url(#crystalGradient3)"
            opacity="0.75"
            filter="url(#glow4)"
            className="animate-pulse"
            style={{ animationDelay: "0.5s" }}
          />
        </svg>
      </div>
    </div>
  );
}

