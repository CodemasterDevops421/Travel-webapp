'use client';

import { Gem, Heart, Music2, Trees, Users, Waves } from 'lucide-react';
import { useSearchUIStore } from '@/features/search/stores/search-ui-store';

const moods = [
  { label: 'Romantic', icon: Heart },
  { label: 'Quiet', icon: Waves },
  { label: 'Near nightlife', icon: Music2 },
  { label: 'Family-friendly', icon: Users },
  { label: 'Boutique', icon: Gem },
  { label: 'Scenic', icon: Trees }
];

export function MoodDiscovery() {
  const activeMood = useSearchUIStore((state) => state.activeMood);
  const setActiveMood = useSearchUIStore((state) => state.setActiveMood);

  return (
    <section className="space-y-5 rounded-3xl border border-border/60 bg-gradient-to-br from-primary/[0.04] to-transparent p-6 md:p-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Personalize</p>
        <h2 className="mt-1 text-3xl font-heading font-bold tracking-tight">Discover by mood</h2>
      </div>
      <div className="flex flex-wrap gap-3">
        {moods.map((mood) => (
          <button
            type="button"
            key={mood.label}
            aria-pressed={activeMood === mood.label}
            onClick={() => setActiveMood(activeMood === mood.label ? null : mood.label)}
            className={`cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${activeMood === mood.label
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                : 'border border-border/60 bg-card hover:bg-primary/5 hover:border-primary/30'
              }`}
          >
            <mood.icon className="mr-1.5 inline-block h-4 w-4 align-[-2px]" />
            {mood.label}
          </button>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Use mood tags to narrow to properties with the right vibe before comparing price and cancellation flexibility.
      </p>
    </section>
  );
}
