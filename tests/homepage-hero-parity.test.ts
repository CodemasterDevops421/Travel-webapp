import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('homepage hero parity regression coverage', () => {
  const pageSource = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8');
  const heroSearchSource = readFileSync(
    resolve(process.cwd(), 'src/features/search/components/hero-search-bar.tsx'),
    'utf8'
  );

  it('keeps a lighter hero overlay so the homepage search remains visible', () => {
    expect(pageSource).toContain('rgba(17,12,40,0.08)');
    expect(pageSource).toContain('bg-gradient-to-t from-black/18 via-transparent to-white/8');
  });

  it('renders the default homepage search shell as a solid high-contrast surface', () => {
    expect(heroSearchSource).toContain("rounded-[24px] border border-white/85 bg-white");
    expect(heroSearchSource).toContain('Where');
    expect(heroSearchSource).toContain('Dates');
    expect(heroSearchSource).toContain('Guests');
  });
});
