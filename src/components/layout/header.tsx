'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { Heart, Moon, Sun, UserCircle, LogOut, Menu, X, Bookmark, LayoutDashboard, Compass, ShieldCheck } from 'lucide-react';
import { useTheme } from 'next-themes';
import { LanguageCurrencyChooser } from '@/components/home/language-currency-chooser';
import { Button } from '@/components/ui/button';
import { HeroSearchBar } from '@/features/search/components/hero-search-bar';
import { useAuth } from '@/shared/hooks/use-auth';

export function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const isBookingFlow = pathname.startsWith('/booking');
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, isLoading, signOut } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  if (isBookingFlow) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/88 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-20">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/15 bg-accent/10 text-accent shadow-sm">
            <Compass className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-xl font-extrabold tracking-[-0.04em] text-foreground transition-colors group-hover:text-accent md:text-2xl">
              Hostel Stays
            </span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground md:block">
              Curated travel rates
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <nav className="mr-4 flex items-center gap-2 rounded-full border border-border/80 bg-card p-1 shadow-sm">
            <Link href="/" className="rounded-full px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
              Explore
            </Link>
            <Link href={'/search?query=trending' as Route} className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              Destinations
            </Link>
          </nav>

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

          {user && (
            <Link href={'/wishlist' as Route}>
              <Button variant="ghost" size="icon" className="text-muted-foreground" title="Wishlist">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
          )}

          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <Button
                variant="outline"
                className="gap-2 border-border/80 bg-card text-foreground shadow-sm"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <UserCircle className="h-5 w-5" />
                <span className="hidden max-w-[120px] truncate sm:inline-block">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account'}
                </span>
              </Button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-64 rounded-[24px] border border-border/80 bg-card p-2 shadow-premium-lg">
                  <div className="mb-2 rounded-[18px] border border-border/60 bg-secondary/55 px-4 py-3">
                    <p className="text-sm font-medium truncate">{user.user_metadata?.full_name || 'Traveler'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Link
                    href={'/wishlist' as Route}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Bookmark className="h-4 w-4" />
                    My Wishlist
                  </Link>
                  <Link
                    href={'/admin' as Route}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login">
              <Button variant="default" size="sm" className="gap-2">
                <UserCircle className="h-4 w-4" />
                Sign in
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {!isHomePage && (
        <div className="hidden border-t border-border/50 bg-background/92 px-4 py-4 md:block">
          <div className="mx-auto max-w-7xl">
            <div className="surface-panel mx-auto max-w-5xl overflow-visible rounded-full px-2 py-2">
              <HeroSearchBar variant="compact" className="mx-auto max-w-5xl border-none bg-transparent shadow-none" />
            </div>
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div className="border-t border-border/50 bg-background/96 backdrop-blur-sm md:hidden">
          <nav className="mx-auto max-w-7xl space-y-3 p-4">
            <div className="surface-subtle rounded-[24px] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Book with confidence</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Verified rates, transparent totals, and secure checkout across every stay.
                  </p>
                </div>
              </div>
            </div>

            {!isHomePage && (
              <div className="surface-panel rounded-[24px] p-2">
                <HeroSearchBar variant="compact" className="shadow-none border-none bg-transparent" />
              </div>
            )}

            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-2xl px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Home
            </Link>
            <Link
              href="/search?query=trending"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-2xl px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Explore
            </Link>

            {user ? (
              <>
                <Link
                  href={'/wishlist' as Route}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <Heart className="h-4 w-4" /> Wishlist
                </Link>
                <Link
                  href={'/admin' as Route}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <div className="surface-subtle rounded-[24px] p-4">
                  <div className="px-1 pb-3">
                    <p className="text-sm font-medium">{user.user_metadata?.full_name || 'Traveler'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="surface-subtle rounded-[24px] p-4">
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full gap-2">
                    <UserCircle className="h-4 w-4" />
                    Sign in
                  </Button>
                </Link>
              </div>
            )}

            <div className="surface-subtle rounded-[24px] p-4">
              <LanguageCurrencyChooser />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
