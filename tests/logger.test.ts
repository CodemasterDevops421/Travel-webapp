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
});
