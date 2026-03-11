import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('homepage motion contract', () => {
  const pageSource = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8');
  const globalsSource = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

  it('defines homepage-safe reveal and hero motion utilities with reduced-motion fallbacks', () => {
    expect(globalsSource).toContain('@keyframes hero-word-cycle');
    expect(globalsSource).toContain('.hero-word');
    expect(globalsSource).toContain('.section-reveal');
    expect(globalsSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(globalsSource).toContain('.hero-orbit');
    expect(globalsSource).toContain('.hero-spotlight');
  });

  it('keeps the primary homepage proof strip within the shared reveal contract', () => {
    expect(pageSource).toContain('section-reveal mx-auto mt-16 max-w-6xl px-4 md:mt-20');
    expect(pageSource).toContain('data-reveal="home-module"');
  });

  it('keeps banned motion patterns out of the homepage hero shell', () => {
    expect(pageSource).not.toContain('onWheel=');
    expect(pageSource).not.toContain("addEventListener('wheel'");
    expect(pageSource).not.toContain('addEventListener(\"wheel\"');
    expect(pageSource).not.toContain("addEventListener('touchmove'");
    expect(pageSource).not.toContain('addEventListener(\"touchmove\"');
    expect(pageSource).not.toContain('overflow-x-scroll');
  });
});
