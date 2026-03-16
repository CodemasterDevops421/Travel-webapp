'use client';

import { Sparkles } from 'lucide-react';
import { useSearchUIStore } from '@/features/search/stores/search-ui-store';

const moods = [
  { label: 'Romantic' },
  { label: 'Quiet' },
  { label: 'Near nightlife' },
  { label: 'Family-friendly' },
  { label: 'Boutique' },
  { label: 'Scenic' }
];

export function MoodDiscovery() {
  const activeMood = useSearchUIStore((state) => state.activeMood);
  const setActiveMood = useSearchUIStore((state) => state.setActiveMood);

  return (
    <section
      className="section-reveal surface-panel space-y-5 overflow-hidden rounded-[32px] border-border/70 bg-gradient-to-br from-accent/[0.06] via-card to-card p-6 md:p-8"
      data-reveal="home-module"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Personalize</p>
          <h2 className="mt-1 text-3xl font-heading font-bold tracking-tight">Discover by mood</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/10 bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          Guided discovery
        </div>
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Use mood tags to narrow to properties with the right vibe before comparing price and cancellation flexibility.
      </p>
      <div className="flex flex-wrap gap-3">
        {moods.map((mood) => (
          <button
            type="button"
            key={mood.label}
            aria-pressed={activeMood === mood.label}
            onClick={() => setActiveMood(activeMood === mood.label ? null : mood.label)}
            className={`cursor-pointer rounded-full px-5 py-3 text-sm font-medium transition-all duration-200 ${
              activeMood === mood.label
                ? 'border border-accent/20 bg-accent text-accent-foreground shadow-premium-sm'
                : 'border border-border/70 bg-card text-foreground hover:border-accent/25 hover:bg-secondary/70'
            }`}
          >
            {mood.label}
          </button>
        ))}
      </div>
    </section>
  );
}
