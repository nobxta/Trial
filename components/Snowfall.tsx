"use client";

import { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  drift: number;
  symbol: string;
}

const snowflakeSymbols = ["❄", "❅", "❆", "✻", "✼", "✽", "✾", "✿", "❀", "❁"];

export default function Snowfall() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    const flakes: Snowflake[] = [];
    for (let i = 0; i < 120; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 20,
        duration: 10 + Math.random() * 25,
        size: 0.4 + Math.random() * 1.2,
        opacity: 0.4 + Math.random() * 0.6,
        drift: -10 + Math.random() * 20,
        symbol: snowflakeSymbols[Math.floor(Math.random() * snowflakeSymbols.length)],
      });
    }
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake absolute top-0"
          style={{
            left: `${flake.left}%`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
            fontSize: `${flake.size}rem`,
            opacity: flake.opacity,
            transform: `translateX(${flake.drift}px)`,
          }}
        >
          {flake.symbol}
        </div>
      ))}
    </div>
  );
}

