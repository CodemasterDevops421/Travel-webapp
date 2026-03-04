import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('structured logger taxonomy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('emits namespaced structured event with normalized correlation id', async () => {
    const info = vi.fn();
    const warn = vi.fn();

    vi.doMock('pino', () => ({
      default: vi.fn(() => ({ info, warn, error: vi.fn(), debug: vi.fn(), child: vi.fn() }))
    }));

    const { logStructuredEvent } = await import('@/server/logger');
    logStructuredEvent('info', 'booking.prebook.received', {
      correlationId: 'cid-1',
      route: 'booking-prebook'
    });

    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'booking.prebook.received',
        correlation_id: 'cid-1',
        route: 'booking-prebook'
      }),
      'booking.prebook.received'
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('rejects non-namespaced events and logs warning', async () => {
    const info = vi.fn();
    const warn = vi.fn();

    vi.doMock('pino', () => ({
      default: vi.fn(() => ({ info, warn, error: vi.fn(), debug: vi.fn(), child: vi.fn() }))
    }));

    const { logStructuredEvent } = await import('@/server/logger');
    logStructuredEvent('info', 'random.event', { module: 'booking-route' });

    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'observability.invalid_event_name',
        provided_event: 'random.event',
        module: 'booking-route'
      }),
      expect.stringMatching(/Invalid structured event name/i)
    );
  });

  it('exports STRUCTURED_EVENT_PREFIXES for external assertions', async () => {
    vi.doMock('pino', () => ({
      default: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() }))
    }));

    const { STRUCTURED_EVENT_PREFIXES } = await import('@/server/logger');
    expect(Array.isArray(STRUCTURED_EVENT_PREFIXES)).toBe(true);
    expect(STRUCTURED_EVENT_PREFIXES).toContain('booking.');
    expect(STRUCTURED_EVENT_PREFIXES).toContain('webhook.');
    expect(STRUCTURED_EVENT_PREFIXES).toContain('supplier.');
    expect(STRUCTURED_EVENT_PREFIXES).toContain('persistence.');
  });

  it('accepts persistence.* prefixed events', async () => {
    const info = vi.fn();
    const warn = vi.fn();

    vi.doMock('pino', () => ({
      default: vi.fn(() => ({ info, warn, error: vi.fn(), debug: vi.fn(), child: vi.fn() }))
    }));

    const { logStructuredEvent } = await import('@/server/logger');
    logStructuredEvent('info', 'persistence.quote.degraded', {
      route: 'booking-prebook',
      module: 'booking.prebook'
    });

    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'persistence.quote.degraded',
        route: 'booking-prebook'
      }),
      'persistence.quote.degraded'
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('defaults module to unknown when neither route nor module is provided', async () => {
    const info = vi.fn();

    vi.doMock('pino', () => ({
      default: vi.fn(() => ({ info, warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() }))
    }));

    const { logStructuredEvent } = await import('@/server/logger');
    logStructuredEvent('info', 'booking.test.event', {});

    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'booking.test.event',
        module: 'unknown'
      }),
      'booking.test.event'
    );
  });

  it('uses custom message when provided', async () => {
    const info = vi.fn();

    vi.doMock('pino', () => ({
      default: vi.fn(() => ({ info, warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() }))
    }));

    const { logStructuredEvent } = await import('@/server/logger');
    logStructuredEvent('info', 'booking.prebook.received', { route: 'booking-prebook' }, 'Custom message');

    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'booking.prebook.received' }),
      'Custom message'
    );
  });
});
