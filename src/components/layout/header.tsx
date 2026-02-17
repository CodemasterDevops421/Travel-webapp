'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Moon, Sun, UserCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { LanguageCurrencyChooser } from '@/components/home/language-currency-chooser';
import { Button } from '@/components/ui/button';
import { HeroSearchBar } from '@/features/search/components/hero-search-bar';

export function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-background/95 dark:supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <svg width="100" height="32" viewBox="0 0 100 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.5 8H2.5L10.5 24H0.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M28.5 8H18.5L26.5 24H16.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M44.5 8H34.5L42.5 24H32.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <text x="50" y="24" fontFamily="Roboto Slab" fontSize="20" fill="currentColor" fontWeight="bold">
              ello
            </text>
          </svg>
        </Link>

        {!isHomePage && (
          <div className="hidden flex-1 px-8 md:block lg:max-w-2xl">
            <HeroSearchBar variant="compact" className="shadow-none border border-border/50" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <LanguageCurrencyChooser />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" className="gap-2 text-muted-foreground">
            <UserCircle className="h-5 w-5" />
            <span className="hidden sm:inline-block">Melam Cha...</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
