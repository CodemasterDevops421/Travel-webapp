'use client';

import { Moon, Sun } from 'lucide-react';
import { LanguageCurrencyChooser } from '@/components/home/language-currency-chooser';
import { PreferenceLink } from '@/components/navigation/preference-link';

export function GlobalTopBar() {
  return (
    <header className="sticky top-4 z-30 mx-auto mt-4 max-w-6xl glass-panel px-5 py-3 transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <PreferenceLink href="/" className="text-sm font-semibold tracking-[0.16em]">
            HOSTEL STAYS
          </PreferenceLink>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            <PreferenceLink href="/" className="text-muted-foreground transition-colors hover:text-foreground">
              Search
            </PreferenceLink>
            <PreferenceLink href="/booking" className="text-muted-foreground transition-colors hover:text-foreground">
              Checkout
            </PreferenceLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <LanguageCurrencyChooser />
          <div className="rounded-full border border-border/70 bg-card/80 p-2" aria-label="Theme icons">
            <Sun className="h-5 w-5 dark:hidden" />
            <Moon className="hidden h-5 w-5 dark:block" />
          </div>
        </div>
      </div>
    </header>
  );
}
