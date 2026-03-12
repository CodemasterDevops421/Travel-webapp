import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('homepage hero parity regression coverage', () => {
  const pageSource = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8');
  const heroSearchSource = readFileSync(
    resolve(process.cwd(), 'src/features/search/components/hero-search-bar.tsx'),
    'utf8'
  );

  it('keeps a calmer hero overlay and an explicit safe-motion marker on the homepage shell', () => {
    expect(pageSource).toContain('data-home-motion="safe"');
    expect(pageSource).toContain('rgba(11,37,69,0.28)');
    expect(pageSource).toContain("bg-gradient-to-t from-[#0B2545] via-[#0B2545]/55 to-transparent");
  });

  it('uses one bounded hero accent seam and removes the desktop editorial side panel', () => {
    expect(pageSource).toContain('hero-accent-emphasis inline-block');
    expect(pageSource).not.toContain('hero-word hero-word-delay-2');
    expect(pageSource).not.toContain('hero-word hero-word-delay-3');
    expect(pageSource).not.toContain('This week’s focus');
  });

  it('renders the default homepage search shell as a solid high-contrast surface', () => {
    expect(heroSearchSource).toContain("rounded-[24px] border border-white/85 bg-white");
    expect(heroSearchSource).toContain('Where');
    expect(heroSearchSource).toContain('Dates');
    expect(heroSearchSource).toContain('Guests');
    expect(heroSearchSource).toContain('function formatSearchDate(value: string): string');
    expect(heroSearchSource).toContain('formatSearchDate(checkIn)');
    expect(heroSearchSource).toContain('formatSearchDate(checkOut)');
    expect(pageSource).toContain('<HeroSearchBar className="border-none bg-transparent shadow-none" />');
  });

  it('keeps the homepage discovery shell free of scroll-jacking hooks', () => {
    expect(pageSource).not.toContain('onWheel=');
    expect(pageSource).not.toContain("addEventListener('wheel'");
    expect(pageSource).not.toContain('addEventListener(\"wheel\"');
    expect(pageSource).not.toContain("addEventListener('touchmove'");
    expect(pageSource).not.toContain('addEventListener(\"touchmove\"');
    expect(heroSearchSource).not.toContain('onWheel=');
    expect(heroSearchSource).not.toContain("addEventListener('wheel'");
    expect(heroSearchSource).not.toContain('addEventListener(\"wheel\"');
    expect(heroSearchSource).not.toContain("addEventListener('touchmove'");
    expect(heroSearchSource).not.toContain('addEventListener(\"touchmove\"');
  });
});
