// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeroSearchBar } from '@/features/search/components/hero-search-bar';
import { useSearchUIStore } from '@/features/search/stores/search-ui-store';

const { pushMock, trackFunnelEventMock, useAutocompleteMock, useReducedMotionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  trackFunnelEventMock: vi.fn(),
  useAutocompleteMock: vi.fn(),
  useReducedMotionMock: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

vi.mock('@/shared/lib/analytics', () => ({
  trackFunnelEvent: trackFunnelEventMock
}));

vi.mock('@/features/search/hooks/use-autocomplete', () => ({
  useAutocomplete: (...args: unknown[]) => useAutocompleteMock(...args)
}));

vi.mock('framer-motion', async () => {
  const ReactModule = await import('react');

  return {
    motion: {
      div: ReactModule.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function MockMotionDiv(
        props,
        ref
      ) {
        const { animate: _animate, exit: _exit, initial: _initial, transition: _transition, ...domProps } = props as
          React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
        return <div ref={ref} {...domProps} />;
      })
    },
    useReducedMotion: () => useReducedMotionMock()
  };
});

describe('HeroSearchBar interaction coverage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    trackFunnelEventMock.mockReset();
    useAutocompleteMock.mockReset();
    useReducedMotionMock.mockReset();

    useReducedMotionMock.mockReturnValue(false);
    useAutocompleteMock.mockImplementation((query: string) => ({
      data:
        query.trim().length > 2
          ? [
              { id: 'goa', name: 'Goa', type: 'city', source: 'inventory' },
              { id: 'goa-beach', name: 'Goa Beach', type: 'landmark', source: 'maps' }
            ]
          : [],
      isFetching: false
    }));

    useSearchUIStore.setState({
      activeMood: 'beach',
      language: 'en',
      currency: 'USD'
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('executes keyboard autocomplete navigation and submits the selected destination', async () => {
    const user = userEvent.setup();

    render(<HeroSearchBar />);

    const destinationInput = screen.getByRole('combobox', { name: 'Destination' });

    await user.type(destinationInput, 'goa');

    const suggestions = await screen.findByRole('listbox', { name: 'Destination suggestions' });
    const options = within(suggestions).getAllByRole('option');

    expect(options).toHaveLength(2);

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect((destinationInput as HTMLInputElement).value).toBe('Goa Beach');
    await waitFor(() => {
      expect(screen.queryByRole('listbox', { name: 'Destination suggestions' })).toBeNull();
    });

    await user.keyboard('{Enter}');

    expect(pushMock).toHaveBeenCalledTimes(1);

    const [navigationTarget] = pushMock.mock.calls[0];
    expect(navigationTarget).toContain('/search?');
    expect(navigationTarget).toContain('q=Goa+Beach');
    expect(navigationTarget).toContain('vibe=beach');
    expect(navigationTarget).toContain('language=en');
    expect(navigationTarget).toContain('currency=USD');
  });

  it('keeps the rendered shell readable and interactive when reduced motion is enabled', async () => {
    const user = userEvent.setup();
    useReducedMotionMock.mockReturnValue(true);

    const { container } = render(<HeroSearchBar />);

    const shell = container.querySelector('[data-shell-variant="default"]');
    expect(shell?.getAttribute('data-motion-mode')).toBe('reduced');

    const destinationInput = screen.getByRole('combobox', { name: 'Destination' });
    await user.type(destinationInput, 'goa');

    const panel = await screen.findByTestId('destination-suggestions-panel');
    expect(panel.getAttribute('data-motion-mode')).toBe('reduced');

    const searchButton = screen.getByRole('button', { name: 'Search stays' });
    expect(searchButton.hasAttribute('disabled')).toBe(false);
  });

  it('keeps date and guest popovers usable alongside suggestion interactions', async () => {
    const user = userEvent.setup();

    render(<HeroSearchBar />);

    const destinationInput = screen.getByRole('combobox', { name: 'Destination' });
    await user.type(destinationInput, 'goa');
    await screen.findByRole('listbox', { name: 'Destination suggestions' });
    const suggestionsPanel = screen.getByTestId('destination-suggestions-panel');
    expect(suggestionsPanel.getAttribute('style')).toContain('z-index: 9999');

    await user.click(screen.getByRole('button', { name: 'Dates' }));

    const checkInInput = await screen.findByLabelText('Check-in');
    const checkOutInput = await screen.findByLabelText('Check-out');

    fireEvent.change(checkInInput, { target: { value: '2026-06-10' } });
    await waitFor(() => {
      expect((checkOutInput as HTMLInputElement).value).toBe('2026-06-11');
    });

    await user.click(screen.getByRole('button', { name: 'Guests and rooms' }));
    await user.click(await screen.findByRole('button', { name: 'Increase adults' }));
    await user.click(screen.getByRole('button', { name: 'Increase rooms' }));

    expect(screen.getByRole('button', { name: 'Guests and rooms' }).textContent).toContain('2 Room, 3 Guests');
  });
});
