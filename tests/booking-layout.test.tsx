import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('booking layout chrome suppression', () => {
  const headerSource = readFileSync(resolve(process.cwd(), 'src/components/layout/header.tsx'), 'utf8');

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
});
