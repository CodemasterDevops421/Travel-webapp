'use client';

import { cn } from '@/shared/lib/utils';

type PropertyTabNavTab = {
  id: string;
  label: string;
};

type PropertyTabNavProps = {
  activeTab: string;
  tabs: PropertyTabNavTab[];
  onTabChange: (tabId: string) => void;
};

export function PropertyTabNav({ activeTab, tabs, onTabChange }: PropertyTabNavProps) {
  return (
    <nav className="sticky top-[var(--header-offset)] z-20 rounded-full border border-border/70 bg-background/92 px-2 backdrop-blur">
      <div className="relative">
        <div className="flex w-full gap-2 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'whitespace-nowrap rounded-full px-4 py-3 text-sm font-semibold transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              {tab.label}
            </a>
          ))}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-12 rounded-r-full bg-gradient-to-l from-background/90 to-transparent md:hidden" />
      </div>
    </nav>
  );
}
