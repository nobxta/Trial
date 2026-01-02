"use client";

import { Clock, ArrowLeftRight, DollarSign } from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  iconColor: string;
  accentColor: string;
}

function FeatureCard({ icon, title, description, gradient, iconColor, accentColor }: FeatureCardProps) {
  return (
    <div className="group h-full glass-panel hover:bg-white/[0.05] transition-all duration-300 border border-white/5 hover:border-white/10 rounded-xl p-4 sm:p-5 md:p-6">
      {/* Icon */}
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${gradient} flex items-center justify-center mb-3 sm:mb-4`}>
        <div className={iconColor}>
          {icon}
        </div>
      </div>
      
      <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export default function TrustedSection() {
  const features = [
    {
      icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Save Time",
      description: "Maximum exchange speed due to full automation. Process transactions in seconds, not hours.",
      gradient: "bg-gradient-to-br from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-400",
      accentColor: "bg-blue-400",
    },
    {
      icon: <ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Make an Exchange",
      description: "Pick the right strategy and make favourable trades. Support for 500+ cryptocurrency pairs.",
      gradient: "bg-gradient-to-br from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400",
      accentColor: "bg-purple-400",
    },
    {
      icon: <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Save Money",
      description: "Best exchange rates and minimum commissions. Transparent pricing with no hidden fees.",
      gradient: "bg-gradient-to-br from-green-500/20 to-emerald-500/20",
      iconColor: "text-green-400",
      accentColor: "bg-green-400",
    },
  ];

  return (
    <section className="w-full py-10 sm:py-12 md:py-16 relative overflow-hidden bg-[#050505]">
      {/* Protected Background Image with Fade In (Very Low Visibility - 2nd Image) */}
      <div 
        className="absolute inset-0 protected-bg animate-fade-in-bg animate-delay-500"
        style={{
          backgroundImage: 'url(/images/space-background-with-planet-landscape-and-stars-free-vector.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
          opacity: 0.1,
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
      <div className="absolute inset-0 bg-[#050505]/95 z-0"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Feature Cards Grid - First */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              gradient={feature.gradient}
              iconColor={feature.iconColor}
              accentColor={feature.accentColor}
            />
          ))}
        </div>

        {/* Trusted since 2018 - At Bottom, Large Text */}
        <div className="text-center mt-10 sm:mt-12 md:mt-16 pt-8 sm:pt-10 md:pt-12 border-t border-white/5">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium text-white">
            Trusted since 2018
          </h2>
        </div>
      </div>
    </section>
  );
}

