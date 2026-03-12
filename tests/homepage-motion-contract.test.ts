import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('homepage motion contract', () => {
  const pageSource = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8');
  const globalsSource = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
  const heroSearchBarSource = readFileSync(
    resolve(process.cwd(), 'src/features/search/components/hero-search-bar.tsx'),
    'utf8'
  );
  const heroSearchInteractionSource = readFileSync(
    resolve(process.cwd(), 'tests/hero-search-bar-interactions.test.tsx'),
    'utf8'
  );
  const featuredDealsSource = readFileSync(
    resolve(process.cwd(), 'src/components/home/featured-deals-strip.tsx'),
    'utf8'
  );
  const trendingDestinationsSource = readFileSync(
    resolve(process.cwd(), 'src/components/home/trending-destinations.tsx'),
    'utf8'
  );
  const moodDiscoverySource = readFileSync(resolve(process.cwd(), 'src/components/home/mood-discovery.tsx'), 'utf8');
  const travelArticlesSource = readFileSync(resolve(process.cwd(), 'src/components/home/travel-articles.tsx'), 'utf8');
  const newsletterBandSource = readFileSync(resolve(process.cwd(), 'src/components/home/newsletter-band.tsx'), 'utf8');

  it('defines homepage-safe reveal and hero motion utilities with reduced-motion fallbacks', () => {
    expect(globalsSource).toContain('@keyframes hero-accent-breathe');
    expect(globalsSource).toContain('.hero-accent-emphasis');
    expect(globalsSource).toContain('.section-reveal');
    expect(globalsSource).toContain('.ui-label');
    expect(globalsSource).toContain('.numeric-tight');
    expect(globalsSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(globalsSource).not.toContain('.hero-word');
  });

  it('applies the shared reveal marker across homepage modules', () => {
    const moduleSources = [
      pageSource,
      featuredDealsSource,
      trendingDestinationsSource,
      moodDiscoverySource,
      travelArticlesSource,
      newsletterBandSource
    ];

    for (const source of moduleSources) {
      expect(source).toContain('section-reveal');
      expect(source).toContain('data-reveal="home-module"');
    }
  });

  it('keeps homepage imagery on optimized local rendering paths', () => {
    expect(pageSource).toContain('src="/images/hero-bg.png"');
    expect(pageSource).not.toContain('images.unsplash.com/photo-1506744038136-46273834b3fb');
    expect(trendingDestinationsSource).toContain("import Image from 'next/image';");
    expect(trendingDestinationsSource).toContain("image: '/images/trending-dubai.png'");
    expect(trendingDestinationsSource).toContain("image: '/images/trending-bali.jpg'");
    expect(trendingDestinationsSource).toContain("image: '/images/trending-zurich.png'");
    expect(trendingDestinationsSource).toContain("image: '/images/trending-kyoto.jpg'");
    expect(trendingDestinationsSource).not.toContain('images.unsplash.com/');
    expect(trendingDestinationsSource).not.toContain('backgroundImage:');
  });

  it('keeps banned motion patterns out of the homepage shell and modules', () => {
    const auditedSources = [
      pageSource,
      featuredDealsSource,
      trendingDestinationsSource,
      moodDiscoverySource,
      travelArticlesSource,
      newsletterBandSource
    ];

    for (const source of auditedSources) {
      expect(source).not.toContain('onWheel=');
      expect(source).not.toContain("addEventListener('wheel'");
      expect(source).not.toContain('addEventListener(\"wheel\"');
      expect(source).not.toContain("addEventListener('touchmove'");
      expect(source).not.toContain('addEventListener(\"touchmove\"');
      expect(source).not.toContain('overflow-x-scroll');
    }
  });

  it('anchors search-shell motion safety to executable interaction coverage', () => {
    expect(heroSearchBarSource).toContain('ui-label');
    expect(heroSearchBarSource).toContain('numeric-tight');
    expect(heroSearchInteractionSource).toContain("describe('HeroSearchBar interaction coverage'");
    expect(heroSearchInteractionSource).toContain("{ArrowDown}{ArrowDown}{Enter}");
    expect(heroSearchInteractionSource).toContain("useReducedMotionMock.mockReturnValue(true)");
    expect(heroSearchInteractionSource).toContain("getByRole('button', { name: 'Dates' })");
    expect(heroSearchInteractionSource).toContain("getByRole('button', { name: 'Guests and rooms' })");
  });
});
