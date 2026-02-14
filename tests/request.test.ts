import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { getClientIp, getCorrelationId } from '@/server/request';

describe('request helpers', () => {
  it('extracts first forwarded IP and prefers x-real-ip', () => {
    const forwardedReq = new NextRequest('https://example.com/api/test', {
      headers: {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8'
      }
    });
    expect(getClientIp(forwardedReq)).toBe('1.2.3.4');

    const realReq = new NextRequest('https://example.com/api/test', {
      headers: {
        'x-real-ip': '9.9.9.9',
        'x-forwarded-for': '1.2.3.4'
      }
    });
    expect(getClientIp(realReq)).toBe('9.9.9.9');
  });

  it('uses request correlation id headers or generates one', () => {
    const requestWithId = new NextRequest('https://example.com/api/test', {
      headers: {
        'x-request-id': 'rid-123'
      }
    });
    expect(getCorrelationId(requestWithId)).toBe('rid-123');

    const requestWithoutId = new NextRequest('https://example.com/api/test');
    expect(getCorrelationId(requestWithoutId).length).toBeGreaterThan(10);
  });
});
