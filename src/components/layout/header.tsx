'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { Heart, Moon, Sun, UserCircle, LogOut, Menu, X, Bookmark, LayoutDashboard } from 'lucide-react';
import { useTheme } from 'next-themes';
import { LanguageCurrencyChooser } from '@/components/home/language-currency-chooser';
import { Button } from '@/components/ui/button';
import { HeroSearchBar } from '@/features/search/components/hero-search-bar';
import { useAuth } from '@/shared/hooks/use-auth';

export function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
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
  const headerClassName = isHomePage
    ? 'sticky top-0 z-50 w-full border-b border-border/70 bg-background/88 backdrop-blur-2xl transition-all duration-300'
    : 'sticky top-0 z-50 w-full border-b border-border/80 bg-background shadow-[0_10px_28px_-26px_rgba(15,23,42,0.42)] transition-all duration-300';

  return (
    <header className={headerClassName}>
      <div className="page-shell flex h-[var(--header-height)] items-center gap-3 md:gap-5">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2 premium-hover group">
          <span className="display-heading text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary md:text-2xl">
            Hostel Stays
          </span>
        </Link>

        {!isHomePage && (
          <div className="hidden min-w-0 flex-1 md:block">
            <HeroSearchBar
              variant="compact"
              className="mx-auto max-w-3xl"
            />
          </div>
        )}

        {/* Desktop Actions */}
        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
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

          {/* Auth section */}
          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                className="gap-2 text-muted-foreground"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <UserCircle className="h-5 w-5" />
                <span className="hidden max-w-[120px] truncate sm:inline-block">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account'}
                </span>
              </Button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/60 bg-card p-1.5 shadow-lg backdrop-blur-sm">
                  <div className="px-3 py-2 border-b border-border/40 mb-1">
                    <p className="text-sm font-medium truncate">{user.user_metadata?.full_name || 'Traveler'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Link
                    href={'/wishlist' as Route}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Bookmark className="h-4 w-4" />
                    My Wishlist
                  </Link>
                  <Link
                    href={'/admin' as Route}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login">
              <Button variant="default" size="sm" className="gap-2 px-4">
                <UserCircle className="h-4 w-4" />
                Sign in
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile: hamburger menu */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border/60 bg-background/96 backdrop-blur-sm md:hidden">
          <nav className="page-shell space-y-1 py-4">
            {!isHomePage && (
              <div className="pb-3">
                <HeroSearchBar variant="compact" className="shadow-none border border-border/50" />
              </div>
            )}

            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              Home
            </Link>
            <Link
              href="/search?query=trending"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              Explore
            </Link>

            {user ? (
              <>
                <Link
                  href={'/wishlist' as Route}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                >
                  <Heart className="h-4 w-4" /> Wishlist
                </Link>
                <Link
                  href={'/admin' as Route}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <div className="border-t border-border/40 pt-2 mt-2">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.user_metadata?.full_name || 'Traveler'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="border-t border-border/40 pt-3 mt-2">
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full gap-2">
                    <UserCircle className="h-4 w-4" />
                    Sign in
                  </Button>
                </Link>
              </div>
            )}

            <div className="border-t border-border/40 pt-3 mt-2">
              <LanguageCurrencyChooser />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
