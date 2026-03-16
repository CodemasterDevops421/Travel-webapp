// @vitest-environment jsdom

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeaturedDealsStrip } from '@/components/home/featured-deals-strip';
import { useSearchUIStore } from '@/features/search/stores/search-ui-store';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(function MockNextLink(
    { href, ...props },
    ref
  ) {
    return <a ref={ref} href={typeof href === 'string' ? href : String(href)} {...props} />;
  })
}));

describe('homepage featured card link behavior', () => {
  beforeEach(() => {
    useSearchUIStore.setState({
      activeMood: null,
      language: 'fr',
      currency: 'EUR'
    });
  });

  afterEach(() => {
    cleanup();
    useSearchUIStore.setState({
      activeMood: null,
      language: 'en',
      currency: 'USD'
    });
  });

  it('renders featured deal cards as keyboard-focusable links that keep stored preferences', async () => {
    const user = userEvent.setup();

    render(<FeaturedDealsStrip />);

    const sectionLink = screen.getByRole('link', { name: /view all deals/i });
    const featuredCardLink = screen.getByRole('link', { name: /suite escape santorini cliffside views/i });

    expect(featuredCardLink).toHaveAttribute('href', '/search?q=Santorini&language=fr&currency=EUR');

    await user.tab();
    expect(sectionLink).toHaveFocus();

    await user.tab();
    expect(featuredCardLink).toHaveFocus();
  });
});
