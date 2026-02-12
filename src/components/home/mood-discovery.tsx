'use client';

import { useSearchUIStore } from '@/features/search/stores/search-ui-store';

const moods = ['Romantic', 'Quiet', 'Near nightlife', 'Family-friendly', 'Boutique', 'Scenic'];

export function MoodDiscovery() {
  const activeMood = useSearchUIStore((state) => state.activeMood);
  const setActiveMood = useSearchUIStore((state) => state.setActiveMood);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Discover by mood</h2>
      <div className="flex flex-wrap gap-2">
        {moods.map((mood) => (
          <button
            type="button"
            key={mood}
            onClick={() => setActiveMood(mood)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              activeMood === mood ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-border'
            }`}
          >
            {mood}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Semantic search is enabled only for vibe-style queries.</p>
    </section>
  );
}
