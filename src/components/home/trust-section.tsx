'use client';

export function Stats() {
  const stats = [
    { value: '15+', label: 'Years Experience', icon: '🏆' },
    { value: '50K+', label: 'Happy Travelers', icon: '😊' },
    { value: '2,500+', label: 'Partner Hotels', icon: '🏨' },
    { value: '98%', label: 'Satisfaction Rate', icon: '⭐' },
  ];

  return (
    <section className="py-12 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div 
              key={stat.label}
              className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all hover:scale-105"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustedBy() {
  const partners = [
    'Hilton', 'Marriott', 'Hyatt', 'Carnival', 'Celebrity', 'Norwegian', 'Delta', 'American Airlines'
  ];

  return (
    <section className="py-10 bg-slate-50 border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-center text-sm text-slate-500 mb-6 font-medium">Trusted by leading travel brands</p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {partners.map((partner) => (
            <div 
              key={partner}
              className="text-xl md:text-2xl font-bold text-slate-300 hover:text-slate-500 transition-colors cursor-default"
            >
              {partner}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
