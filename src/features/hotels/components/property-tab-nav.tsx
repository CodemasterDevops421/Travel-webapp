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
    <nav className="sticky top-16 z-20 -mx-4 border-b border-border/70 bg-background/95 backdrop-blur md:top-20 md:mx-0">
      <div className="relative">
        <div className="flex w-full gap-4 overflow-x-auto px-4 md:px-0 scrollbar-none">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'whitespace-nowrap border-b-2 py-3 text-sm font-semibold transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              {tab.label}
            </a>
          ))}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-background to-transparent md:hidden" />
      </div>
    </nav>
  );
}
