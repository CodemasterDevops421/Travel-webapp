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
    expect(headerSource).toContain("const isCheckoutPage = pathname.startsWith('/booking');");
    expect(headerSource).toContain('if (isCheckoutPage) {');
    expect(headerSource).toContain('return null;');
  });

  it('keeps the compact hero search inline in the desktop header on non-home routes', () => {
    expect(headerSource).toContain("const showInlineDesktopSearch = !isHomePage;");
    expect(headerSource).toContain('{showInlineDesktopSearch && (');
    expect(headerSource).toContain('className="hidden min-w-0 flex-1 md:block"');
    expect(headerSource).not.toContain('border-t border-border/40 bg-background/85');
  });

  it('keeps the compact search shell anchored to stable inline controls', () => {
    expect(heroSearchSource).toContain("const isCompact = variant === 'compact';");
    expect(heroSearchSource).toContain('rounded-[18px] border border-border/80 bg-card');
    expect(heroSearchSource).toContain('md:rounded-full');
    expect(heroSearchSource).not.toContain('position: fixed');
    expect(heroSearchSource).not.toContain('layoutScroll');
  });
});
