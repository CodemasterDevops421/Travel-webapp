'use client';

import { Moon, Sun } from 'lucide-react';
import { LanguageCurrencyChooser } from '@/components/home/language-currency-chooser';
import { PreferenceLink } from '@/components/navigation/preference-link';

export function GlobalTopBar() {
  return (
    <header className="sticky top-3 z-30 mx-auto mt-3 max-w-6xl rounded-2xl border border-border/70 bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <PreferenceLink href="/" className="text-sm font-semibold tracking-[0.16em]">
            TRAVELAPP
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
