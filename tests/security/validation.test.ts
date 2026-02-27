import { describe, expect, it } from 'vitest';
import { sanitizeUnknown, stripSupplierSecrets } from '@/server/request';

describe('payload sanitization and redaction', () => {
  it('sanitizes nested user-controlled strings', () => {
    const sanitized = sanitizeUnknown({
      holder: {
        firstName: ' <b>Alice</b> ',
        lastName: ' \u0000Jones '
      },
      guests: [{ firstName: '<img>', lastName: 'User' }],
      notes: ['ok', '<script>alert(1)</script>']
    });

    expect(sanitized).toEqual({
      holder: {
        firstName: 'bAlice/b',
        lastName: 'Jones'
      },
      guests: [{ firstName: 'img', lastName: 'User' }],
      notes: ['ok', 'scriptalert(1)/script']
    });
  });

  it('strips supplier secret fields recursively', () => {
    const redacted = stripSupplierSecrets({
      bookingId: 'b-1',
      supplierApiKey: 'secret',
      details: {
        supplier_secret: 'secret',
        nested: [{ label: 'safe', apiKey: 'drop-me' }]
      }
    });

    expect(redacted).toEqual({
      bookingId: 'b-1',
      details: {
        nested: [{ label: 'safe' }]
      }
    });
  });
});
