'use client';

import { useSearchUIStore } from '@/features/search/stores/search-ui-store';

const moods = ['Romantic', 'Quiet', 'Near nightlife', 'Family-friendly', 'Boutique', 'Scenic'];

export function MoodDiscovery() {
  const activeMood = useSearchUIStore((state) => state.activeMood);
  const setActiveMood = useSearchUIStore((state) => state.setActiveMood);

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-card/70 p-5">
      <h2 className="text-2xl font-semibold">Discover by mood</h2>
      <div className="flex flex-wrap gap-2">
        {moods.map((mood) => (
          <button
            type="button"
            key={mood}
            aria-pressed={activeMood === mood}
            onClick={() => setActiveMood(activeMood === mood ? null : mood)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm transition ${
              activeMood === mood
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-background hover:bg-muted'
            }`}
          >
            {mood}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Use mood tags to narrow to properties with the right vibe before comparing price and cancellation flexibility.
      </p>
    </section>
  );
}
