import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('booking guest route contract', () => {
  const middlewareSource = readFileSync(resolve(process.cwd(), 'src/middleware.ts'), 'utf8');

  it('does not protect the booking review route behind signup middleware', () => {
    expect(middlewareSource).toContain("const protectedPaths = ['/wishlist', '/admin'];");
    expect(middlewareSource).not.toContain("const protectedPaths = ['/booking', '/wishlist', '/admin'];");
  });
});
