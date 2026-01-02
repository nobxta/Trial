"use client";

export default function TrustSection() {
  const advantages = [
    {
      title: "Save time",
      description: "Maximum exchange speed due to the full automation",
      class: "adv-fast",
    },
    {
      title: "Make an exchange",
      description: "Pick the right strategy and make favourable trades",
      class: "adv-easy",
    },
    {
      title: "Save money",
      description: "Best exchange rates and minimum commissions",
      class: "adv-profitable",
    },
  ];

  return (
    <div className="advantages-inner grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
      {advantages.map((adv, index) => (
        <div key={index} className={`col ${adv.class} text-center`}>
          <div className="advantages-image wimg mb-6 flex justify-center">
            <div className="w-32 h-32 bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-full flex items-center justify-center">
              <svg className="w-20 h-20 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
          <div className="advantages-descr">
            <h3 className="hl text-xl md:text-2xl font-semibold text-red-400 mb-3">
              {adv.title}
            </h3>
            <p className="text-slate-300 text-sm md:text-base">
              {adv.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}


