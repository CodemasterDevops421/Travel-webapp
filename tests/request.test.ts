import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { getClientIp, getCorrelationId, sanitizeRecord } from '@/server/request';

describe('request helpers', () => {
  it('uses platform-provided IP headers by default and ignores forwarded chain', () => {
    const edgeReq = new NextRequest('https://example.com/api/test', {
      headers: {
        'x-vercel-ip': '8.8.8.8',
        'x-forwarded-for': '1.2.3.4, 5.6.7.8'
      }
    });
    expect(getClientIp(edgeReq)).toBe('8.8.8.8');

    const forwardedReq = new NextRequest('https://example.com/api/test', {
      headers: {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8'
      }
    });
    expect(getClientIp(forwardedReq)).toBe('anonymous');

    const cloudflareReq = new NextRequest('https://example.com/api/test', {
      headers: {
        'cf-connecting-ip': '9.9.9.9',
        'x-forwarded-for': '1.2.3.4, 5.6.7.8'
      }
    });
    expect(getClientIp(cloudflareReq)).toBe('9.9.9.9');
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

  it('sanitizes unsafe string fields in request records', () => {
    const payload = sanitizeRecord({
      code: '  <SCRIPT>alert(1)</SCRIPT>  ',
      notes: ['ok', '<b>unsafe</b>'],
      count: 2
    });

    expect(payload.code).toBe('SCRIPTalert(1)/SCRIPT');
    expect(payload.notes).toEqual(['ok', 'bunsafe/b']);
    expect(payload.count).toBe(2);
  });
});
