'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Globe, Heart, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroSearchBar } from '@/features/search/components/hero-search-bar';

export function Header() {
    const pathname = usePathname();
    const isHomePage = pathname === '/';

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <svg width="100" height="32" viewBox="0 0 100 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.5 8H2.5L10.5 24H0.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M28.5 8H18.5L26.5 24H16.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M44.5 8H34.5L42.5 24H32.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        <text x="50" y="24" fontFamily="Roboto Slab" fontSize="20" fill="currentColor" fontWeight="bold">ello</text>
                    </svg>
                </Link>

                {/* Search Bar - Hidden on mobile and Home page */}
                {!isHomePage && (
                    <div className="hidden flex-1 px-8 md:block lg:max-w-2xl">
                        <HeroSearchBar variant="compact" className="shadow-none border border-border/50" />
                    </div>
                )}

                {/* Right Nav */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <Globe className="h-5 w-5" />
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
