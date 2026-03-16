import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('booking layout chrome suppression', () => {
  const headerSource = readFileSync(resolve(process.cwd(), 'src/components/layout/header.tsx'), 'utf8');
  const heroSearchSource = readFileSync(
    resolve(process.cwd(), 'src/features/search/components/hero-search-bar.tsx'),
    'utf8'
  );

  it('suppresses the global header for checkout routes', () => {
    expect(headerSource).toContain("const isCheckoutPage = pathname === '/booking' || pathname.startsWith('/booking/');");
    expect(headerSource).toContain('if (isCheckoutPage) {');
    expect(headerSource).toContain('return null;');
    expect(headerSource).not.toContain("const isCheckoutPage = pathname.startsWith('/booking');");
    expect(headerSource).not.toContain("pathname.startsWith('/bookings')");
  });

  it('keeps the compact hero search inline in the desktop header on non-home routes', () => {
    expect(headerSource).toContain("const showInlineDesktopSearch = !isHomePage;");
    expect(headerSource).toContain("const desktopActionsClassName = showInlineDesktopSearch");
    expect(headerSource).toContain("? 'hidden shrink-0 items-center gap-2 md:ml-auto md:flex xl:ml-0 xl:gap-3'");
    expect(headerSource).toContain(": 'hidden shrink-0 items-center gap-2 md:ml-auto md:flex';");
    expect(headerSource).toContain("const headerSurfaceClassName = isHomePage");
    expect(headerSource).toContain('{showInlineDesktopSearch && (');
    expect(headerSource).toContain('hidden min-w-0 flex-1 xl:flex xl:justify-center xl:pr-5 motion-safe:animate-in');
    expect(headerSource).toContain('min-w-0 w-full xl:max-w-[36rem] 2xl:max-w-[40rem]');
    expect(headerSource).toContain('<div className={desktopActionsClassName}>');
    expect(headerSource).toContain('transition-[background-color,border-color,box-shadow] duration-300');
    expect(headerSource).toContain('bg-white/88 dark:bg-slate-950/82');
    expect(headerSource).not.toContain('md:block md:max-w-[42rem] lg:max-w-[46rem]');
    expect(headerSource).not.toContain('border-t border-border/40 bg-background/85');
  });

  it('keeps the compact search shell anchored to stable inline controls', () => {
    expect(heroSearchSource).toContain("const isCompact = variant === 'compact';");
    expect(heroSearchSource).toContain('rounded-[18px] border border-border/80 bg-card');
    expect(heroSearchSource).toContain('md:min-w-[148px] md:flex-[0.58]');
    expect(heroSearchSource).toContain('truncate text-[9.5px] md:text-[10px]');
    expect(heroSearchSource).toContain('md:h-10 md:w-10');
    expect(heroSearchSource).toContain('md:rounded-full');
    expect(heroSearchSource).not.toContain('position: fixed');
    expect(heroSearchSource).not.toContain('layoutScroll');
  });
});
