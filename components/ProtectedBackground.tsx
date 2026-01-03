"use client";

interface ProtectedBackgroundProps {
  backgroundImage: string;
  opacity?: number;
  zIndex?: number;
  className?: string;
}

export default function ProtectedBackground({
  backgroundImage,
  opacity = 0.6,
  zIndex = 1,
  className = "",
}: ProtectedBackgroundProps) {
  return (
    <div
      className={`absolute inset-0 protected-bg pointer-events-none ${className}`}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex,
        opacity,
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    />
  );
}

