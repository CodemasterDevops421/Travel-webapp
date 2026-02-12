'use client';

import { useState } from 'react';
import { Calendar, Search, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAutocomplete } from '@/features/search/hooks/use-autocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const { data, isFetching } = useAutocomplete(query);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur"
    >
      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            aria-label="Search destination"
            placeholder="Where to? city, hotel, landmark"
            className="pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query.length > 2 && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-card p-2 shadow-xl">
              {isFetching ? (
                <p className="p-2 text-sm text-muted-foreground">Fetching destinations...</p>
              ) : (
                <ul className="space-y-1">
                  {(data ?? []).map((item) => (
                    <li key={item.id} className="rounded-lg px-2 py-1 text-sm hover:bg-muted">
                      {item.name} <span className="text-muted-foreground">· {item.source}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-border px-3">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">Dates</span>
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-border px-3">
          <Users className="h-4 w-4" />
          <span className="text-sm">2 adults · 1 room</span>
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="lg">Search stays</Button>
      </div>
    </motion.div>
  );
}
